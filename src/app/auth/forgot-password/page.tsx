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
        className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-7 shadow-2xl shadow-black/50 min-h-[380px] flex flex-col items-center justify-center space-y-4"
      >
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400">Menyiapkan formulir pemulihan...</p>
      </div>
    );
  }

  return (
    <div
      suppressHydrationWarning
      className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-7 shadow-2xl shadow-black/50"
    >
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-white tracking-tight">Lupa Password</h1>
        <p className="text-sm text-slate-400 mt-1">
          Masukkan email akun Anda untuk mendapatkan tautan pemulihan kata sandi
        </p>
      </div>

      {errorMsg && (
        <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-sm flex items-center gap-2">
          <span className="font-bold">⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {successData ? (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-sm">
            <p className="font-semibold mb-1">✓ Instruksi Terkirim!</p>
            <p className="text-xs text-slate-300">{successData.message}</p>
          </div>

          {/* Helper khusus mode development */}
          {successData.token && (
            <div className="p-3.5 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-xs">
              <span className="font-semibold text-indigo-300">Mode Uji Coba (Dev):</span>
              <p className="text-slate-400 mt-1">Tautan reset password langsung:</p>
              <Link
                href={`/auth/reset-password?token=${successData.token}`}
                className="mt-2 inline-block px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
              >
                Buka Form Password Baru →
              </Link>
            </div>
          )}

          <div className="text-center pt-2">
            <Link
              href="/auth/login"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              ← Kembali ke Halaman Login
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Email Akun
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-100 placeholder-slate-500 text-sm outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              ← Ingat password? Masuk
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
