### 💡 Konsep awal: “TryoutKu”

Aplikasi web untuk siswa mengerjakan tryout secara mandiri, mendapatkan skor otomatis, melihat pembahasan, dan memantau perkembangan hasil belajar.

**Alur siswa:**

> Login → Pilih Tryout → Kerjakan Soal → Review → Submit → Nilai → Pembahasan → Analisis Hasil

### 1. 👨‍🎓 Sisi Siswa

Fitur utama:

* Dashboard siswa
* Daftar tryout tersedia
* Pilih paket tryout
* Informasi:

  * jumlah soal
  * durasi
  * mata pelajaran
  * tingkat kesulitan
* Halaman pengerjaan soal
* Navigasi nomor soal
* Tandai soal untuk ditinjau
* Timer otomatis
* Simpan jawaban
* Submit tryout
* Nilai otomatis
* Pembahasan setiap soal
* Riwayat tryout
* Grafik perkembangan nilai

Contohnya:

```text
┌─────────────────────────────────┐
│ TRYOUT BAHASA INDONESIA         │
│                                 │
│ Soal 12 / 40          42:18     │
│                                 │
│ Bacalah teks berikut...         │
│                                 │
│ ○ A. ...                        │
│ ○ B. ...                        │
│ ● C. ...                        │
│ ○ D. ...                        │
│ ○ E. ...                        │
│                                 │
│ [← Sebelumnya] [Tandai] [Lanjut →] │
└─────────────────────────────────┘
```

### 2. 👨‍🏫 Sisi Admin/Guru

Guru tidak perlu membuat soal satu per satu kalau kita buat fitur **import soal**.

Misalnya:

**Tambah Tryout**

```text
Nama       : Tryout Sosiologi 01
Mapel      : Sosiologi
Kelas      : X
Durasi     : 60 menit
Jumlah soal: 40
Status     : Aktif
```

Kemudian soal bisa dimasukkan melalui:

* Form manual
* Excel
* Word
* JSON
* Copy-paste

Untuk MVP saya justru menyarankan **Excel + manual** terlebih dahulu.

---

### 3. 📊 Hasil Tryout

Setelah selesai:

```text
HASIL TRYOUT

Sosiologi – Paket 01

Nilai
     82.5

Benar       33
Salah        7
Kosong       0

Waktu
     47 menit

──────────────────
Pembahasan Soal
──────────────────

01 ✓ Benar
02 ✓ Benar
03 ✗ Salah
04 ✓ Benar
...
```

Kemudian siswa bisa melihat **analisis berdasarkan materi**.

Misalnya:

| Materi           | Benar | Persentase |
| ---------------- | ----: | ---------: |
| Identitas Sosial |  8/10 |        80% |
| Kelompok Sosial  |  7/10 |        70% |
| Konflik Sosial   |  9/10 |        90% |
| Perubahan Sosial |  6/10 |        60% |

Ini membuat aplikasi tidak hanya menjadi **“mesin ujian”**, tetapi mulai menjadi **alat diagnostik belajar**.

---

## 4. 🔥 Fitur yang menurut saya menarik untuk dikembangkan

Setelah MVP berjalan, kita bisa menambahkan:

### Bank Soal

Guru mempunyai bank soal:

```text
Bank Soal
├── Bahasa Indonesia
├── Bahasa Inggris
├── Matematika
├── Sosiologi
├── Al-Qur'an Hadits
└── ...
```

Setiap soal memiliki metadata:

```text
Soal
├── Mata Pelajaran
├── Kelas
├── Bab/Materi
├── Kompetensi
├── Tingkat Kesulitan
├── Tipe Soal
├── Pertanyaan
├── Opsi
├── Kunci
└── Pembahasan
```

Dengan demikian satu soal bisa digunakan kembali pada beberapa tryout.

---

## 5. 🤖 AI bisa dimasukkan, tetapi jangan menjadi inti MVP

Karena Anda juga sedang mengembangkan konsep pembelajaran berbasis AI, kita bisa menambahkan AI setelah sistem dasarnya stabil.

Contohnya:

**“Jelaskan kesalahan saya.”**

Siswa salah menjawab:

> Mengapa jawaban saya salah?

AI menjelaskan berdasarkan **kunci dan pembahasan yang diberikan guru**, bukan membuat jawaban bebas.

Bisa juga:

> **AI Tutor**
>
> “Saya lemah pada materi Konflik Sosial. Apa yang harus saya pelajari?”

AI memberikan rekomendasi materi berdasarkan hasil tryout.

---

# 6. 🏆 Bisa dibuat sistem ranking, tetapi opsional

Untuk lingkungan sekolah:

```text
Peringkat Tryout
🥇 Ahmad      92.5
🥈 Budi       90.0
🥉 Citra      88.5
```

Namun saya menyarankan **jangan menjadikan ranking sebagai inti**. Lebih menarik jika ada:

* skor pribadi
* perkembangan dari tryout sebelumnya
* target nilai
* mastery materi

Misalnya:

> Tryout 01 → 68
> Tryout 02 → 74
> Tryout 03 → 81
> Tryout 04 → 86

Siswa dapat melihat perkembangan dirinya sendiri.

---

# 7. 🏗️ Struktur aplikasinya

Kalau nantinya Anda ingin membangunnya sendiri dengan **vibe code + VPS**, kita bisa membuat arsitektur sederhana seperti:

```text
                    TRYOUT APP
                        │
          ┌─────────────┴─────────────┐
          │                           │
       SISWA                         ADMIN
          │                           │
   ┌──────┴──────┐             ┌──────┴──────┐
   │             │             │             │
Tryout       Hasil         Bank Soal      Peserta
   │             │             │             │
   └──────┬──────┘             └──────┬──────┘
          │                           │
          └───────────┬───────────────┘
                      │
                   DATABASE
```

Untuk teknologi, kita bisa menggunakan stack yang relatif mudah dipelihara:

**Frontend**

* Next.js
* Tailwind CSS

**Backend**

* Laravel atau Next.js API

**Database**

* PostgreSQL

**Authentication**

* Role-based authentication

**Deployment**

* VPS
* Docker
* Nginx
* SSL

---

# 8. 🚀 Tetapi saya punya satu pengembangan yang lebih menarik

Karena Anda sebelumnya juga memiliki ide **AI soal generator**, kedua aplikasi ini sebenarnya bisa disatukan.

Bukan hanya:

> **Aplikasi Tryout**

tetapi:

> ### **AI Tryout & Assessment Platform**

Alurnya:

```text
                     ┌───────────────┐
                     │   BANK SOAL   │
                     └───────┬───────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
       ┌──────▼──────┐               ┌──────▼──────┐
       │   TRYOUT    │               │ AI GENERATOR│
       └──────┬──────┘               └──────┬──────┘
              │                             │
              └──────────────┬──────────────┘
                             │
                       ┌─────▼─────┐
                       │   SISWA   │
                       └─────┬─────┘
                             │
                       ┌─────▼─────┐
                       │   HASIL   │
                       └─────┬─────┘
                             │
                 ┌───────────┼───────────┐
                 │           │           │
             Nilai       Analisis     AI Tutor
```

Jadi guru dapat:

**Upload materi → AI membantu membuat soal → guru review → masukkan ke bank soal → buat tryout → siswa mengerjakan → sistem menganalisis hasil.**

Ini menurut saya jauh lebih potensial daripada sekadar aplikasi ujian.

==================================================================================================================================================


### 🔐 Sistem autentikasi peserta

Kita bisa membuat dua pilihan:

```text
             ┌─────────────────────┐
             │     LOGIN SISWA     │
             └──────────┬──────────┘
                        │
             ┌──────────┴──────────┐
             │                     │
       ┌─────▼─────┐       ┌──────▼──────┐
       │   EMAIL   │       │ GOOGLE LOGIN │
       └─────┬─────┘       └──────┬──────┘
             │                     │
        Email + Password       Google OAuth
             │                     │
             └──────────┬──────────┘
                        │
                  ┌─────▼─────┐
                  │  PESERTA   │
                  │  DASHBOARD  │
                  └────────────┘
```

## 1. 📝 Registrasi dengan Email

Form:

**Daftar Akun Peserta**

* Nama lengkap *
* Email *
* Password *
* Konfirmasi password *
* Nomor HP — opsional
* Asal sekolah — opsional
* Kelas — opsional
* Checkbox persetujuan

Tombol:

> **Daftar**

dan:

> **Sudah punya akun? Login**

Setelah registrasi, email dapat diverifikasi sebelum peserta mengikuti tryout.

---

## 2. 🔵 Login dengan Google

Pada halaman login:

> **Lanjutkan dengan Google**

Peserta tidak perlu membuat password sendiri.

Google memberikan informasi dasar seperti:

* nama
* email
* foto profil

Kemudian sistem membuat/menghubungkan akun peserta.

---

## 3. 🔗 Email dan Google harus bisa menjadi satu akun

Ini penting.

Misalnya siswa pertama kali masuk menggunakan:

```text
Google
↓
nama@email.com
↓
Akun peserta dibuat
```

Kemudian suatu saat login menggunakan email/password dengan alamat yang sama.

Sistem sebaiknya **tidak membuat akun kedua**, tetapi menghubungkannya ke akun yang sama.

Struktur konsepnya:

```text
USER
├── id
├── name
├── email
├── password
├── avatar
├── email_verified_at
├── school
├── class
├── role
└── created_at

AUTH PROVIDERS
├── user_id
├── provider
├── provider_id
└── created_at
```

Provider dapat berupa:

```text
email
google
```

---

# 4. 👨‍🎓 Setelah login

Peserta masuk ke:

### Dashboard

```text
Halo, Ahmad 👋

Tryout Saya
────────────────────

[ Tryout Sosiologi #01 ]
40 Soal • 60 Menit
Belum dikerjakan

[ MULAI ]

────────────────────

Riwayat

Sosiologi #00    78
Bahasa Indonesia #01    82
Matematika #01    75
```

---

# 5. 👤 Profil Peserta

Tambahkan menu:

**Profil Saya**

```text
Foto Profil

Nama
Ahmad Fauzi

Email
ahmad@gmail.com

Sekolah
MAN 3 Ngawi

Kelas
X

No. HP
08xxxxxxxxxx

[ Simpan Perubahan ]
```

Data sekolah dan kelas bisa dibuat **opsional**, karena aplikasi nantinya mungkin digunakan oleh siswa dari berbagai sekolah.

---

# 6. 🛡️ Admin juga memiliki login berbeda

Saya menyarankan role:

```text
USER
│
├── ADMIN
│
├── GURU
│
└── PESERTA
```

### Admin

Mengelola:

* pengguna
* sekolah
* tryout
* bank soal
* kategori
* hasil
* pengaturan

### Guru

Mengelola:

* bank soal
* soal
* pembahasan
* tryout
* analisis hasil

### Peserta

Mengakses:

* tryout
* hasil
* pembahasan
* riwayat
* profil

---

## 7. 🔑 Lupa Password

Karena ada login email, kita juga perlu:

> **Lupa password?**

Alurnya:

```text
Masukkan email
       ↓
Kirim email reset password
       ↓
Klik link
       ↓
Password baru
       ↓
Login
```

---

## 8. Saya akan memasukkan ini ke rancangan MVP

Dengan tambahan autentikasi, modul utama aplikasinya menjadi:

```text
TRYOUT PLATFORM
│
├── 🔐 Authentication
│   ├── Register Email
│   ├── Login Email
│   ├── Google Login
│   ├── Email Verification
│   ├── Forgot Password
│   └── Logout
│
├── 👨‍🎓 Peserta
│   ├── Dashboard
│   ├── Tryout
│   ├── Hasil
│   ├── Riwayat
│   └── Profil
│
├── 👨‍🏫 Guru
│   ├── Bank Soal
│   ├── Soal
│   ├── Pembahasan
│   └── Tryout
│
├── 👨‍💼 Admin
│   ├── Pengguna
│   ├── Sekolah
│   ├── Tryout
│   └── Pengaturan
│
└── 📊 Analytics
    ├── Nilai
    ├── Analisis Materi
    └── Progress Peserta
```

**Satu hal yang saya sarankan:** untuk versi awal, jangan langsung membuat login Google sebagai sistem yang terpisah. Gunakan **OAuth Google + email/password dengan account linking**, sehingga satu siswa tetap memiliki satu identitas akun.

Kalau kita lanjut menyusun blueprint, bagian autentikasi ini bisa langsung saya masukkan ke **PRD + ERD + User Flow**, .

===================================================================================================================================================================================================


