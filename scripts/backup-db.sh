#!/usr/bin/env bash
# ==============================================================================
# Script Backup Otomatis Database PostgreSQL — TryoutKu
# Penggunaan: bash scripts/backup-db.sh
# Dapat dijadwalkan via Cron Job (setiap hari jam 02:00 pagi)
# ==============================================================================

set -e

# Tentukan direktori root project
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Baca konfigurasi lingkungan
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

BACKUP_DIR="$PROJECT_ROOT/backups/db"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/backup_${POSTGRES_DB}_${TIMESTAMP}.sql.gz"

echo "📦 [Backup DB] Memulai proses backup database: $POSTGRES_DB..."

# Jalankan pg_dump dari dalam container dan kompres langsung dengan gzip
docker exec -t "$CONTAINER_NAME" pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$BACKUP_FILE"

FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "✓ Berhasil membuat arsip backup: $BACKUP_FILE (Ukuran: $FILE_SIZE)"

# Pembersihan otomatis: Hapus backup yang lebih tua dari 14 hari untuk menghemat storage VPS
RETENTION_DAYS=14
echo "🧹 Membersihkan file backup yang lebih tua dari $RETENTION_DAYS hari..."
find "$BACKUP_DIR" -type f -name "backup_${POSTGRES_DB}_*.sql.gz" -mtime +$RETENTION_DAYS -exec rm -f {} \;

echo "✅ Backup database selesai dengan aman!"
