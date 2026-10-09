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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6 selection:bg-rose-500 selection:text-white relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-rose-100/50 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-100/50 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg w-full text-center space-y-8 p-8 sm:p-10 rounded-3xl bg-white border border-slate-200/90 shadow-xl shadow-slate-200/50">
        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-xs">
              <AlertTriangle className="w-10 h-10 animate-bounce" />
            </div>
            <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-xs">
              500
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
            Terjadi Kesalahan
          </h1>
          <p className="text-sm sm:text-base text-slate-500 leading-relaxed">
            Sistem mendeteksi kendala saat memproses halaman ini. Data Anda tetap aman. Silakan coba muat ulang atau kembali ke dashboard.
          </p>
          {error.digest && (
            <p className="text-xs font-mono text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg inline-block border border-slate-200">
              ID Kode: {error.digest}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm transition-all shadow-md shadow-rose-600/25 active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Coba Lagi
          </button>
          <Link
            href="/dashboard/student"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium text-sm transition-all shadow-xs"
          >
            <Home className="w-4 h-4" />
            Ke Dashboard
          </Link>
        </div>

        <p className="text-xs text-slate-400">
          TryoutKu Platform &bull; Portal Tryout & Asesmen Mandiri
        </p>
      </div>
    </div>
  );
}
