# 🚀 Panduan Deployment VPS TryoutKu (Fase 11)

Dokumen ini memandu langkah-demi-langkah deployment aplikasi **TryoutKu** ke server VPS (Ubuntu 22.04 / 24.04 LTS) menggunakan **Docker**, **Nginx Reverse Proxy**, dan **SSL Gratis Let's Encrypt**.

---

## 📋 Daftar Isi
1. [Spesifikasi Minimum VPS](#1-spesifikasi-minimum-vps)
2. [Persiapan Awal Server (Ubuntu)](#2-persiapan-awal-server-ubuntu)
3. [Instalasi Docker & Docker Compose](#3-instalasi-docker--docker-compose)
4. [Clone Repositori & Konfigurasi Lingkungan](#4-clone-repositori--konfigurasi-lingkungan)
5. [Menjalankan Aplikasi (Deployment Otomatis)](#5-menjalankan-aplikasi-deployment-otomatis)
6. [Setup Akun Administrator Awal](#6-setup-akun-administrator-awal)
7. [Setup Nginx Reverse Proxy & SSL (HTTPS)](#7-setup-nginx-reverse-proxy--ssl-https)
8. [Jadwal Backup Database Otomatis (Cron Job)](#8-jadwal-backup-database-otomatis-cron-job)
9. [Prosedur Update Aplikasi (Redeploy)](#9-prosedur-update-aplikasi-redeploy)

---

## 1. Spesifikasi Minimum VPS

- **CPU**: 1 vCPU (2 vCPU disarankan untuk >100 peserta bersamaan)
- **RAM**: 1 GB RAM (disarankan swap memory 2 GB jika RAM 1 GB)
- **Disk**: 15–20 GB SSD
- **OS**: Ubuntu 22.04 LTS atau Ubuntu 24.04 LTS

> **Tips VPS Kecil (RAM 1 GB):**
> Buat Swap 2 GB agar proses build dan container berjalan lancar:
> ```bash
> sudo fallocate -l 2G /swapfile
> sudo chmod 600 /swapfile
> sudo mkswap /swapfile
> sudo swapon /swapfile
> echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
> ```

---

## 2. Persiapan Awal Server (Ubuntu)

Login ke VPS via SSH sebagai `root`:
```bash
ssh root@IP_VPS_ANDA
```

Update repositori dan paket OS:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git ufw nano unzip nginx certbot python3-certbot-nginx
```

Aktifkan firewall UFW:
```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status
```

---

## 3. Instalasi Docker & Docker Compose

Jalankan script instalasi Docker resmi:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo systemctl enable docker
sudo systemctl start docker
```

Verifikasi versi:
```bash
docker --version
docker compose version
```

---

## 4. Clone Repositori & Konfigurasi Lingkungan

Pindah ke folder direktori web:
```bash
cd /var/www
# Clone repositori proyek Anda:
git clone <URL_GIT_REPOSITORY_ANDA> tryoutku
cd tryoutku
```

Salin template environment produksi:
```bash
cp .env.production.example .env.production
nano .env.production
```

Isi dan sesuaikan variabel penting berikut:
1. `APP_URL`: Alamat domain Anda (contoh: `https://cbt.sekolah.sch.id`).
2. `POSTGRES_PASSWORD`: Buat kata sandi database yang kuat.
3. `AUTH_SECRET`: Hasilkan string 32-karakter acak dengan menjalankan:
   ```bash
   openssl rand -base64 32
   ```
4. `INITIAL_ADMIN_EMAIL` & `INITIAL_ADMIN_PASSWORD`: Akun untuk login perdana Anda.

---

## 5. Menjalankan Aplikasi (Deployment Otomatis)

Eksekusi script deployment 1-klik yang telah disiapkan:
```bash
bash scripts/deploy.sh
```

Script akan otomatis:
- Membangun container Next.js mandiri (Standalone mode)
- Mengaktifkan database PostgreSQL 17
- Menjalankan seluruh file migrasi database (`prisma migrate deploy`)
- Menguji status container yang berjalan

---

## 6. Setup Akun Administrator Awal

Setelah container aktif, buat akun Admin pertama Anda:
```bash
docker compose -f docker-compose.prod.yml exec -T app npx tsx scripts/seed-admin.ts
```

Akun Administrator telah siap digunakan untuk login di halaman `/auth/login`.

---

## 7. Setup Nginx Reverse Proxy & SSL (HTTPS)

### A. Arahkan DNS Domain
Pastikan Domain/Subdomain Anda telah memiliki **A Record** yang mengarah ke `IP_VPS_ANDA` di DNS manager (Cloudflare, Niagahoster, DomaiNesia, dll).

### B. Konfigurasi Nginx
Salin konfigurasi Nginx dari proyek:
```bash
sudo cp nginx/tryoutku.conf /etc/nginx/sites-available/tryoutku
sudo nano /etc/nginx/sites-available/tryoutku
```
Ganti seluruh kemunculan `cbt.domainanda.com` dengan nama domain Anda yang sebenarnya.

Aktifkan konfigurasi Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/tryoutku /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### C. Pasang Sertifikat SSL Gratis (Let's Encrypt)
Jalankan Certbot:
```bash
sudo certbot --nginx -d cbt.domainanda.com
```
Ikuti instruksi di layar (masukkan email Anda dan setujui ToS). Certbot akan secara otomatis mengonfigurasi sertifikat SSL dan auto-renewal di Nginx.

---

## 8. Jadwal Backup Database Otomatis (Cron Job)

Untuk memastikan data ujian siswa aman, jadwalkan script backup otomatis harian:

Uji coba script backup terlebih dahulu:
```bash
bash scripts/backup-db.sh
```
File backup terkompresi `.sql.gz` akan tersimpan di `./backups/db/`.

Tambahkan ke Cron Job VPS (dijalankan setiap hari pukul 02:00 dini hari):
```bash
crontab -e
```
Tambahkan baris berikut di paling bawah:
```cron
0 2 * * * cd /var/www/tryoutku && bash scripts/backup-db.sh >> /var/log/tryoutku_backup.log 2>&1
```

> **Cara Restore Database (Jika Diperlukan):**
> ```bash
> bash scripts/restore-db.sh backups/db/backup_tryoutku_prod_YYYY-MM-DD_HHMMSS.sql.gz
> ```

---

## 9. Prosedur Update Aplikasi (Redeploy)

Setiap kali Anda melakukan update kode atau fitur baru di kemudian hari, cukup jalankan:
```bash
cd /var/www/tryoutku
bash scripts/deploy.sh
```
Aplikasi akan ditarik dari Git, di-build ulang, dan migrasi database akan diperbarui tanpa memutus data yang sudah ada di disk.
