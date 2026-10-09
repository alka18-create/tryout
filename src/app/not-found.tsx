import React from "react";
import Link from "next/link";
import { Compass, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div
      suppressHydrationWarning
      className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6 selection:bg-blue-600 selection:text-white relative overflow-hidden"
    >
      {/* Background glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-100/50 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg w-full text-center space-y-8 p-8 sm:p-10 rounded-3xl bg-white border border-slate-200/90 shadow-xl shadow-slate-200/50">
        {/* Animated Badge & Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
              <Compass className="w-10 h-10 animate-spin-slow" />
            </div>
            <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-xs">
              404
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
            Halaman Tidak Ditemukan
          </h1>
          <p className="text-sm sm:text-base text-slate-500 leading-relaxed">
            Maaf, tautan atau halaman yang Anda cari mungkin telah dipindahkan, dihapus, atau tidak pernah ada.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href="/dashboard/student"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-all shadow-md shadow-blue-600/25 active:scale-95"
          >
            <Home className="w-4 h-4" />
            Ke Dashboard
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium text-sm transition-all shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            Halaman Beranda
          </Link>
        </div>

        <p className="text-xs text-slate-400">
          TryoutKu Platform &bull; Portal Tryout & Asesmen Mandiri
        </p>
      </div>
    </div>
  );
}
