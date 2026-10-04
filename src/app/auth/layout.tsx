import React from "react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      suppressHydrationWarning
      className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-between text-slate-100 antialiased selection:bg-indigo-500 selection:text-white"
    >
      {/* Header mini */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-400 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
            TK
          </div>
          <span className="font-extrabold text-xl tracking-tight text-white group-hover:text-indigo-300 transition-colors">
            Tryout<span className="text-indigo-400">Ku</span>
          </span>
        </Link>
        <Link
          href="/"
          className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
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
