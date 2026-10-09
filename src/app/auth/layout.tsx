import React from "react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      suppressHydrationWarning
      className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-900 antialiased selection:bg-blue-600 selection:text-white relative overflow-hidden"
    >
      {/* Background Soft Glow Orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-blue-100/60 via-indigo-50/30 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Header mini */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
            TK
          </div>
          <span className="font-extrabold text-xl tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
            Tryout<span className="text-blue-600">Ku</span>
          </span>
        </Link>
        <Link
          href="/"
          className="text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          ← Kembali ke Beranda
        </Link>
      </header>

      {/* Konten Halaman */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div suppressHydrationWarning className="w-full max-w-md">
          {children}
        </div>
      </main>

      {/* Footer mini */}
      <footer
        suppressHydrationWarning
        className="w-full max-w-7xl mx-auto px-6 py-6 text-center text-xs text-slate-500"
      >
        &copy; {new Date().getFullYear()} TryoutKu Platform. Hak cipta dilindungi undang-undang.
      </footer>
    </div>
  );
}
