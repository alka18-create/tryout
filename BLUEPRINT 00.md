# BLUEPRINT 00

# PROJECT OVERVIEW + PRODUCT REQUIREMENTS

**Project Name:** Tryout Platform
**Version:** 0.1.0
**Status:** Draft / MVP
**Target Platform:** Web Application
**Deployment:** VPS
**Development:** OpenCode
**Target Users:** Peserta/Siswa, Guru, Admin

---

# 1. PROJECT OVERVIEW

## 1.1 Deskripsi

Tryout Platform adalah aplikasi berbasis web yang memungkinkan siswa/peserta mengikuti ujian atau tryout secara online.

Aplikasi menyediakan:

* registrasi peserta menggunakan email;
* login menggunakan email/password;
* login menggunakan akun Google;
* pengelolaan akun peserta;
* pembuatan dan pengelolaan tryout;
* bank soal;
* pengerjaan soal secara online;
* timer;
* penilaian otomatis;
* pembahasan soal;
* riwayat hasil tryout;
* analisis hasil berdasarkan materi.

Platform dirancang sebagai **modular monolith** agar mudah dikembangkan dan dikelola pada satu VPS.

---

# 2. PRODUCT VISION

Membangun platform tryout yang sederhana, cepat, mudah digunakan, dan dapat dikembangkan menjadi sistem assessment pendidikan yang lebih lengkap.

Fokus utama:

> **Buat Tryout → Kerjakan → Nilai → Analisis → Belajar Kembali**

Aplikasi tidak hanya memberikan nilai, tetapi membantu peserta mengetahui materi yang sudah dikuasai dan materi yang masih perlu dipelajari.

---

# 3. PROBLEM STATEMENT

Pelaksanaan tryout secara manual memiliki beberapa kendala:

1. Guru membutuhkan waktu untuk menyiapkan ujian.
2. Pemeriksaan soal objektif membutuhkan waktu.
3. Peserta sulit melihat perkembangan nilai dari waktu ke waktu.
4. Hasil ujian biasanya hanya berupa nilai akhir.
5. Guru membutuhkan data untuk mengetahui materi yang masih lemah.
6. Bank soal sering tersebar dan sulit digunakan kembali.
7. Peserta membutuhkan akses tryout yang praktis melalui perangkat masing-masing.

Tryout Platform dibuat untuk mengatasi masalah tersebut dengan proses digital yang terintegrasi.

---

# 4. PRODUCT GOALS

## 4.1 Goal Utama

Menyediakan sistem tryout online yang dapat digunakan oleh peserta dan guru dengan proses sederhana.

## 4.2 Goal MVP

MVP harus mampu:

* membuat akun peserta;
* login dengan email/password;
* login dengan Google;
* mengelola profil peserta;
* membuat bank soal;
* membuat paket tryout;
* mengatur waktu tryout;
* mengerjakan soal;
* menyimpan jawaban;
* menghitung nilai;
* menampilkan hasil;
* menampilkan pembahasan;
* menyimpan riwayat tryout.

---

# 5. USER ROLES

Aplikasi memiliki tiga role utama.

## 5.1 PESERTA

Peserta adalah siswa yang mengikuti tryout.

Hak akses:

* registrasi;
* login;
* login Google;
* mengelola profil;
* melihat tryout;
* mengikuti tryout;
* melihat hasil;
* melihat pembahasan;
* melihat riwayat;
* melihat perkembangan nilai.

---

## 5.2 GURU

Guru bertugas membuat dan mengelola konten tryout.

Hak akses:

* login;
* mengelola bank soal;
* membuat soal;
* mengedit soal;
* menghapus soal;
* membuat tryout;
* memilih soal untuk tryout;
* mengatur durasi;
* melihat hasil peserta;
* melihat statistik tryout;
* mengelola pembahasan.

---

## 5.3 ADMIN

Admin bertugas mengelola sistem secara keseluruhan.

Hak akses:

* mengelola pengguna;
* mengelola role;
* mengelola guru;
* mengelola peserta;
* mengelola sekolah;
* mengelola tryout;
* mengelola pengaturan aplikasi;
* melihat aktivitas sistem.

---

# 6. AUTHENTICATION

## 6.1 Registrasi Email

Peserta dapat membuat akun menggunakan:

* nama lengkap;
* email;
* password;
* konfirmasi password.

Data tambahan seperti sekolah, kelas, dan nomor HP dapat dilengkapi setelah akun dibuat.

---

## 6.2 Login Email

Peserta dapat login menggunakan:

* email;
* password.

---

## 6.3 Google Login

Peserta dapat memilih:

> Continue with Google

Google OAuth digunakan untuk autentikasi.

Data dasar yang dapat digunakan:

* nama;
* email;
* foto profil;
* Google Provider ID.

---

## 6.4 Account Linking

Email yang sama harus dianggap sebagai satu identitas pengguna.

Contoh:

```text
user@email.com
       │
       ├── Email/Password
       │
       └── Google OAuth
```

Sistem tidak boleh membuat dua akun berbeda hanya karena metode login berbeda.

---

## 6.5 Email Verification

Registrasi menggunakan email dapat menggunakan verifikasi email.

Status:

```text
UNVERIFIED
     ↓
Email Verification
     ↓
VERIFIED
```

---

## 6.6 Forgot Password

Peserta dapat melakukan:

```text
Forgot Password
      ↓
Input Email
      ↓
Reset Link
      ↓
New Password
```

---

# 7. CORE MODULES

Struktur modul MVP:

```text
TRYOUT PLATFORM
│
├── Authentication
│
├── User Management
│
├── Participant
│
├── Question Bank
│
├── Question
│
├── Tryout
│
├── Exam Session
│
├── Answer
│
├── Scoring
│
├── Result
│
├── Discussion
│
└── Analytics
```

---

# 8. PARTICIPANT MODULE

## 8.1 Dashboard

Dashboard menampilkan:

* sapaan peserta;
* tryout tersedia;
* tryout yang sedang berlangsung;
* tryout yang sudah dikerjakan;
* nilai terbaru;
* perkembangan nilai.

Contoh:

```text
Halo, Ahmad 👋

Tryout Tersedia
────────────────────────

Sosiologi Tryout #01
40 Soal • 60 Menit

[ MULAI ]

────────────────────────

Nilai Terakhir

Sosiologi          82
Bahasa Indonesia   78
Matematika         75
```

---

# 9. QUESTION BANK

Guru dapat menyimpan soal ke dalam bank soal.

Setiap soal memiliki metadata:

```text
Question
├── Subject
├── Grade
├── Chapter / Topic
├── Difficulty
├── Question Type
├── Question Text
├── Options
├── Correct Answer
├── Explanation
└── Status
```

Contoh tingkat kesulitan:

```text
EASY
MEDIUM
HARD
```

---

# 10. QUESTION TYPE — MVP

MVP difokuskan pada:

### Pilihan Ganda

Lima opsi:

```text
A
B
C
D
E
```

Sistem menyimpan satu jawaban benar.

Tipe soal lain dapat ditambahkan pada versi berikutnya.

---

# 11. TRYOUT MODULE

Guru dapat membuat paket tryout.

Data:

```text
Tryout
├── Title
├── Description
├── Subject
├── Grade
├── Duration
├── Start Date
├── End Date
├── Question List
├── Passing Score
└── Status
```

Status:

```text
DRAFT
PUBLISHED
ONGOING
CLOSED
ARCHIVED
```

---

# 12. EXAM SESSION

Ketika peserta menekan:

> MULAI TRYOUT

sistem membuat sebuah exam session.

Contoh:

```text
Exam Session
├── participant_id
├── tryout_id
├── started_at
├── submitted_at
├── expires_at
├── status
└── score
```

Status:

```text
NOT_STARTED
IN_PROGRESS
SUBMITTED
EXPIRED
```

---

# 13. TIMER

Timer berjalan berdasarkan waktu server.

Contoh:

```text
TRYOUT SOSIOLOGI

Soal 12 / 40

Waktu tersisa
00:42:18
```

Ketika waktu habis:

```text
Timer = 00:00:00
       ↓
Automatic Submit
```

Server tetap menjadi sumber waktu utama agar timer tidak hanya bergantung pada JavaScript browser.

---

# 14. ANSWER NAVIGATION

Peserta dapat melihat nomor soal:

```text
01  02  03  04  05
06  07  08  09  10
11  12  13  14  15
...
```

Status visual:

```text
[✓] Sudah dijawab

[ ] Belum dijawab

[★] Ditandai untuk ditinjau

[●] Soal aktif
```

Peserta dapat menandai soal untuk ditinjau kembali.

---

# 15. RESULT & SCORING

Setelah tryout selesai:

```text
HASIL TRYOUT

Sosiologi Tryout #01

Nilai
82.5

Benar       33
Salah        7
Kosong       0

Waktu
47 menit
```

Sistem menyimpan:

* jumlah benar;
* jumlah salah;
* jumlah kosong;
* nilai;
* waktu pengerjaan;
* waktu submit.

---

# 16. DISCUSSION

Peserta dapat melihat pembahasan setelah tryout selesai sesuai pengaturan tryout.

Contoh:

```text
SOAL 03

Jawaban Anda:
B

Jawaban benar:
C

Status:
✗ Salah

Pembahasan:
Konflik sosial merupakan ...
```

Guru dapat menentukan apakah pembahasan:

* langsung tersedia setelah submit;
* tersedia setelah tryout ditutup;
* tidak ditampilkan.

---

# 17. RESULT ANALYTICS

Hasil tidak hanya berdasarkan nilai akhir.

Sistem dapat mengelompokkan soal berdasarkan materi.

Contoh:

| Materi           | Benar | Total | Persentase |
| ---------------- | ----: | ----: | ---------: |
| Identitas Sosial |     8 |    10 |        80% |
| Kelompok Sosial  |     7 |    10 |        70% |
| Konflik Sosial   |     9 |    10 |        90% |
| Perubahan Sosial |     6 |    10 |        60% |

Tujuan:

> membantu peserta dan guru mengetahui materi yang perlu dipelajari kembali.

---

# 18. HISTORY

Peserta dapat melihat riwayat:

```text
RIWAYAT TRYOUT

Sosiologi #01
82.5
01 Oktober 2026

Bahasa Indonesia #01
78
28 September 2026

Matematika #01
75
25 September 2026
```

---

# 19. PROGRESS

Sistem dapat menampilkan perkembangan nilai peserta.

Contoh:

```text
Tryout 01 → 68
Tryout 02 → 74
Tryout 03 → 81
Tryout 04 → 86
```

Tujuan utama fitur ini adalah menunjukkan perkembangan belajar pribadi peserta.

---

# 20. TEACHER DASHBOARD

Dashboard guru:

```text
Dashboard Guru

Total Soal        325
Total Tryout       18
Total Peserta     246

Tryout Aktif
────────────────────
Sosiologi #03
Peserta: 87

Bahasa Indonesia #02
Peserta: 64
```

---

# 21. ADMIN DASHBOARD

Dashboard admin:

```text
Dashboard Admin

Users
├── Peserta : 1.245
├── Guru    : 38
└── Admin   : 3

Tryout       : 126
Questions    : 4.820
Schools      : 24
```

---

# 22. SCHOOL MANAGEMENT

Admin dapat mengelola sekolah.

Data:

```text
School
├── ID
├── Name
├── NPSN
├── Address
├── City
├── Province
└── Status
```

Peserta dapat dikaitkan dengan sekolah.

---

# 23. SECURITY REQUIREMENTS

Keamanan merupakan bagian dari desain sejak awal.

## Authentication

* password disimpan menggunakan hashing;
* session/token harus aman;
* Google OAuth menggunakan OAuth 2.0/OpenID Connect;
* email verification;
* password reset menggunakan token terbatas waktu.

## Authorization

Setiap endpoint harus memeriksa role.

Contoh:

```text
PESERTA
→ tidak boleh mengubah bank soal

GURU
→ tidak boleh mengelola system settings

ADMIN
→ memiliki akses administrasi
```

## Exam Security

* jawaban disimpan di server;
* waktu menggunakan server;
* peserta tidak dapat mengubah kunci jawaban melalui browser;
* nilai dihitung server;
* endpoint exam harus dilindungi authorization;
* satu session memiliki status yang jelas.

---

# 24. NON-FUNCTIONAL REQUIREMENTS

## Performance

Target awal:

* halaman utama cepat dibuka;
* API responsif;
* mampu menangani banyak peserta secara bersamaan sesuai kapasitas VPS.

## Reliability

* data jawaban harus tersimpan secara berkala;
* submit harus idempotent;
* hasil tidak boleh hilang ketika browser mengalami refresh.

## Scalability

Arsitektur harus memungkinkan penambahan:

* Redis;
* queue;
* object storage;
* AI service;
* notification service;

tanpa perlu mengubah keseluruhan aplikasi.

---

# 25. MVP SCOPE

## WAJIB MVP

```text
✓ Authentication
✓ Email Registration
✓ Email Login
✓ Google Login
✓ Account Linking
✓ Email Verification
✓ Forgot Password

✓ User Management
✓ Role Management

✓ Question Bank
✓ CRUD Question
✓ Multiple Choice

✓ CRUD Tryout
✓ Tryout Configuration
✓ Timer
✓ Exam Session
✓ Answer Saving
✓ Auto Submit
✓ Scoring

✓ Result
✓ Discussion
✓ History
✓ Basic Analytics
```

---

# 26. OUT OF SCOPE MVP

Fitur berikut sengaja ditunda:

```text
○ AI Question Generator
○ AI Tutor
○ Essay Scoring
○ Payment
○ Subscription
○ WhatsApp Notification
○ Mobile Application
○ Proctoring
○ Face Recognition
○ Anti-Cheat tingkat lanjut
○ Live Exam Monitoring
○ Ranking nasional
○ Marketplace soal
```

Fitur tersebut dapat dimasukkan setelah core system stabil.

---

# 27. FUTURE DEVELOPMENT

Roadmap pengembangan:

## Phase 1 — MVP

```text
Auth
↓
Question Bank
↓
Tryout
↓
Exam
↓
Scoring
↓
Result
```

## Phase 2 — Assessment

```text
Analytics
↓
Topic Mastery
↓
Learning Recommendation
↓
Advanced Reports
```

## Phase 3 — AI

```text
Materi
↓
AI Question Generator
↓
Teacher Review
↓
Question Bank
↓
Tryout
```

## Phase 4 — Platform

```text
School Management
+
Multi Teacher
+
Multi School
+
Advanced Analytics
```

---

# 28. CORE USER FLOW

## Peserta Baru

```text
Landing Page
     ↓
Register
     ↓
Email Verification
     ↓
Complete Profile
     ↓
Dashboard
```

atau:

```text
Landing Page
     ↓
Continue with Google
     ↓
Account Linking / Create Account
     ↓
Complete Profile
     ↓
Dashboard
```

---

# 29. TRYOUT FLOW

```text
Dashboard
     ↓
Pilih Tryout
     ↓
Detail Tryout
     ↓
Mulai
     ↓
Exam Session Created
     ↓
Kerjakan Soal
     ↓
Simpan Jawaban
     ↓
Review
     ↓
Submit
     ↓
Server Scoring
     ↓
Result
     ↓
Discussion
     ↓
Analytics
```

---

# 30. PRODUCT PRINCIPLES

Pengembangan aplikasi mengikuti prinsip:

### Simple

Fitur tidak dibuat rumit jika kebutuhan dapat diselesaikan dengan cara sederhana.

### Reliable

Nilai, jawaban, dan waktu ujian harus dapat dipercaya.

### Secure

Data peserta dan hasil ujian harus dilindungi.

### Modular

Setiap modul dapat dikembangkan tanpa merusak modul lainnya.

### Teacher Friendly

Guru tidak membutuhkan kemampuan teknis untuk membuat tryout.

### Student Friendly

Peserta dapat langsung memahami cara menggunakan aplikasi.

### Scalable

Struktur aplikasi memungkinkan pengembangan menjadi platform assessment yang lebih besar.

---

# 31. DEFINITION OF MVP DONE

MVP dianggap selesai apabila:

* [ ] Peserta dapat registrasi menggunakan email.
* [ ] Peserta dapat login menggunakan email/password.
* [ ] Peserta dapat login menggunakan Google.
* [ ] Account linking berjalan dengan benar.
* [ ] Peserta dapat mengelola profil.
* [ ] Guru dapat membuat soal.
* [ ] Guru dapat membuat tryout.
* [ ] Guru dapat memilih soal.
* [ ] Peserta dapat mengikuti tryout.
* [ ] Timer berjalan.
* [ ] Jawaban tersimpan.
* [ ] Tryout dapat otomatis submit ketika waktu habis.
* [ ] Sistem menghitung nilai.
* [ ] Peserta dapat melihat hasil.
* [ ] Peserta dapat melihat pembahasan.
* [ ] Peserta dapat melihat riwayat.
* [ ] Guru dapat melihat hasil peserta.
* [ ] Admin dapat mengelola pengguna.
* [ ] Role dan authorization berjalan.
* [ ] Database dapat di-backup.
* [ ] Aplikasi dapat dideploy ke VPS.

---

# 32. NEXT BLUEPRINT

Setelah Blueprint 00 ini, dokumen berikutnya adalah:

```text
01 — Software Requirements Specification (SRS)
02 — Technical Architecture Document (TAD)
03 — Database Design + ERD
04 — API Specification
05 — UI/UX Specification
06 — Authentication & Security Specification
07 — Exam Engine Specification
08 — Analytics Specification
09 — OpenCode Development Prompt Library
```

Blueprint berikutnya yang paling penting adalah **Blueprint 01 — SRS**, karena akan menerjemahkan kebutuhan produk di atas menjadi requirement yang lebih detail dan dapat langsung dijadikan acuan implementasi.

