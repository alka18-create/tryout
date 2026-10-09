"use client";

import React, { useState, useEffect } from "react";
import { User, School, Lock, Save, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface ProfileData {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  schoolClass?: string | null;
  school?: {
    id: string;
    name: string;
    city?: string | null;
  } | null;
  hasPassword?: boolean;
}

export default function StudentProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    schoolName: "",
    schoolClass: "",
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
      const res = await fetch("/api/student/profile");
      const json = await res.json();
      if (json.success && json.data) {
        setProfile(json.data);
        setFormData((prev) => ({
          ...prev,
          name: json.data.name || "",
          phone: json.data.phone || "",
          schoolName: json.data.school?.name || "",
          schoolClass: json.data.schoolClass || "",
        }));
      }
    } catch {
      setFeedback({ type: "error", text: "Gagal memuat data profil pengguna." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      setFeedback({ type: "error", text: "Konfirmasi password baru tidak cocok." });
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/student/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          schoolName: formData.schoolName,
          schoolClass: formData.schoolClass,
          currentPassword: formData.currentPassword || undefined,
          newPassword: formData.newPassword || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setFeedback({
          type: "error",
          text: json.error?.message || "Gagal memperbarui profil.",
        });
        setIsSaving(false);
        return;
      }

      setFeedback({ type: "success", text: "Perubahan profil berhasil disimpan!" });
      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
      await fetchProfile();
    } catch {
      setFeedback({ type: "error", text: "Terjadi gangguan jaringan saat menyimpan profil." });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Pengaturan Profil</h1>
        <p className="text-sm text-slate-500 mt-1">
          Kelola informasi data diri, sekolah, dan keamanan kata sandi akun Anda
        </p>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-3 border ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          )}
          <span className="font-medium">{feedback.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Data Diri */}
        <Card className="bg-white border-slate-200/90 shadow-xs">
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-200/60">
                <User className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-slate-900">Informasi Pengguna</CardTitle>
                <CardDescription className="text-slate-500">Data identitas utama yang terdaftar pada sistem</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nama Lengkap"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ahmad Fauzi"
              />
              <Input
                label="Email (Akun Login)"
                disabled
                value={profile?.email || ""}
                helperText="Email akun tidak dapat diubah"
              />
            </div>
            <Input
              label="Nomor WhatsApp / HP"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="08123456789"
              helperText="Untuk notifikasi penting pelaksanaan tryout"
            />
          </CardContent>
        </Card>

        {/* Asal Sekolah & Akademik */}
        <Card className="bg-white border-slate-200/90 shadow-xs">
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200/60">
                <School className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-slate-900">Data Akademik</CardTitle>
                <CardDescription className="text-slate-500">Informasi asal sekolah dan tingkatan kelas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Asal Sekolah"
                value={formData.schoolName}
                onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                placeholder="SMA Negeri 1 Jakarta"
              />
              <Input
                label="Kelas"
                value={formData.schoolClass}
                onChange={(e) => setFormData({ ...formData, schoolClass: e.target.value })}
                placeholder="XII IPS 1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Keamanan & Password */}
        <Card className="bg-white border-slate-200/90 shadow-xs">
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-200/60">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-slate-900">Keamanan Kata Sandi</CardTitle>
                <CardDescription className="text-slate-500">
                  Kosongkan bagian ini jika Anda tidak bermaksud mengganti password
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {profile?.hasPassword && (
              <Input
                label="Password Saat Ini"
                type="password"
                value={formData.currentPassword}
                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                placeholder="••••••••"
              />
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Password Baru"
                type="password"
                minLength={6}
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                placeholder="••••••••"
                helperText="Minimal 6 karakter"
              />
              <Input
                label="Konfirmasi Password Baru"
                type="password"
                minLength={6}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="••••••••"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" isLoading={isSaving} className="gap-2 shadow-xs">
            <Save className="w-4 h-4" />
            <span>Simpan Perubahan Profil</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
