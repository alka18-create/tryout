import Link from "next/link";
import { auth } from "@/auth";
import {
  BookOpen,
  Clock,
  BarChart3,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  GraduationCap,
  Users,
} from "lucide-react";

export default async function HomePage() {
  const session = await auth();
  const user = session?.user;

  const dashboardUrl =
    user?.role === "ADMIN"
      ? "/dashboard/admin"
      : user?.role === "TEACHER"
        ? "/dashboard/teacher"
        : "/dashboard/student";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background Glow Orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-indigo-600/20 via-violet-600/10 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 -left-48 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/2 -right-48 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/70 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-500 flex items-center justify-center font-black text-white shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              TK
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl tracking-tight leading-none text-white">
                Tryout<span className="text-indigo-400">Ku</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase mt-0.5">
                Assessment Platform
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 hidden sm:inline-block">
                  Masuk sebagai <strong className="text-white">{user.name}</strong> ({user.role})
                </span>
                <Link
                  href={dashboardUrl}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold text-xs shadow-md shadow-indigo-500/20 flex items-center gap-1.5 transition-all"
                >
                  Buka Dashboard
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link
                  href="/auth/login"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all border border-transparent hover:border-slate-800"
                >
                  Masuk
                </Link>
                <Link
                  href="/auth/register"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold text-xs shadow-md shadow-indigo-500/25 transition-all active:scale-[0.98]"
                >
                  Daftar Peserta
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 max-w-7xl mx-auto px-6 pt-16 pb-20 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-semibold mb-6 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Platform Tryout Digital & Evaluasi Diagnostik Materi</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.15] mb-6">
          Bukan Sekadar Ujian. Temukan{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-300 to-indigo-200">
            Kelemahan & Keunggulan
          </span>{" "}
          Belajar Anda.
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed mb-9">
          TryoutKu membantu peserta tidak hanya melihat skor akhir, tetapi memahami tingkat penguasaan
          per materi, pembahasan soal komprehensif, dan grafik kemajuan belajar terukur.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3.5 mb-16">
          <Link
            href={user ? dashboardUrl : "/auth/register"}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold text-sm shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            {user ? "Lanjutkan Belajar di Dashboard" : "Mulai Tryout Gratis Sekarang"}
            <ArrowRight className="w-4 h-4" />
          </Link>

          {!user && (
            <Link
              href="/auth/login"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-slate-700/80 bg-slate-900/60 hover:bg-slate-800 text-slate-200 font-semibold text-sm transition-all"
            >
              Coba Akun Demo (1-Klik)
            </Link>
          )}
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full text-left">
          <div className="p-6 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm hover:border-slate-700 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 mb-5 group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Timer Otoritas Server</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Waktu ujian dihitung dari server, anti-manipulasi jam klien, dengan autosave real-time
              dan auto-submit ketika durasi berakhir.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm hover:border-slate-700 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/25 flex items-center justify-center text-violet-400 mb-5 group-hover:scale-110 transition-transform">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Diagnostik per Materi</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Menganalisis bab yang sudah dikuasai dan bab yang butuh belajar ulang. Tryout berfungsi
              sebagai panduan diagnostik belajar mandiri.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm hover:border-slate-700 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 mb-5 group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Pembahasan & Bank Soal</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Setiap soal dilengkapi kunci jawaban dan teks pembahasan terperinci. Guru dapat mengelola
              bank soal dan membuat paket tryout modular.
            </p>
          </div>
        </div>

        {/* Live Preview Box */}
        <div className="mt-14 w-full p-6 sm:p-8 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-6 text-left">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Paket Tersedia
                </span>
                <span className="text-xs text-slate-400">Sosiologi SMA</span>
              </div>
              <h3 className="text-xl font-bold text-white mt-1">Tryout Sosiologi Paket 01</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                20 Soal Pilihan Ganda (A-E) • 60 Menit • Materi: Identitas, Kelompok, Konflik & Perubahan
              </p>
            </div>
          </div>

          <Link
            href={user ? "/dashboard/student" : "/auth/login"}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20 shrink-0"
          >
            Kerjakan Paket Ini
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-[10px]">
              TK
            </div>
            <span>&copy; {new Date().getFullYear()} TryoutKu Platform. Dibuat untuk evaluasi pendidikan efektif.</span>
          </div>

          <div className="flex items-center gap-5 text-slate-400">
            <Link href="/auth/login" className="hover:text-white transition-colors">
              Masuk
            </Link>
            <Link href="/auth/register" className="hover:text-white transition-colors">
              Pendaftaran
            </Link>
            <span>v0.1.0 (MVP)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
