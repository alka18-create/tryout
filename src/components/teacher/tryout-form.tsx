"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Subject {
  id: string;
  name: string;
}

interface TryoutFormProps {
  initialData?: {
    id?: string;
    title: string;
    description?: string | null;
    subjectId: string;
    durationMinutes: number;
    passingScore: number;
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    discussionVisibility: "ALWAYS" | "AFTER_SUBMIT" | "AFTER_TRYOUT_CLOSED" | "NEVER";
    startDate?: string | null;
    endDate?: string | null;
  };
  isEditing?: boolean;
}

export function TryoutForm({ initialData, isEditing = false }: TryoutFormProps) {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    subjectId: initialData?.subjectId || "",
    durationMinutes: initialData?.durationMinutes || 60,
    passingScore: initialData?.passingScore || 75,
    status: initialData?.status || "DRAFT",
    discussionVisibility: initialData?.discussionVisibility || "AFTER_SUBMIT",
    startDate: initialData?.startDate ? new Date(initialData.startDate).toISOString().slice(0, 16) : "",
    endDate: initialData?.endDate ? new Date(initialData.endDate).toISOString().slice(0, 16) : "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const res = await fetch("/api/teacher/subjects");
      const json = await res.json();
      if (json.success && json.data) {
        setSubjects(json.data);
        if (!initialData?.subjectId && json.data.length > 0) {
          setFormData((prev) => ({ ...prev, subjectId: json.data[0].id }));
        }
      }
    } catch {
      console.error("Gagal memuat mata pelajaran");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setIsLoading(true);

    try {
      const url = isEditing
        ? `/api/teacher/tryouts/${initialData?.id}`
        : "/api/teacher/tryouts";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          durationMinutes: Number(formData.durationMinutes),
          passingScore: Number(formData.passingScore),
          startDate: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
          endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setFeedback({
          type: "error",
          text: json.error?.message || "Gagal menyimpan paket tryout.",
        });
        setIsLoading(false);
        return;
      }

      setFeedback({
        type: "success",
        text: isEditing ? "Perubahan tryout berhasil disimpan!" : "Paket tryout berhasil dibuat!",
      });

      setTimeout(() => {
        if (!isEditing && json.data?.id) {
          // Arahkan langsung ke halaman penyusunan soal
          router.push(`/dashboard/teacher/tryouts/${json.data.id}/questions`);
        } else {
          router.push("/dashboard/teacher/tryouts");
        }
        router.refresh();
      }, 1000);
    } catch {
      setFeedback({ type: "error", text: "Terjadi gangguan jaringan saat menyimpan tryout." });
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        href="/dashboard/teacher/tryouts"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Kembali ke Daftar Tryout</span>
      </Link>

      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          {isEditing ? "Edit Pengaturan Tryout" : "Buat Paket Tryout Baru"}
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Tentukan judul, durasi pengerjaan, KKM, dan kebijakan visibilitas pembahasan
        </p>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-3 border ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informasi Utama</CardTitle>
            <CardDescription>Nama paket ujian dan deskripsi petunjuk pelaksanaan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Judul Paket Tryout"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Contoh: Tryout Sosiologi Paket 02"
            />

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Mata Pelajaran
              </label>
              <select
                required
                value={formData.subjectId}
                onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-indigo-500 text-slate-100 text-sm outline-none"
              >
                <option value="">-- Pilih Mata Pelajaran --</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Deskripsi & Petunjuk Pengerjaan
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Petunjuk khusus atau cakupan materi yang diujikan..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-indigo-500 text-slate-100 text-sm outline-none resize-y"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Waktu & Standar Kelulusan</CardTitle>
            <CardDescription>Aturan timer server dan ambang batas nilai kelulusan (KKM)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Durasi Pengerjaan (Menit)"
                type="number"
                min={5}
                max={300}
                required
                value={formData.durationMinutes}
                onChange={(e) => setFormData({ ...formData, durationMinutes: Number(e.target.value) })}
                helperText="Contoh: 60 menit"
              />

              <Input
                label="KKM / Nilai Kelulusan (0 - 100)"
                type="number"
                min={0}
                max={100}
                required
                value={formData.passingScore}
                onChange={(e) => setFormData({ ...formData, passingScore: Number(e.target.value) })}
                helperText="Standar kelulusan minimum peserta"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Kebijakan Tampilan Pembahasan Soal
              </label>
              <select
                value={formData.discussionVisibility}
                onChange={(e) => setFormData({ ...formData, discussionVisibility: e.target.value as any })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-indigo-500 text-slate-100 text-sm outline-none"
              >
                <option value="AFTER_SUBMIT">Langsung Tampil Setelah Siswa Submit Ujian</option>
                <option value="ALWAYS">Selalu Dapat Dilihat (Kapan Saja)</option>
                <option value="AFTER_TRYOUT_CLOSED">Hanya Tampil Setelah Tryout Ditutup</option>
                <option value="NEVER">Jangan Tampilkan Pembahasan</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Link href="/dashboard/teacher/tryouts">
            <Button type="button" variant="outline">
              Batal
            </Button>
          </Link>
          <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className="gap-2">
            <Save className="w-4 h-4" />
            <span>{isEditing ? "Simpan Perubahan" : "Buat Tryout & Lanjut Susun Soal →"}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
