"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error ke monitoring / console
    console.error("[TryoutKu Error Boundary]:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 selection:bg-rose-500 selection:text-white">
      {/* Background glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-rose-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-600/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg w-full text-center space-y-8 p-8 sm:p-10 rounded-3xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-xl shadow-2xl shadow-rose-950/30">
        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-10 h-10 animate-bounce" />
            </div>
            <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
              500
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Terjadi Kesalahan
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Sistem mendeteksi kendala saat memproses halaman ini. Data Anda tetap aman. Silakan coba muat ulang atau kembali ke dashboard.
          </p>
          {error.digest && (
            <p className="text-xs font-mono text-slate-600 bg-slate-950/60 px-3 py-1.5 rounded-lg inline-block">
              ID Kode: {error.digest}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-sm transition-all shadow-lg shadow-rose-600/25 active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Coba Lagi
          </button>
          <Link
            href="/dashboard/student"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-slate-300 hover:text-white font-medium text-sm transition-all border border-slate-700/60 active:scale-95"
          >
            <Home className="w-4 h-4" />
            Ke Dashboard
          </Link>
        </div>

        <p className="text-xs text-slate-500">
          TryoutKu Platform &bull; Portal Tryout & Asesmen Mandiri
        </p>
      </div>
    </div>
  );
}
