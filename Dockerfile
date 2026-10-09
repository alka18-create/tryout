# ==============================================================================
# Dockerfile Produksi untuk TryoutKu (Multi-Stage Build & Next.js Standalone)
# Dioptimalkan untuk efisiensi resource & storage VPS kecil
# ==============================================================================

# STAGE 1: Install Dependencies
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Salin manifest dependensi
COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install dependensi (termasuk devDependencies untuk build & prisma)
RUN npm ci

# STAGE 2: Build Aplikasi
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client untuk environment Linux
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

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

# Siapkan direktori public dan uploads dengan kepemilikan yang tepat
RUN mkdir -p public/uploads/questions && \
    chown -R nextjs:nodejs public

# Salin output standalone dan aset statis hasil build
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Salin folder prisma dan konfigurasi jika perlu menjalankan migrasi/seed dari container
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
