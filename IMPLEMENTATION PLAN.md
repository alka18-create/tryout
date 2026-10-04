# IMPLEMENTATION PLAN — TryoutKu (MVP v0.1.0)

**Referensi:**
- [BLUEPRINT 00.md](./BLUEPRINT%2000.md) — Visi Produk & Scope MVP
- [BLUEPRINT 02 - CORE ENGINE & API SPECIFICATION.md](./BLUEPRINT%2002%20-%20CORE%20ENGINE%20&%20API%20SPECIFICATION.md) — Exam Engine & API Contract
- [BLUEPRINT 03 - DATABASE DESIGN & ERD.md](./BLUEPRINT%2003%20-%20DATABASE%20DESIGN%20&%20ERD.md) — Prisma Schema & ERD

**Cara pakai dokumen ini:**
- Ganti `[ ]` menjadi `[x]` setiap kali task selesai.
- Update tabel **Progress Overview** setelah satu fase selesai.
- Kerjakan fase secara berurutan; setiap fase punya **Definition of Done (DoD)** yang harus lolos sebelum lanjut.

---

## PROGRESS OVERVIEW

| Fase | Nama | Status | Progres |
| :--: | :--- | :--- | :--: |
| 0 | Perencanaan & Dokumentasi | ✅ Selesai | 6 / 6 |
| 1 | Setup Project & Infrastruktur Lokal | ✅ Selesai | 13 / 13 |
| 2 | Database & Seed Data | ✅ Selesai | 10 / 10 |
| 3 | Authentication & Authorization | ⬜ Belum mulai | 0 / 18 |
| 4 | Layout, Design System & Profil | ⬜ Belum mulai | 0 / 12 |
| 5 | Bank Soal & Kurikulum (Guru) | ⬜ Belum mulai | 0 / 14 |
| 6 | Manajemen Tryout (Guru) | ⬜ Belum mulai | 0 / 11 |
| 7 | Exam Engine (Peserta) | ⬜ Belum mulai | 0 / 24 |
| 8 | Scoring, Hasil, Pembahasan & Riwayat | ⬜ Belum mulai | 0 / 15 |
| 9 | Dashboard Guru & Admin | ⬜ Belum mulai | 0 / 14 |
| 10 | Testing & Hardening | ⬜ Belum mulai | 0 / 13 |
| 11 | Deployment VPS | ⬜ Belum mulai | 0 / 16 |

Legenda status: ⬜ Belum mulai · 🟨 Sedang dikerjakan · ✅ Selesai · ⛔ Terblokir

---

## FASE 0 — Perencanaan & Dokumentasi

- [x] Rancangan awal ide produk (`rancangan.md`)
- [x] Blueprint 00 — Product Overview & Requirements
- [x] Blueprint 03 — Database Design & ERD (Prisma Schema)
- [x] Blueprint 02 — Core Engine & API Specification
- [x] Implementation Plan (dokumen ini)
- [x] Keputusan stack utama: **Next.js (App Router) + TypeScript + Prisma + PostgreSQL + Auth.js**

### Keputusan yang masih terbuka (selesaikan sebelum/selama Fase 1)

- [x] **Styling:** Tailwind CSS v4 + shadcn/ui (dipilih)
- [ ] **Layanan email** (verifikasi & reset password): Resend / Brevo / SMTP sendiri
- [ ] **Penyimpanan gambar soal:** folder lokal VPS *atau* object storage (Cloudflare R2 / S3)
- [ ] **Strategi session Auth.js:** JWT (wajib jika memakai Credentials provider) — perlu disesuaikan dengan tabel `sessions` di Blueprint 03
- [ ] **Rich text editor soal** (untuk teks soal/pembahasan): Tiptap / textarea Markdown biasa
- [ ] **Domain** yang akan dipakai di VPS

---

## FASE 1 — Setup Project & Infrastruktur Lokal

### 1.1 Inisialisasi Project
- [x] Buat project Next.js (App Router, TypeScript, ESLint, `src/` directory)
- [x] Inisialisasi Git repository + `.gitignore`
- [x] Setup Prettier + aturan lint dasar
- [x] Setup styling sesuai keputusan Fase 0
- [x] Setup path alias (`@/`)

### 1.2 Struktur Folder (Modular Monolith)
- [x] Buat struktur folder modul:
  ```text
  src/
  ├── app/                # routes (pages + api)
  ├── modules/
  │   ├── auth/
  │   ├── user/
  │   ├── question-bank/
  │   ├── tryout/
  │   ├── exam/
  │   ├── scoring/
  │   └── analytics/
  ├── lib/                # prisma client, helpers, response formatter
  └── components/         # UI bersama
  ```
- [x] Buat helper response API standar (`{ success, data, message }` / `{ success, error }`)
- [x] Buat helper error code (`EXAM_SESSION_EXPIRED`, `EXAM_ALREADY_SUBMITTED`, `DISCUSSION_LOCKED`, dll.)

### 1.3 Environment & Database Lokal
- [x] Buat `docker-compose.yml` untuk PostgreSQL lokal
- [x] Buat `.env.example` (`DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `EMAIL_*`, `APP_URL`)
- [x] Buat `.env` lokal (tidak di-commit)
- [x] Install dependency inti: `prisma`, `@prisma/client`, `next-auth`, `bcryptjs`, `zod`
- [x] Setup validasi env saat aplikasi start (zod)

**DoD Fase 1:** `npm run dev` berjalan, PostgreSQL lokal aktif via Docker, struktur folder siap. (✅ Selesai)

---

## FASE 2 — Database & Seed Data

- [x] Salin `schema.prisma` dari Blueprint 03 ke `prisma/schema.prisma`
- [x] Sesuaikan model `Session` dengan strategi session yang dipilih
- [x] Jalankan migrasi awal (`npx prisma migrate dev --name init`)
- [x] Buat singleton Prisma Client di `src/lib/prisma.ts`
- [x] Buat seed: 1 akun ADMIN, 1 akun GURU, 2 akun PESERTA
- [x] Buat seed: data sekolah contoh
- [x] Buat seed: mata pelajaran + topik (contoh: Sosiologi → Identitas, Kelompok, Konflik, Perubahan Sosial)
- [x] Buat seed: minimal 20 soal pilihan ganda (A–E) lengkap dengan pembahasan
- [x] Buat seed: 1 tryout PUBLISHED berisi soal-soal tersebut
- [x] Verifikasi data via Prisma Studio / query test

**DoD Fase 2:** Database terisi data contoh dan bisa dibuka lewat Prisma Studio. (✅ Selesai)

---

## FASE 3 — Authentication & Authorization

### 3.1 Registrasi & Login Email
- [ ] Endpoint `POST /api/auth/register` (validasi zod, hash bcrypt, cek email duplikat)
- [ ] Konfigurasi Auth.js Credentials provider
- [ ] Halaman Register
- [ ] Halaman Login
- [ ] Logout

### 3.2 Google OAuth & Account Linking
- [ ] Buat OAuth Client di Google Cloud Console (redirect URI lokal + produksi)
- [ ] Konfigurasi Google provider di Auth.js
- [ ] Implementasi account linking (email sama → satu User, tambah record `Account`)
- [ ] Uji skenario: daftar email → login Google dengan email sama → tetap satu akun
- [ ] Uji skenario: login Google dulu → set password → login email

### 3.3 Email Verification & Forgot Password
- [ ] Integrasi layanan email
- [ ] Kirim email verifikasi + halaman konfirmasi token
- [ ] Halaman "Lupa Password" + kirim link reset (token berbatas waktu)
- [ ] Halaman "Password Baru"

### 3.4 Authorization (RBAC)
- [ ] Simpan `role` di session/JWT
- [ ] `middleware.ts` untuk proteksi route sesuai matriks Blueprint 02 §2.2
- [ ] Helper `requireRole()` untuk dipakai di setiap API route
- [ ] Redirect setelah login sesuai role (Peserta / Guru / Admin)

**DoD Fase 3:** Semua skenario login berjalan, account linking benar, Peserta tidak bisa membuka halaman/API Guru & Admin.

---

## FASE 4 — Layout, Design System & Profil

### 4.1 Design System
- [ ] Definisikan design tokens (warna, tipografi, spacing, radius, shadow)
- [ ] Komponen dasar: Button, Input, Select, Card, Badge, Modal, Toast, Table
- [ ] Komponen state: Loading skeleton, Empty state, Error state
- [ ] Dukungan responsif (mobile-first — peserta banyak memakai HP)

### 4.2 Layout
- [ ] Landing page publik
- [ ] Layout dashboard Peserta (navbar/sidebar)
- [ ] Layout dashboard Guru
- [ ] Layout dashboard Admin

### 4.3 Profil Peserta
- [ ] API `GET` & `PUT /api/student/profile`
- [ ] Halaman "Lengkapi Profil" setelah registrasi (sekolah, kelas, no. HP — opsional)
- [ ] Halaman "Profil Saya" (edit nama, foto, sekolah, kelas, HP)
- [ ] Ganti password (untuk akun yang punya password)

**DoD Fase 4:** Semua role punya layout sendiri, profil peserta bisa diedit.

---

## FASE 5 — Bank Soal & Kurikulum (Guru)

### 5.1 Mata Pelajaran & Topik
- [ ] API CRUD Subject
- [ ] API CRUD Topic (per Subject)
- [ ] Halaman kelola Mata Pelajaran & Topik

### 5.2 Soal
- [ ] API `POST /api/teacher/questions` (validasi: tepat 5 opsi A–E, tepat 1 kunci benar)
- [ ] API `GET /api/teacher/questions` (filter: mapel, topik, kesulitan, pencarian, pagination)
- [ ] API `PUT /api/teacher/questions/:id`
- [ ] API `DELETE /api/teacher/questions/:id` (soft delete via `isActive` jika sudah dipakai di tryout)
- [ ] Halaman daftar Bank Soal + filter
- [ ] Form tambah/edit soal (teks soal, opsi A–E, kunci, pembahasan, topik, kesulitan)
- [ ] Upload gambar soal / opsi / pembahasan
- [ ] Preview soal seperti tampilan peserta

### 5.3 Otorisasi Konten
- [ ] Guru hanya bisa edit/hapus soal miliknya (Admin bisa semua)
- [ ] Uji: Peserta tidak bisa mengakses API bank soal
- [ ] Uji: soal yang sudah dipakai di sesi ujian tidak terhapus permanen

**DoD Fase 5:** Guru bisa membuat, mengedit, memfilter, dan menghapus soal dengan aman.

---

## FASE 6 — Manajemen Tryout (Guru)

- [ ] API `POST /api/teacher/tryouts` (judul, deskripsi, mapel, durasi, KKM, periode, visibilitas pembahasan)
- [ ] API `GET /api/teacher/tryouts` & `PUT /api/teacher/tryouts/:id`
- [ ] API `PUT /api/teacher/tryouts/:id/questions` (pilih soal + urutan nomor + bobot)
- [ ] Halaman daftar tryout milik guru
- [ ] Form buat/edit tryout
- [ ] UI pemilih soal dari Bank Soal (filter + checklist)
- [ ] UI pengaturan urutan soal (drag & drop atau tombol naik/turun)
- [ ] Aksi ubah status: DRAFT → PUBLISHED → ARCHIVED
- [ ] Validasi publish: minimal 1 soal, durasi > 0
- [ ] Kunci perubahan soal jika tryout sudah memiliki sesi peserta
- [ ] Preview tryout sebagai peserta

**DoD Fase 6:** Guru bisa membuat tryout lengkap dan mempublikasikannya.

---

## FASE 7 — Exam Engine (Peserta) ⭐ Jantung Aplikasi

### 7.1 Daftar & Detail Tryout
- [ ] API `GET /api/student/tryouts` (hanya PUBLISHED & dalam periode aktif, plus status pengerjaan user)
- [ ] Halaman Dashboard Peserta (sapaan, tryout tersedia, tryout berlangsung, nilai terakhir)
- [ ] Halaman detail tryout (jumlah soal, durasi, mapel, aturan) + tombol **MULAI**

### 7.2 Memulai Sesi
- [ ] API `POST /api/student/tryouts/:id/start`
- [ ] Hitung `expiresAt` di server
- [ ] Buat baris `ExamAnswer` kosong untuk setiap soal (dalam satu transaksi)
- [ ] *Idempotent resume*: jika ada sesi `IN_PROGRESS` aktif → kembalikan sesi yang sama
- [ ] Cegah peserta mengulang tryout yang sudah SUBMITTED (kecuali diatur lain)

### 7.3 Lembar Ujian
- [ ] API `GET /api/student/exam-sessions/:id` dengan **sanitasi payload** (tanpa `isCorrect` & `explanation`)
- [ ] Cek kepemilikan sesi (hanya pemilik)
- [ ] Halaman ujian: teks soal, gambar, opsi A–E
- [ ] Navigasi Sebelumnya / Lanjut
- [ ] Grid nomor soal dengan status visual (dijawab / belum / ditandai / aktif)
- [ ] Tombol "Tandai untuk ditinjau" (ragu-ragu)
- [ ] Timer tampilan yang disinkronkan dengan `remainingSeconds` dari server
- [ ] Re-sinkronisasi timer saat tab kembali aktif / setelah refresh

### 7.4 Autosave
- [ ] API `PUT /api/student/exam-sessions/:id/answer` (validasi status + grace period 15 detik)
- [ ] Autosave saat memilih opsi (debounce + retry jika gagal)
- [ ] Indikator status simpan ("Tersimpan" / "Menyimpan…" / "Gagal, mencoba lagi")
- [ ] Jawaban tetap ada setelah refresh browser

### 7.5 Submit
- [ ] Halaman/Modal review sebelum submit (ringkasan dijawab, kosong, ditandai)
- [ ] API `POST /api/student/exam-sessions/:id/submit` (idempotent — submit ganda tidak menghitung ulang)
- [ ] Auto-submit dari client saat timer = 00:00:00
- [ ] Auto-expire di server: sesi yang lewat `expiresAt` otomatis dinilai saat diakses (lazy evaluation) atau via job terjadwal

**DoD Fase 7:** Peserta bisa mengerjakan tryout dari awal sampai submit; refresh tidak menghilangkan jawaban; kunci jawaban tidak terlihat di Network tab; waktu tidak bisa dimanipulasi dari browser.

---

## FASE 8 — Scoring, Hasil, Pembahasan & Riwayat

### 8.1 Scoring Engine
- [ ] Service `scoreExamSession()` — hitung benar / salah / kosong per jawaban
- [ ] Hitung `totalScore` (skala 0–100 berdasarkan bobot)
- [ ] Hitung `isPassed` berdasarkan `passingScore`
- [ ] Hitung & simpan `ExamTopicScore` per topik
- [ ] Jalankan seluruh proses dalam satu transaksi database
- [ ] Unit test untuk scoring (semua benar, semua kosong, campuran, bobot berbeda)

### 8.2 Hasil
- [ ] API `GET /api/student/exam-sessions/:id/result`
- [ ] Halaman Hasil (nilai, benar/salah/kosong, durasi pengerjaan, status lulus)
- [ ] Tabel/grafik penguasaan materi per topik

### 8.3 Pembahasan
- [ ] API `GET /api/student/exam-sessions/:id/discussion` dengan cek `discussionVisibility`
- [ ] Halaman Pembahasan (jawaban peserta, kunci, status, penjelasan)

### 8.4 Riwayat & Progres
- [ ] API riwayat tryout peserta
- [ ] Halaman Riwayat Tryout
- [ ] Grafik perkembangan nilai dari waktu ke waktu
- [ ] Widget nilai terakhir & perkembangan di Dashboard Peserta

**DoD Fase 8:** Nilai dihitung server dengan benar (teruji), peserta bisa melihat hasil, analisis materi, pembahasan, dan riwayat.

---

## FASE 9 — Dashboard Guru & Admin

### 9.1 Dashboard & Laporan Guru
- [ ] Statistik ringkas (total soal, total tryout, total peserta)
- [ ] Daftar tryout aktif + jumlah peserta
- [ ] API `GET /api/teacher/tryouts/:id/reports`
- [ ] Halaman hasil peserta per tryout (tabel nilai, filter, urutkan)
- [ ] Analisis materi terlemah per tryout
- [ ] Analisis soal (persentase benar per soal)
- [ ] Export hasil ke CSV/Excel

### 9.2 Panel Admin
- [ ] Dashboard Admin (jumlah user per role, tryout, soal, sekolah)
- [ ] Manajemen pengguna (daftar, cari, ubah role, nonaktifkan)
- [ ] Membuat akun Guru
- [ ] CRUD Sekolah
- [ ] Kelola seluruh tryout (lintas guru)
- [ ] Pengaturan aplikasi dasar (nama aplikasi, dll.)
- [ ] Log aktivitas sistem sederhana (login, buat/hapus tryout, submit)

**DoD Fase 9:** Guru bisa melihat hasil & analisis peserta; Admin bisa mengelola pengguna, sekolah, dan tryout.

---

## FASE 10 — Testing & Hardening

### 10.1 Testing
- [ ] Unit test: scoring, perhitungan waktu, sanitasi payload
- [ ] Integration test: alur start → answer → submit → result
- [ ] E2E test (Playwright): registrasi, login, mengerjakan tryout sampai hasil
- [ ] Uji RBAC: setiap role tidak bisa mengakses endpoint role lain
- [ ] Uji edge case: submit ganda, jawab setelah waktu habis, dua tab terbuka bersamaan

### 10.2 Keamanan
- [ ] Rate limiting untuk login, register, forgot password
- [ ] Validasi input zod di semua endpoint
- [ ] Security headers (CSP, X-Frame-Options, dll.)
- [ ] Audit: tidak ada kunci jawaban di response selama `IN_PROGRESS`

### 10.3 Performa & UX
- [ ] Load test sederhana (mis. 100 peserta bersamaan melakukan autosave)
- [ ] Optimasi query + cek index database
- [ ] Uji tampilan di HP, tablet, desktop
- [ ] Halaman error 404 & 500

**DoD Fase 10:** Semua test lulus, tidak ada celah kebocoran kunci jawaban, aplikasi stabil saat diuji beban.

---

## FASE 11 — Deployment VPS

### 11.1 Persiapan Server
- [ ] Siapkan VPS (Ubuntu 22.04/24.04 LTS)
- [ ] Buat user non-root, setup SSH key, nonaktifkan login password
- [ ] Setup firewall (UFW: 22, 80, 443)
- [ ] Install Docker + Docker Compose

### 11.2 Aplikasi
- [ ] Buat `Dockerfile` produksi (multi-stage build, Next.js standalone output)
- [ ] Buat `docker-compose.prod.yml` (app + PostgreSQL)
- [ ] Setup environment variables produksi
- [ ] Jalankan `prisma migrate deploy` saat deploy
- [ ] Seed akun Admin pertama di produksi

### 11.3 Domain & Jaringan
- [ ] Arahkan domain ke IP VPS (DNS A record)
- [ ] Setup Nginx sebagai reverse proxy
- [ ] SSL gratis dengan Certbot (Let's Encrypt) + auto-renew
- [ ] Update redirect URI Google OAuth ke domain produksi

### 11.4 Operasional
- [ ] Backup database otomatis harian (`pg_dump` + cron) + uji restore
- [ ] Monitoring & log (uptime check, log aplikasi)
- [ ] Script deploy ulang sederhana (git pull → build → restart)

**DoD Fase 11:** Aplikasi berjalan di domain dengan HTTPS, backup harian aktif dan sudah diuji restore.

---

## CHECKLIST MVP DONE (dari Blueprint 00 §31)

- [ ] Peserta dapat registrasi menggunakan email — *Fase 3*
- [ ] Peserta dapat login menggunakan email/password — *Fase 3*
- [ ] Peserta dapat login menggunakan Google — *Fase 3*
- [ ] Account linking berjalan dengan benar — *Fase 3*
- [ ] Peserta dapat mengelola profil — *Fase 4*
- [ ] Guru dapat membuat soal — *Fase 5*
- [ ] Guru dapat membuat tryout — *Fase 6*
- [ ] Guru dapat memilih soal — *Fase 6*
- [ ] Peserta dapat mengikuti tryout — *Fase 7*
- [ ] Timer berjalan — *Fase 7*
- [ ] Jawaban tersimpan — *Fase 7*
- [ ] Tryout dapat otomatis submit ketika waktu habis — *Fase 7*
- [ ] Sistem menghitung nilai — *Fase 8*
- [ ] Peserta dapat melihat hasil — *Fase 8*
- [ ] Peserta dapat melihat pembahasan — *Fase 8*
- [ ] Peserta dapat melihat riwayat — *Fase 8*
- [ ] Guru dapat melihat hasil peserta — *Fase 9*
- [ ] Admin dapat mengelola pengguna — *Fase 9*
- [ ] Role dan authorization berjalan — *Fase 3 & 10*
- [ ] Database dapat di-backup — *Fase 11*
- [ ] Aplikasi dapat dideploy ke VPS — *Fase 11*

---

## SETELAH MVP (Backlog — belum dikerjakan)

- [ ] Import soal dari Excel (disarankan di `rancangan.md`)
- [ ] Ranking per tryout (opsional)
- [ ] Target nilai & topic mastery lanjutan (Phase 2 — Assessment)
- [ ] AI Question Generator + review guru (Phase 3 — AI)
- [ ] AI Tutor "Jelaskan kesalahan saya" (Phase 3 — AI)
- [ ] Multi-sekolah & multi-guru lanjutan (Phase 4 — Platform)

---

## CATATAN PROGRES

| Tanggal | Fase | Catatan |
| :--- | :--- | :--- |
| 2026-10-04 | 0 | Blueprint 00, 02, 03 dan Implementation Plan selesai disusun. |
| 2026-10-04 | 1 | Setup Next.js 16, Tailwind v4, PostgreSQL Docker (port 5434), Prisma 7, helper API, env validator selesai dan teruji build. |
| 2026-10-04 | 2 | Migrasi Prisma initial, singleton client driver-adapter, seed 4 user (Admin/Guru/Siswa), 2 sekolah, 1 mapel, 4 topik, 20 soal A-E, dan 1 paket tryout selesai dan terverifikasi. |
