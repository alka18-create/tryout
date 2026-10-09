"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [mounted, setMounted] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!token) {
      setErrorMsg("Token reset password tidak ditemukan.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Konfirmasi password baru tidak cocok.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error?.message || "Gagal memperbarui password.");
        setIsLoading(false);
        return;
      }

      setSuccessMsg("Password berhasil diperbarui! Mengalihkan ke halaman login...");
      setTimeout(() => {
        router.push("/auth/login");
      }, 1500);
    } catch {
      setErrorMsg("Terjadi gangguan jaringan. Silakan coba lagi.");
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div
        suppressHydrationWarning
        className="bg-white border border-slate-200/90 rounded-2xl p-7 shadow-xl shadow-slate-200/50 min-h-[420px] flex flex-col items-center justify-center space-y-4"
      >
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500">Menyiapkan formulir pembaruan...</p>
      </div>
    );
  }

  return (
    <div
      suppressHydrationWarning
      className="bg-white border border-slate-200/90 rounded-2xl p-7 shadow-xl shadow-slate-200/50"
    >
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Atur Ulang Password</h1>
        <p className="text-sm text-slate-500 mt-1">
          Masukkan kata sandi baru untuk mengamankan akun Anda
        </p>
      </div>

      {errorMsg && (
        <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
          <span className="font-bold">⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <span className="font-bold">✓</span>
          <span>{successMsg}</span>
        </div>
      )}

      {!token ? (
        <div className="text-center py-4">
          <p className="text-sm text-rose-600 mb-3 font-medium">Tautan tidak valid karena tidak menyertakan token verifikasi.</p>
          <Link
            href="/auth/forgot-password"
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
          >
            Minta Tautan Baru →
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Password Baru (Min. 6 Karakter)
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900 placeholder-slate-400 text-sm outline-none transition-all shadow-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Konfirmasi Password Baru
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
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
                <span>Menyimpan Password...</span>
              </>
            ) : (
              <span>Simpan Kata Sandi Baru</span>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div
          suppressHydrationWarning
          className="bg-white border border-slate-200/90 rounded-2xl p-7 text-center text-slate-500 text-sm shadow-xl shadow-slate-200/50"
        >
          Memuat formulir reset password...
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
