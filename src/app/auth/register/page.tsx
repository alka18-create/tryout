"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    schoolName: "",
    schoolClass: "",
    phone: "",
    agree: true,
  });

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

    if (!formData.agree) {
      setErrorMsg("Anda harus menyetujui ketentuan penggunaan.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMsg("Konfirmasi password tidak cocok.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error?.message || "Gagal melakukan pendaftaran. Silakan periksa data Anda.");
        setIsLoading(false);
        return;
      }

      setSuccessMsg("Pendaftaran akun berhasil! Mengalihkan ke halaman login...");
      setTimeout(() => {
        router.push("/auth/login");
      }, 1500);
    } catch {
      setErrorMsg("Terjadi gangguan jaringan saat mendaftar. Silakan coba lagi.");
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div
        suppressHydrationWarning
        className="bg-white border border-slate-200/90 rounded-2xl p-7 shadow-xl shadow-slate-200/50 min-h-[500px] flex flex-col items-center justify-center space-y-4"
      >
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500">Menyiapkan formulir pendaftaran...</p>
      </div>
    );
  }

  return (
    <div
      suppressHydrationWarning
      className="bg-white border border-slate-200/90 rounded-2xl p-7 shadow-xl shadow-slate-200/50"
    >
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Daftar Akun Peserta</h1>
        <p className="text-sm text-slate-500 mt-1">
          Ikuti tryout, evaluasi kemampuan materi, dan pantau perkembangan belajar
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Nama Lengkap <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ahmad Fauzi"
            className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900 placeholder-slate-400 text-sm outline-none transition-all shadow-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Email <span className="text-rose-500">*</span>
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="nama@email.com"
            className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900 placeholder-slate-400 text-sm outline-none transition-all shadow-xs"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Password <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900 placeholder-slate-400 text-sm outline-none transition-all shadow-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Konfirmasi <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900 placeholder-slate-400 text-sm outline-none transition-all shadow-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Asal Sekolah (Opsional)
            </label>
            <input
              type="text"
              value={formData.schoolName}
              onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
              placeholder="SMA Negeri 1"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900 placeholder-slate-400 text-sm outline-none transition-all shadow-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Kelas (Opsional)
            </label>
            <input
              type="text"
              value={formData.schoolClass}
              onChange={(e) => setFormData({ ...formData, schoolClass: e.target.value })}
              placeholder="XII IPS 1"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900 placeholder-slate-400 text-sm outline-none transition-all shadow-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
            No. WhatsApp / HP (Opsional)
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="08123456789"
            className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900 placeholder-slate-400 text-sm outline-none transition-all shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="agree"
            checked={formData.agree}
            onChange={(e) => setFormData({ ...formData, agree: e.target.checked })}
            className="w-4 h-4 rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          <label htmlFor="agree" className="text-xs text-slate-600 cursor-pointer">
            Saya menyetujui ketentuan dan kebijakan privasi TryoutKu
          </label>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Mendaftarkan Akun...</span>
            </>
          ) : (
            <span>Buat Akun Peserta</span>
          )}
        </button>
      </form>

      <div className="mt-6 text-center text-xs text-slate-500">
        Sudah memiliki akun?{" "}
        <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 font-semibold underline underline-offset-4">
          Masuk di sini
        </Link>
      </div>
    </div>
  );
}
