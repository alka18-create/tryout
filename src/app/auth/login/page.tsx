"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard/student";

  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: email.trim().toLowerCase(),
        password,
      });

      if (res?.error) {
        setErrorMsg("Email atau password tidak sesuai.");
        setIsLoading(false);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setErrorMsg("Terjadi gangguan jaringan saat login. Silakan coba lagi.");
      setIsLoading(false);
    }
  };

  const handleDemoFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Password123!");
    setErrorMsg("");
  };

  if (!mounted) {
    return (
      <div
        suppressHydrationWarning
        className="bg-white border border-slate-200/90 rounded-2xl p-7 shadow-xl shadow-slate-200/50 min-h-[460px] flex flex-col items-center justify-center space-y-4"
      >
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500">Menyiapkan formulir masuk...</p>
      </div>
    );
  }

  return (
    <div
      suppressHydrationWarning
      className="bg-white border border-slate-200/90 rounded-2xl p-7 shadow-xl shadow-slate-200/50"
    >
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Selamat Datang Kembali</h1>
        <p className="text-sm text-slate-500 mt-1">
          Masuk ke akun TryoutKu untuk melanjutkan sesi belajar Anda
        </p>
      </div>

      {errorMsg && (
        <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
          <span className="font-bold">⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tombol Login Google */}
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl })}
        className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold flex items-center justify-center gap-3 transition-all hover:border-slate-300 shadow-xs"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path
            fill="#EA4335"
            d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
          />
          <path
            fill="#4285F4"
            d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
          />
          <path
            fill="#FBBC05"
            d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
          />
          <path
            fill="#34A853"
            d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
          />
        </svg>
        Lanjutkan dengan Google
      </button>

      <div className="relative my-6 text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200"></div>
        </div>
        <span className="relative px-3 text-xs uppercase tracking-wider text-slate-400 bg-white">
          atau dengan email
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Email
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

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Password
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              Lupa password?
            </Link>
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
              <span>Memproses Masuk...</span>
            </>
          ) : (
            <span>Masuk ke Akun</span>
          )}
        </button>
      </form>

      {/* Quick Demo Credentials untuk Pengujian */}
      <div className="mt-6 pt-5 border-t border-slate-200">
        <p className="text-[11px] font-medium text-slate-500 mb-2">⚡ Coba Akun Demo Cepat (1-Klik):</p>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => handleDemoFill("ahmad@tryoutku.com")}
            className="px-2 py-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 hover:border-blue-300 border border-slate-200 text-[11px] text-slate-700 transition-colors text-center font-medium shadow-xs"
          >
            👨‍🎓 Siswa
          </button>
          <button
            type="button"
            onClick={() => handleDemoFill("guru@tryoutku.com")}
            className="px-2 py-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 hover:border-blue-300 border border-slate-200 text-[11px] text-slate-700 transition-colors text-center font-medium shadow-xs"
          >
            👨‍🏫 Guru
          </button>
          <button
            type="button"
            onClick={() => handleDemoFill("admin@tryoutku.com")}
            className="px-2 py-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 hover:border-blue-300 border border-slate-200 text-[11px] text-slate-700 transition-colors text-center font-medium shadow-xs"
          >
            🛡️ Admin
          </button>
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-slate-500">
        Belum memiliki akun peserta?{" "}
        <Link href="/auth/register" className="text-blue-600 hover:text-blue-700 font-semibold underline underline-offset-4">
          Daftar sekarang
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          suppressHydrationWarning
          className="bg-white border border-slate-200/90 rounded-2xl p-7 text-center text-slate-500 text-sm shadow-xl shadow-slate-200/50"
        >
          Memuat formulir masuk...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
