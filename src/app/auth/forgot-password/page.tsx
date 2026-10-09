"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successData, setSuccessData] = useState<{ message: string; token?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessData(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error?.message || "Gagal memproses permintaan reset password.");
        setIsLoading(false);
        return;
      }

      setSuccessData(data.data);
      setIsLoading(false);
    } catch {
      setErrorMsg("Terjadi gangguan jaringan. Silakan coba lagi.");
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div
        suppressHydrationWarning
        className="bg-white border border-slate-200/90 rounded-2xl p-7 shadow-xl shadow-slate-200/50 min-h-[380px] flex flex-col items-center justify-center space-y-4"
      >
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500">Menyiapkan formulir pemulihan...</p>
      </div>
    );
  }

  return (
    <div
      suppressHydrationWarning
      className="bg-white border border-slate-200/90 rounded-2xl p-7 shadow-xl shadow-slate-200/50"
    >
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Lupa Password</h1>
        <p className="text-sm text-slate-500 mt-1">
          Masukkan email akun Anda untuk mendapatkan tautan pemulihan kata sandi
        </p>
      </div>

      {errorMsg && (
        <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
          <span className="font-bold">⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {successData ? (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
            <p className="font-semibold mb-1">✓ Instruksi Terkirim!</p>
            <p className="text-xs text-slate-600">{successData.message}</p>
          </div>

          {/* Helper khusus mode development */}
          {successData.token && (
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs">
              <span className="font-semibold text-blue-800">Mode Uji Coba (Dev):</span>
              <p className="text-slate-600 mt-1">Tautan reset password langsung:</p>
              <Link
                href={`/auth/reset-password?token=${successData.token}`}
                className="mt-2 inline-block px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors shadow-xs"
              >
                Buka Form Password Baru →
              </Link>
            </div>
          )}

          <div className="text-center pt-2">
            <Link
              href="/auth/login"
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
            >
              ← Kembali ke Halaman Login
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Akun
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900 placeholder-slate-400 text-sm outline-none transition-all shadow-xs"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Mengirim Tautan...</span>
              </>
            ) : (
              <span>Kirim Tautan Reset</span>
            )}
          </button>

          <div className="text-center pt-2">
            <Link
              href="/auth/login"
              className="text-xs text-slate-500 hover:text-slate-900 font-semibold transition-colors"
            >
              ← Ingat password? Masuk
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
