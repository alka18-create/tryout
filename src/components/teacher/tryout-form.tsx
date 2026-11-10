"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/ui/custom-select";

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
    scoringMode?: "NORMALIZED" | "RAW";
    passingTwk?: number | null;
    passingTiu?: number | null;
    passingTkp?: number | null;
    maxAttempts?: number;
    questionCount?: number | null;
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
    scoringMode: initialData?.scoringMode || "NORMALIZED",
    passingTwk: initialData?.passingTwk ?? null,
    passingTiu: initialData?.passingTiu ?? null,
    passingTkp: initialData?.passingTkp ?? null,
    maxAttempts: initialData?.maxAttempts ?? 3,
    questionCount:
      initialData?.questionCount !== undefined && initialData?.questionCount !== null
        ? initialData.questionCount
        : "",
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
          scoringMode: formData.scoringMode,
          passingTwk:
            formData.scoringMode === "RAW" && formData.passingTwk !== null
              ? Number(formData.passingTwk)
              : null,
          passingTiu:
            formData.scoringMode === "RAW" && formData.passingTiu !== null
              ? Number(formData.passingTiu)
              : null,
          passingTkp:
            formData.scoringMode === "RAW" && formData.passingTkp !== null
              ? Number(formData.passingTkp)
              : null,
          maxAttempts: Number(formData.maxAttempts),
          questionCount:
            formData.questionCount !== "" && formData.questionCount !== null
              ? Number(formData.questionCount)
              : null,
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
    <div className="space-y-6 max-w-3xl w-full min-w-0">
      <Link
        href="/dashboard/teacher/tryouts"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Kembali ke Daftar Tryout</span>
      </Link>

      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          {isEditing ? "Edit Pengaturan Tryout" : "Buat Paket Tryout Baru"}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Tentukan judul, durasi pengerjaan, mode penilaian, ambang kelulusan, dan kebijakan visibilitas pembahasan
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

            <CustomSelect
              label="Mata Pelajaran"
              required
              value={formData.subjectId}
              onChange={(val) => setFormData({ ...formData, subjectId: val })}
              placeholder="-- Pilih Mata Pelajaran --"
              options={subjects.map((sub) => ({ value: sub.id, label: sub.name }))}
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Deskripsi & Petunjuk Pengerjaan
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Petunjuk khusus atau cakupan materi yang diujikan..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900 text-sm outline-none resize-y shadow-xs transition-colors"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Waktu & Standar Kelulusan</CardTitle>
            <CardDescription>
              Aturan timer server, kuota soal yang ditampilkan secara acak, dan ambang batas kelulusan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mode Penilaian */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Mode Penilaian
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, scoringMode: "NORMALIZED" })}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    formData.scoringMode === "NORMALIZED"
                      ? "border-blue-600 bg-blue-50/80 text-blue-900 ring-1 ring-blue-500"
                      : "border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <div className="text-xs font-bold">Nilai 0–100 (Reguler)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Skor akhir dinormalisasi ke skala 0–100.
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const isRaw = formData.scoringMode === "RAW";
                    setFormData({
                      ...formData,
                      scoringMode: "RAW",
                      ...(isRaw
                        ? {}
                        : {
                            durationMinutes: 100,
                            questionCount: "" as const,
                            passingTwk: 65,
                            passingTiu: 80,
                            passingTkp: 166,
                          }),
                    });
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    formData.scoringMode === "RAW"
                      ? "border-blue-600 bg-blue-50/80 text-blue-900 ring-1 ring-blue-500"
                      : "border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <div className="text-xs font-bold">Skor Mentah / SKD CASN</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Total skor mentah + ambang batas per subtes.
                  </div>
                </button>
              </div>
            </div>

            {formData.scoringMode === "RAW" && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-900 leading-relaxed">
                <p className="font-bold">Preset SKD CASN</p>
                <p className="mt-0.5">
                  110 soal / 100 menit: TWK 30 soal (maks 150), TIU 35 soal (maks 175), TKP 45
                  soal (maks 225). Total maksimum 550. Kategori tiap soal diatur di halaman{" "}
                  <b>Susun Soal</b>.
                </p>
                <p className="mt-0.5">
                  Bank soal TKP/TIU/TWK boleh disimpan di mata pelajaran berbeda — saat menyusun
                  soal, semua mata pelajaran akan ditampilkan dan kategori subtes ditetapkan per soal.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input
                label="Durasi Pengerjaan (Menit)"
                type="number"
                min={5}
                max={300}
                required
                value={formData.durationMinutes}
                onChange={(e) => setFormData({ ...formData, durationMinutes: Number(e.target.value) })}
                helperText={formData.scoringMode === "RAW" ? "SKD: 100 menit" : "Contoh: 60 menit"}
              />

              <Input
                label="Jumlah Soal Ditampilkan"
                type="number"
                min={1}
                value={formData.questionCount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    questionCount: e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
                placeholder="Semua butir soal"
                helperText={
                  formData.scoringMode === "RAW"
                    ? "Kosongkan = tampilkan semua (SKD: 110 soal)"
                    : "Diacak per siswa (kosongkan = semua)"
                }
              />

              {formData.scoringMode === "NORMALIZED" ? (
                <Input
                  label="KKM / Kelulusan (0 - 100)"
                  type="number"
                  min={0}
                  max={100}
                  required
                  value={formData.passingScore}
                  onChange={(e) => setFormData({ ...formData, passingScore: Number(e.target.value) })}
                  helperText="Nilai minimum kelulusan"
                />
              ) : null}

              <Input
                label="Batas Percobaan Siswa"
                type="number"
                min={1}
                max={10}
                required
                value={formData.maxAttempts}
                onChange={(e) => setFormData({ ...formData, maxAttempts: Number(e.target.value) })}
                helperText="Maksimal pengerjaan ujian"
              />
            </div>

            {formData.scoringMode === "RAW" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Ambang Batas TWK"
                  type="number"
                  min={0}
                  max={1000}
                  value={formData.passingTwk ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      passingTwk: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  helperText="SKD: minimal 65"
                />
                <Input
                  label="Ambang Batas TIU"
                  type="number"
                  min={0}
                  max={1000}
                  value={formData.passingTiu ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      passingTiu: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  helperText="SKD: minimal 80"
                />
                <Input
                  label="Ambang Batas TKP"
                  type="number"
                  min={0}
                  max={1000}
                  value={formData.passingTkp ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      passingTkp: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  helperText="SKD: minimal 166"
                />
              </div>
            )}

            <CustomSelect
              label="Kebijakan Tampilan Pembahasan Soal"
              value={formData.discussionVisibility}
              onChange={(val) => setFormData({ ...formData, discussionVisibility: val as any })}
              helperText="Tentukan kapan siswa diizinkan melihat kunci jawaban dan pembahasan soal ujian"
              options={[
                {
                  value: "AFTER_SUBMIT",
                  label: "Langsung Tampil Setelah Siswa Submit Ujian",
                  description: "Siswa dapat langsung melihat pembahasan dan analisis jawaban segera setelah menyelesaikan ujian.",
                },
                {
                  value: "ALWAYS",
                  label: "Selalu Dapat Dilihat (Kapan Saja)",
                  description: "Pembahasan selalu dapat diakses siswa dari menu riwayat pengerjaan kapan pun.",
                },
                {
                  value: "AFTER_TRYOUT_CLOSED",
                  label: "Hanya Tampil Setelah Tryout Ditutup",
                  description: "Sangat direkomendasikan untuk ujian serentak guna mencegah kebocoran jawaban antar siswa saat sesi masih berlangsung.",
                },
                {
                  value: "NEVER",
                  label: "Jangan Pernah Tampilkan Pembahasan",
                  description: "Siswa hanya akan mengetahui total nilai/skor kelulusan tanpa rincian kunci jawaban.",
                },
              ]}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
          <Link href="/dashboard/teacher/tryouts" className="w-full sm:w-auto">
            <Button type="button" variant="outline" className="w-full sm:w-auto">
              Batal
            </Button>
          </Link>
          <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className="gap-2 w-full sm:w-auto">
            <Save className="w-4 h-4" />
            <span>{isEditing ? "Simpan Perubahan" : "Buat Tryout & Lanjut Susun Soal →"}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
