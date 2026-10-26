"use client";

import React, { useState, useEffect } from "react";
import { User, School, Lock, Save, CheckCircle2, AlertCircle, Phone, Mail, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface TeacherProfileData {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  school?: {
    id: string;
    name: string;
    city?: string | null;
  } | null;
  hasPassword?: boolean;
}

export default function TeacherProfilePage() {
  const [profile, setProfile] = useState<TeacherProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    schoolName: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/teacher/profile");
      const json = await res.json();
      if (json.success && json.data) {
        setProfile(json.data);
        setFormData((prev) => ({
          ...prev,
          name: json.data.name || "",
          phone: json.data.phone || "",
          schoolName: json.data.school?.name || "",
        }));
      }
    } catch {
      setFeedback({ type: "error", text: "Gagal memuat data profil pengajar." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      setFeedback({ type: "error", text: "Konfirmasi kata sandi baru tidak cocok." });
      return;
    }

    if (formData.newPassword && formData.newPassword.length < 6) {
      setFeedback({ type: "error", text: "Kata sandi baru minimal 6 karakter." });
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/teacher/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          schoolName: formData.schoolName,
          currentPassword: formData.currentPassword || undefined,
          newPassword: formData.newPassword || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setFeedback({
          type: "error",
          text: json.error?.message || "Gagal memperbarui profil guru.",
        });
        setIsSaving(false);
        return;
      }

      setFeedback({
        type: "success",
        text: "Data profil guru berhasil diperbarui!",
      });

      // Reset input password
      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));

      // Update state data
      if (json.data) {
        setProfile((prev) => (prev ? { ...prev, ...json.data } : null));
      }
    } catch {
      setFeedback({
        type: "error",
        text: "Terjadi kesalahan jaringan saat menyimpan data profil.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl space-y-6 mx-auto">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
        <Skeleton className="h-48 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-7 mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <User className="w-7 h-7 text-blue-600" />
            Pengaturan Profil Guru
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola data identitas pengajar, kontak, instansi sekolah, dan keamanan akun Anda.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1 font-bold bg-amber-50 text-amber-700 border-amber-200 rounded-xl">
            Tenaga Pendidik / Guru
          </Badge>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-semibold animate-in fade-in ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. INFORMASI DASAR GURU */}
        <Card className="rounded-3xl border-slate-200/90 shadow-xs bg-white">
          <CardHeader className="p-6 sm:p-7 border-b border-slate-100">
            <CardTitle className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2.5">
              <User className="w-5 h-5 text-blue-600" />
              Informasi Pribadi & Kontak
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-slate-500 mt-1">
              Data identitas nama lengkap dan kontak yang digunakan di platform tryout.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 sm:p-7 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Nama Lengkap */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-bold text-slate-700 block">
                  Nama Lengkap & Gelar <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Drs. Bambang Suryono, M.Pd"
                  required
                  className="rounded-xl text-sm"
                />
              </div>

              {/* Email (Readonly) */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  Alamat Email (Akun Utama)
                </label>
                <Input
                  value={profile?.email || ""}
                  disabled
                  className="bg-slate-50 text-slate-500 cursor-not-allowed rounded-xl text-sm"
                />
                <span className="text-[11px] text-slate-400 block">
                  Email akun tidak dapat diubah secara langsung demi keamanan data autentikasi.
                </span>
              </div>

              {/* No. WhatsApp / HP */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  Nomor WhatsApp / HP
                </label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Contoh: 08123456789"
                  className="rounded-xl text-sm"
                />
              </div>

              {/* Asal Sekolah / Instansi */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1.5">
                  <School className="w-3.5 h-3.5 text-slate-400" />
                  Asal Sekolah / Instansi Mengajar
                </label>
                <Input
                  value={formData.schoolName}
                  onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                  placeholder="Contoh: SMA Negeri 1 Jakarta"
                  className="rounded-xl text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. PENGATURAN KATA SANDI */}
        <Card className="rounded-3xl border-slate-200/90 shadow-xs bg-white">
          <CardHeader className="p-6 sm:p-7 border-b border-slate-100">
            <CardTitle className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2.5">
              <Lock className="w-5 h-5 text-amber-600" />
              Keamanan Kata Sandi
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-slate-500 mt-1">
              Kosongkan bagian ini jika Anda tidak ingin mengubah kata sandi login saat ini.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 sm:p-7 space-y-5">
            {profile?.hasPassword && (
              <div className="space-y-2 max-w-md">
                <label className="text-xs sm:text-sm font-bold text-slate-700 block">
                  Kata Sandi Saat Ini
                </label>
                <Input
                  type="password"
                  value={formData.currentPassword}
                  onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                  placeholder="Masukkan kata sandi lama Anda"
                  className="rounded-xl text-sm"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl">
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-bold text-slate-700 block">
                  Kata Sandi Baru
                </label>
                <Input
                  type="password"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  placeholder="Minimal 6 karakter"
                  className="rounded-xl text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-bold text-slate-700 block">
                  Konfirmasi Kata Sandi Baru
                </label>
                <Input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Ulangi kata sandi baru"
                  className="rounded-xl text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tombol Simpan Perubahan */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSaving}
            className="w-full sm:w-auto px-7 py-3.5 font-black text-sm rounded-2xl shadow-md shadow-blue-600/20 gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Perubahan Profil</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
