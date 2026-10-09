#!/usr/bin/env bash
# ==============================================================================
# Script Pemulihan (Restore) Database PostgreSQL — TryoutKu
# Penggunaan: bash scripts/restore-db.sh [path_file_backup.sql.gz]
# ==============================================================================

set -e

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
  echo "❌ Error: Harap sertakan file backup yang ingin dipulihkan!"
  echo "Contoh: bash scripts/restore-db.sh backups/db/backup_tryoutku_prod_2026-10-09_120000.sql.gz"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Error: File '$BACKUP_FILE' tidak ditemukan!"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

if [ -f .env.production ]; then
  export $(grep -v '^#' .env.production | xargs)
elif [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

POSTGRES_USER="${POSTGRES_USER:-tryoutku}"
POSTGRES_DB="${POSTGRES_DB:-tryoutku}"
CONTAINER_NAME="${POSTGRES_CONTAINER:-tryoutku-prod-postgres}"

# Fallback ke nama container dev jika prod tidak ada
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  if docker ps --format '{{.Names}}' | grep -q "^tryoutku-postgres$"; then
    CONTAINER_NAME="tryoutku-postgres"
  else
    echo "❌ Error: Container database ($CONTAINER_NAME / tryoutku-postgres) tidak sedang berjalan!"
    exit 1
  fi
fi

echo "⚠️ PERINGATAN: Memulihkan database akan menimpa seluruh data saat ini di '$POSTGRES_DB'!"
read -p "Apakah Anda yakin ingin melanjutkan? (ketik 'yes' untuk konfirmasi): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Operasi dibatalkan."
  exit 0
fi

echo "🔄 [Restore DB] Memulai pemulihan dari: $BACKUP_FILE..."

# Pastikan container postgres berjalan
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "❌ Error: Container $CONTAINER_NAME tidak sedang berjalan!"
  exit 1
fi

# Dekompresi dan eksekusi ke psql
gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

echo "✅ Database berhasil dipulihkan dari $BACKUP_FILE!"
