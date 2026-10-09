#!/usr/bin/env bash
# ==============================================================================
# Script Otomasi Deployment Produksi — TryoutKu
# Jalankan di VPS: bash scripts/deploy.sh
# ==============================================================================

set -e

echo "🚀 [Deploy] Memulai proses deployment TryoutKu..."

# 1. Pastikan file konfigurasi produksi ada
if [ ! -f .env.production ]; then
  echo "❌ Error: File .env.production tidak ditemukan!"
  echo "   Silakan salin dari .env.production.example:"
  echo "   cp .env.production.example .env.production"
  echo "   Lalu isi nilai variabel yang dibutuhkan sebelum melanjutkan."
  exit 1
fi

# 2. Tarik update terbaru dari git jika di dalam git repository
if [ -d .git ]; then
  echo "📥 [1/4] Menarik pembaruan kode terbaru dari Git..."
  git pull origin main || echo "⚠️ Peringatan: Tidak dapat melakukan git pull, melanjutkan dengan kode lokal..."
fi

# 3. Pastikan direktori persistent storage upload gambar tersedia
mkdir -p ./uploads/questions
chmod -R 775 ./uploads

# 4. Build dan jalankan container dengan Docker Compose
echo "🐳 [2/4] Membangun dan menjalankan Docker container produksi..."
docker compose -f docker-compose.prod.yml up -d --build

# 5. Jalankan migrasi database
echo "🗄️ [3/4] Menjalankan migrasi schema Prisma database..."
docker compose -f docker-compose.prod.yml exec -T app npx prisma migrate deploy

# 6. Verifikasi status container
echo "🔍 [4/4] Memverifikasi status layanan..."
docker compose -f docker-compose.prod.yml ps

echo ""
echo "=================================================================="
echo "✅ DEPLOYMENT BERHASIL!"
echo "Aplikasi TryoutKu kini aktif di http://127.0.0.1:3000"
echo "Jika ini adalah instalasi pertama kali, buat akun Admin dengan:"
echo "  docker compose -f docker-compose.prod.yml exec -T app npx tsx scripts/seed-admin.ts"
echo "=================================================================="
