# ==============================================================================
# Dockerfile Produksi untuk TryoutKu (Multi-Stage Build & Next.js Standalone)
# Dioptimalkan untuk efisiensi resource & storage VPS kecil
# ==============================================================================

# STAGE 1: Install Dependencies
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Nonaktifkan io_uring di libuv untuk mencegah error ETXTBSY (file busy) pada esbuild saat npm install di Docker
ENV UV_USE_IO_URING=0

# Salin manifest dependensi
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install dependensi (termasuk devDependencies untuk build & prisma)
RUN npm install

# STAGE 2: Build Aplikasi
FROM node:22-alpine AS builder
WORKDIR /app
ENV UV_USE_IO_URING=0
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Environment build-time untuk prisma generate & next build (akan ditimpa saat container jalan)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV DATABASE_URL="postgresql://tryoutku_admin:dummy@postgres:5432/tryoutku_prod?schema=public"
ENV AUTH_SECRET="dummy_build_time_auth_secret_minimal_32_chars"

RUN npx prisma generate
RUN npm run build

# STAGE 3: Production Runner (Ukuran Minimal & Aman)
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Buat grup dan pengguna non-root demi keamanan
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Salin output standalone dan aset statis hasil build
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Siapkan direktori uploads dengan kepemilikan dan hak akses write penuh untuk user nextjs
RUN mkdir -p public/uploads/questions && \
    chown -R nextjs:nodejs public && \
    chmod -R 777 public/uploads

# Salin folder prisma, scripts, konfigurasi, dan modul Prisma untuk migrasi database
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/dotenv ./node_modules/dotenv
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/.bin ./node_modules/.bin

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
