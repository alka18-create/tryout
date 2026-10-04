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
| 3 | Authentication & Authorization | ✅ Selesai | 18 / 18 |
| 4 | Layout, Design System & Profil | ✅ Selesai | 12 / 12 |
| 5 | Bank Soal & Kurikulum (Guru) | ✅ Selesai | 14 / 14 |
| 6 | Manajemen Tryout (Guru) | ✅ Selesai | 11 / 11 |
| 7 | Exam Engine (Peserta) | ✅ Selesai | 24 / 24 |
| 8 | Scoring, Hasil, Pembahasan & Riwayat | ✅ Selesai | 15 / 15 |
| 9 | Dashboard Guru & Admin | ✅ Selesai | 14 / 14 |
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
- [x] Endpoint `POST /api/auth/register` (validasi zod, hash bcrypt, cek email duplikat)
- [x] Konfigurasi Auth.js Credentials provider (JWT session)
- [x] Halaman Register (`/auth/register`)
- [x] Halaman Login (`/auth/login` + tombol demo akun 1-klik)
- [x] Logout (terintegrasi via NextAuth `signOut`)

### 3.2 Google OAuth & Account Linking
- [x] Template konfigurasi Google Cloud Console (`AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`)
- [x] Konfigurasi Google provider di Auth.js (`src/auth.ts`)
- [x] Implementasi account linking otomatis (email sama → 1 akun `User`, tambah record `Account`)
- [x] Uji skenario linking & pendaftaran Google di callback `signIn`
- [x] Dukungan login hybrid (bisa login Google dan login password untuk akun yang sama)

### 3.3 Email Verification & Forgot Password
- [x] Token generation & verification model di `verification_tokens`
- [x] Endpoint `POST /api/auth/forgot-password` (token 1 jam + simulasi link dev)
- [x] Halaman "Lupa Password" (`/auth/forgot-password`)
- [x] Endpoint `POST /api/auth/reset-password`
- [x] Halaman "Password Baru" (`/auth/reset-password?token=...`)

### 3.4 Authorization (RBAC)
- [x] Simpan `id` dan `role` di JWT & Session token
- [x] `src/proxy.ts` (Next.js 16 Proxy/Middleware) untuk proteksi route sesuai matriks Blueprint 02 §2.2
- [x] Helper `requireAuth()` & `requireRole()` di `src/modules/auth/auth.guard.ts`
- [x] Redirect cerdas setelah login sesuai role (Peserta / Guru / Admin)

**DoD Fase 3:** Semua skenario login berjalan, account linking benar, Peserta tidak bisa membuka halaman/API Guru & Admin. (✅ Selesai)

---

## FASE 4 — Layout, Design System & Profil

### 4.1 Design System
- [x] Definisikan design tokens (warna indigo/violet dark mode, tipografi, glassmorphism, scrollbar)
- [x] Komponen dasar: Button (variants & loading), Card, Badge, Input (label & error helper)
- [x] Komponen state: Loading skeleton, Empty state
- [x] Dukungan responsif (mobile-first, drawer navigasi mobile & responsive grid)

### 4.2 Layout
- [x] Landing page publik (`/`) dengan hero showcase, feature grid, live package preview
- [x] Layout dashboard Peserta (`/dashboard/student` + navbar/sidebar)
- [x] Layout dashboard Guru (`/dashboard/teacher` + ringkasan metrik soal & tryout)
- [x] Layout dashboard Admin (`/dashboard/admin` + pengawasan master data & pengguna)

### 4.3 Profil Peserta
- [x] API `GET` & `PUT /api/student/profile` (update data diri, kelas, auto-upsert sekolah)
- [x] Integrasi alur lengkapi profil (sekolah, kelas, no. WhatsApp)
- [x] Halaman "Profil Saya" (`/dashboard/student/profile`)
- [x] Ganti password dengan verifikasi password lama untuk keamanan akun

**DoD Fase 4:** Semua role punya layout sendiri, profil peserta bisa diedit. (✅ Selesai)

---

## FASE 5 — Bank Soal & Kurikulum (Guru)

### 5.1 Mata Pelajaran & Topik
- [x] API CRUD Subject (`/api/teacher/subjects`)
- [x] API CRUD Topic per Subject (`/api/teacher/topics`)
- [x] Antarmuka kelola Mata Pelajaran & Topik (Modal langsung di Bank Soal)

### 5.2 Soal
- [x] API `POST /api/teacher/questions` (validasi Zod: tepat 5 opsi A–E, tepat 1 kunci benar)
- [x] API `GET /api/teacher/questions` (filter: mapel, topik, kesulitan, pencarian, pagination)
- [x] API `PUT /api/teacher/questions/:id` (transaksi update opsi & data induk)
- [x] API `DELETE /api/teacher/questions/:id` (soft delete via `isActive: false` jika sudah dipakai di tryout)
- [x] Halaman daftar Bank Soal + filter (`/dashboard/teacher/questions`)
- [x] Form tambah/edit soal (`QuestionForm` untuk teks soal, opsi A–E, kunci, pembahasan, topik, kesulitan)
- [x] Dukungan gambar soal / opsi / pembahasan (field Image URL pendukung)
- [x] Live Preview tampilan soal seperti yang dilihat peserta saat ujian

### 5.3 Otorisasi Konten
- [x] Guru hanya bisa edit/hapus soal miliknya (Admin memiliki hak akses penuh)
- [x] Teruji: Peserta diblokir oleh guard & RBAC proxy saat mengakses API bank soal
- [x] Teruji: Soal yang sudah dipakai di tryout/sesi peserta dilindungi dengan soft-delete

**DoD Fase 5:** Guru bisa membuat, mengedit, memfilter, dan menghapus soal dengan aman. (✅ Selesai)

---

## FASE 6 — Manajemen Tryout (Guru)

- [x] API `POST /api/teacher/tryouts` (judul, deskripsi, mapel, durasi, KKM, periode, visibilitas pembahasan)
- [x] API `GET /api/teacher/tryouts` & `PUT /api/teacher/tryouts/:id`
- [x] API `PUT /api/teacher/tryouts/:id/questions` (pilih soal + urutan nomor + bobot)
- [x] Halaman daftar tryout milik guru (`/dashboard/teacher/tryouts`)
- [x] Form buat/edit tryout (`TryoutForm`, `/dashboard/teacher/tryouts/new`, `/dashboard/teacher/tryouts/:id/edit`)
- [x] UI pemilih soal dari Bank Soal (filter topik/kesulitan, search + checklist)
- [x] UI pengaturan urutan soal (tombol naik ▲ / turun ▼ + input bobot dinamis)
- [x] Aksi ubah status: DRAFT → PUBLISHED → ARCHIVED
- [x] Validasi publish: minimal 1 soal, durasi > 0
- [x] Kunci perubahan soal jika tryout sudah memiliki sesi peserta (Locked state & warning banner)
- [x] Preview tryout sebagai peserta (Simulasi soal 1-N, opsi A-E, kunci, navigasi nomor)

**DoD Fase 6:** Guru bisa membuat tryout lengkap dan mempublikasikannya. (✅ Selesai)

---

## FASE 7 — Exam Engine (Peserta) ⭐ Jantung Aplikasi

### 7.1 Daftar & Detail Tryout
- [x] API `GET /api/student/tryouts` (hanya PUBLISHED & dalam periode aktif, plus status pengerjaan user)
- [x] Halaman Dashboard Peserta (sapaan, tryout tersedia, tryout berlangsung, nilai terakhir)
- [x] Halaman detail tryout (`/dashboard/student/tryouts/:id` dengan jumlah soal, durasi, mapel, aturan + tombol **MULAI**)

### 7.2 Memulai Sesi
- [x] API `POST /api/student/tryouts/:id/start`
- [x] Hitung `expiresAt` di server
- [x] Buat baris `ExamAnswer` kosong untuk setiap soal (dalam satu transaksi)
- [x] *Idempotent resume*: jika ada sesi `IN_PROGRESS` aktif → kembalikan sesi yang sama
- [x] Cegah peserta mengulang tryout yang sudah SUBMITTED (kecuali diatur lain)

### 7.3 Lembar Ujian
- [x] API `GET /api/student/exam-sessions/:id` dengan **sanitasi payload** (tanpa `isCorrect` & `explanation`)
- [x] Cek kepemilikan sesi (hanya pemilik)
- [x] Halaman ujian: teks soal, gambar, opsi A–E (`/exam/:id`)
- [x] Navigasi Sebelumnya / Lanjut
- [x] Grid nomor soal dengan status visual (dijawab / belum / ditandai / aktif)
- [x] Tombol "Tandai untuk ditinjau" (ragu-ragu)
- [x] Timer tampilan yang disinkronkan dengan `remainingSeconds` dari server
- [x] Re-sinkronisasi timer saat tab kembali aktif / setelah refresh

### 7.4 Autosave
- [x] API `PUT /api/student/exam-sessions/:id/answer` (validasi status + grace period 15 detik)
- [x] Autosave saat memilih opsi (debounce + retry jika gagal)
- [x] Indikator status simpan ("Tersimpan" / "Menyimpan…" / "Gagal, mencoba lagi")
- [x] Jawaban tetap ada setelah refresh browser

### 7.5 Submit
- [x] Halaman/Modal review sebelum submit (ringkasan dijawab, kosong, ditandai)
- [x] API `POST /api/student/exam-sessions/:id/submit` (idempotent — submit ganda tidak menghitung ulang)
- [x] Auto-submit dari client saat timer = 00:00:00
- [x] Auto-expire di server: sesi yang lewat `expiresAt` otomatis dinilai saat diakses (lazy evaluation) atau via job terjadwal

**DoD Fase 7:** Peserta bisa mengerjakan tryout dari awal sampai submit; refresh tidak menghilangkan jawaban; kunci jawaban tidak terlihat di Network tab; waktu tidak bisa dimanipulasi dari browser. (✅ Selesai)

---

## FASE 8 — Scoring, Hasil, Pembahasan & Riwayat

### 8.1 Scoring Engine
- [x] Service `scoreExamSession()` — hitung benar / salah / kosong per jawaban
- [x] Hitung `totalScore` (skala 0–100 berdasarkan bobot)
- [x] Hitung `isPassed` berdasarkan `passingScore`
- [x] Hitung & simpan `ExamTopicScore` per topik
- [x] Jalankan seluruh proses dalam satu transaksi database
- [x] Unit test untuk scoring (semua benar, semua kosong, campuran, bobot berbeda)

### 8.2 Hasil
- [x] API `GET /api/student/exam-sessions/:id/result`
- [x] Halaman Hasil (`/dashboard/student/exam-sessions/:id/result` dengan nilai, benar/salah/kosong, durasi pengerjaan, status lulus)
- [x] Tabel/grafik penguasaan materi per topik (Topic Mastery & rekomendasi materi terkuat/perbaikan)

### 8.3 Pembahasan
- [x] API `GET /api/student/exam-sessions/:id/discussion` dengan cek validasi `discussionVisibility`
- [x] Halaman Pembahasan (`/dashboard/student/exam-sessions/:id/discussion` dengan filter status, jawaban peserta, kunci, dan teks penjelasan)

### 8.4 Riwayat & Progres
- [x] API riwayat tryout peserta (`GET /api/student/history`)
- [x] Halaman Riwayat Tryout (`/dashboard/student/history`)
- [x] Grafik perkembangan nilai dari waktu ke waktu
- [x] Widget nilai terakhir & perkembangan di Dashboard Peserta

**DoD Fase 8:** Nilai dihitung server dengan benar (teruji), peserta bisa melihat hasil, analisis materi, pembahasan, dan riwayat. (✅ Selesai)

---

## FASE 9 — Dashboard Guru & Admin

### 9.1 Dashboard & Laporan Guru
- [x] Statistik ringkas (total soal, total tryout, total peserta)
- [x] Daftar tryout aktif + jumlah peserta
- [x] API `GET /api/teacher/tryouts/:id/reports`
- [x] Halaman hasil peserta per tryout (tabel nilai, filter, urutkan)
- [x] Analisis materi terlemah per tryout
- [x] Analisis soal (persentase benar per butir soal & daya serap)
- [x] Export hasil ke CSV/Excel (`GET /api/teacher/tryouts/:id/export`)

### 9.2 Panel Admin
- [x] Dashboard Admin (jumlah user per role, tryout, soal, sekolah)
- [x] Manajemen pengguna (daftar, cari, ubah role via `/api/admin/users`)
- [x] Membuat akun Guru & Admin (`POST /api/admin/users`)
- [x] CRUD Sekolah (`/api/admin/schools`)
- [x] Kelola seluruh tryout (lintas guru dengan role ADMIN)
- [x] Pengaturan aplikasi dasar & navigasi cepat di Header Admin
- [x] Log aktivitas sistem sederhana (pengerjaan & monitoring status sesi)

**DoD Fase 9:** Guru bisa melihat hasil & analisis peserta; Admin bisa mengelola pengguna, sekolah, dan tryout. (✅ Selesai)

---

## FASE 10 — Testing & Hardening

### 10.1 Testing
- [x] Unit test: scoring, perhitungan waktu, sanitasi payload
- [x] Integration test: alur start → answer → submit → result
- [x] Uji RBAC: setiap role tidak bisa mengakses endpoint role lain & isolasi sesi
- [x] Uji edge case: submit ganda (idempotent), jawab setelah waktu habis, resume aktif

### 10.2 Keamanan
- [x] Rate limiting untuk register, forgot password, reset password (`src/lib/rate-limit.ts`)
- [x] Validasi input zod di semua endpoint
- [x] Security headers di `next.config.ts` (HSTS, X-Frame-Options, nosniff, dll.)
- [x] Audit: tidak ada kunci jawaban & penjelasan di response selama `IN_PROGRESS`
- [x] Proteksi rute lembar ujian (`/exam/:id`) di middleware proxy

### 10.3 Performa & UX
- [x] Load test konkurensi (100 peserta bersamaan melakukan autosave tanpa error / deadlock)
- [x] Optimasi query + verifikasi index database
- [x] Desain responsif di HP, tablet, desktop
- [x] Halaman error modern 404 (`not-found.tsx`) & 500 (`error.tsx`)

**DoD Fase 10:** Semua test lulus 100%, tidak ada celah kebocoran kunci jawaban, aplikasi stabil saat diuji beban. (✅ Selesai)

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
| 2026-10-04 | 3 | NextAuth v5 JWT, register student, reset password token, account linking Google, RBAC Proxy, guard, serta UI Login, Register, Forgot & Reset Password selesai dan teruji build. |
| 2026-10-04 | 4 | Design system (tokens, Button, Card, Badge, Input, Skeleton, EmptyState), Landing Page modern, Dashboard Layout & Page (Student/Teacher/Admin), serta API & Halaman Profil Siswa selesai dan teruji build. |
| 2026-10-04 | 5 | API Bank Soal (Subject, Topic, Questions CRUD), form buat & edit soal dengan 5 opsi A-E, live preview tampilan siswa, otorisasi RBAC guru, dan proteksi soft-delete selesai dan teruji build. |
