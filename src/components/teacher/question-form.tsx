"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Eye, CheckCircle2, AlertCircle, HelpCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Subject {
  id: string;
  name: string;
}

interface Topic {
  id: string;
  name: string;
  subjectId: string;
}

interface QuestionFormProps {
  initialData?: {
    id?: string;
    topicId: string;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    content: string;
    imageUrl?: string | null;
    explanation?: string | null;
    explanationImageUrl?: string | null;
    options: Array<{
      label: "A" | "B" | "C" | "D" | "E";
      content: string;
      imageUrl?: string | null;
      isCorrect: boolean;
    }>;
  };
  isEditing?: boolean;
}

export function QuestionForm({ initialData, isEditing = false }: QuestionFormProps) {
  const router = useRouter();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  const [formData, setFormData] = useState({
    topicId: initialData?.topicId || "",
    difficulty: initialData?.difficulty || "MEDIUM",
    content: initialData?.content || "",
    imageUrl: initialData?.imageUrl || "",
    explanation: initialData?.explanation || "",
    explanationImageUrl: initialData?.explanationImageUrl || "",
    options: initialData?.options || [
      { label: "A", content: "", isCorrect: true, imageUrl: "" },
      { label: "B", content: "", isCorrect: false, imageUrl: "" },
      { label: "C", content: "", isCorrect: false, imageUrl: "" },
      { label: "D", content: "", isCorrect: false, imageUrl: "" },
      { label: "E", content: "", isCorrect: false, imageUrl: "" },
    ],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    try {
      const [resSub, resTop] = await Promise.all([
        fetch("/api/teacher/subjects"),
        fetch("/api/teacher/topics"),
      ]);
      const jsonSub = await resSub.json();
      const jsonTop = await resTop.json();

      if (jsonSub.success) setSubjects(jsonSub.data);
      if (jsonTop.success) setTopics(jsonTop.data);

      if (initialData?.topicId && jsonTop.data) {
        const found = jsonTop.data.find((t: Topic) => t.id === initialData.topicId);
        if (found) setSelectedSubjectId(found.subjectId);
      } else if (jsonSub.data?.length > 0) {
        setSelectedSubjectId(jsonSub.data[0].id);
      }
    } catch {
      console.error("Gagal memuat metadata kurikulum");
    }
  };

  const filteredTopics = selectedSubjectId
    ? topics.filter((t) => t.subjectId === selectedSubjectId)
    : topics;

  const handleOptionChange = (index: number, content: string) => {
    const newOptions = [...formData.options];
    newOptions[index].content = content;
    setFormData({ ...formData, options: newOptions });
  };

  const handleSetCorrectOption = (index: number) => {
    const newOptions = formData.options.map((opt, i) => ({
      ...opt,
      isCorrect: i === index,
    }));
    setFormData({ ...formData, options: newOptions });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!formData.topicId) {
      setFeedback({ type: "error", text: "Silakan pilih topik materi untuk soal ini." });
      return;
    }

    const emptyOption = formData.options.find((opt) => !opt.content.trim());
    if (emptyOption) {
      setFeedback({ type: "error", text: `Opsi ${emptyOption.label} tidak boleh kosong.` });
      return;
    }

    setIsLoading(true);

    try {
      const url = isEditing
        ? `/api/teacher/questions/${initialData?.id}`
        : "/api/teacher/questions";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setFeedback({
          type: "error",
          text: json.error?.message || "Gagal menyimpan soal.",
        });
        setIsLoading(false);
        return;
      }

      setFeedback({
        type: "success",
        text: isEditing ? "Perubahan soal berhasil disimpan!" : "Soal baru berhasil ditambahkan!",
      });

      setTimeout(() => {
        router.push("/dashboard/teacher/questions");
        router.refresh();
      }, 1000);
    } catch {
      setFeedback({ type: "error", text: "Terjadi kesalahan jaringan saat menyimpan soal." });
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header Form */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/teacher/questions"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Bank Soal</span>
        </Link>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
          className="gap-2"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{showPreview ? "Sembunyikan Preview" : "Lihat Preview Siswa"}</span>
        </Button>
      </div>

      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            {isEditing ? "Edit Soal Pilihan Ganda" : "Tambah Soal ke Bank Soal"}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Lengkapi pertanyaan, 5 pilihan jawaban (A–E), kunci jawaban, dan pembahasan soal
          </p>
        </div>
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

      {/* Grid Live Preview & Form */}
      <div className={`grid gap-6 ${showPreview ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
        {/* Kolom Formulir */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Metadata Soal */}
          <Card>
            <CardHeader>
              <CardTitle>Metadata Soal</CardTitle>
              <CardDescription>Klasifikasi mata pelajaran, materi pokok, dan tingkat kesulitan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Mata Pelajaran
                  </label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => {
                      setSelectedSubjectId(e.target.value);
                      setFormData({ ...formData, topicId: "" });
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-indigo-500 text-slate-100 text-sm outline-none"
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Topik / Materi Pokok <span className="text-rose-400">*</span>
                  </label>
                  <select
                    required
                    value={formData.topicId}
                    onChange={(e) => setFormData({ ...formData, topicId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-indigo-500 text-slate-100 text-sm outline-none"
                  >
                    <option value="">-- Pilih Topik --</option>
                    {filteredTopics.map((top) => (
                      <option key={top.id} value={top.id}>
                        {top.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Tingkat Kesulitan
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { val: "EASY", label: "Mudah", color: "text-emerald-400" },
                    { val: "MEDIUM", label: "Sedang", color: "text-amber-400" },
                    { val: "HARD", label: "Sulit", color: "text-rose-400" },
                  ].map((d) => (
                    <button
                      key={d.val}
                      type="button"
                      onClick={() => setFormData({ ...formData, difficulty: d.val as any })}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                        formData.difficulty === d.val
                          ? "border-indigo-500 bg-indigo-500/10 text-white"
                          : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <span className={d.color}>●</span> {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Konten Pertanyaan */}
          <Card>
            <CardHeader>
              <CardTitle>Pertanyaan</CardTitle>
              <CardDescription>Tulis teks pertanyaan secara jelas (mendukung HTML dasar / teks)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <textarea
                  required
                  rows={4}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Tuliskan teks pertanyaan di sini..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-indigo-500 text-slate-100 text-sm outline-none resize-y"
                />
              </div>

              <Input
                label="URL Gambar Pendukung (Opsional)"
                value={formData.imageUrl || ""}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://example.com/gambar-soal.jpg"
              />
            </CardContent>
          </Card>

          {/* Opsi Pilihan Ganda (A - E) */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pilihan Jawaban (A - E)</CardTitle>
                  <CardDescription>
                    Pilih radio button untuk menandai satu kunci jawaban yang benar
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {formData.options.map((opt, index) => (
                <div
                  key={opt.label}
                  className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                    opt.isCorrect
                      ? "border-emerald-500/50 bg-emerald-500/5 shadow-sm shadow-emerald-500/10"
                      : "border-slate-800 bg-slate-950/40"
                  }`}
                >
                  <div className="pt-2">
                    <input
                      type="radio"
                      name="correctOption"
                      checked={opt.isCorrect}
                      onChange={() => handleSetCorrectOption(index)}
                      className="w-4 h-4 text-emerald-500 focus:ring-emerald-500 bg-slate-900 border-slate-700 cursor-pointer"
                    />
                  </div>

                  <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs shrink-0 text-white">
                    {opt.label}
                  </div>

                  <div className="flex-1">
                    <input
                      type="text"
                      required
                      value={opt.content}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Pilihan jawaban ${opt.label}...`}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 focus:border-indigo-500 text-sm text-slate-100 outline-none"
                    />
                  </div>

                  {opt.isCorrect && (
                    <Badge variant="success" className="shrink-0 self-center">
                      Kunci Benar
                    </Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Pembahasan Soal */}
          <Card>
            <CardHeader>
              <CardTitle>Penjelasan & Pembahasan</CardTitle>
              <CardDescription>
                Penjelasan ini akan ditampilkan kepada siswa setelah tryout diselesaikan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                rows={3}
                value={formData.explanation || ""}
                onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                placeholder="Tuliskan alasan mengapa jawaban tersebut benar dan konsep terkait..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-indigo-500 text-slate-100 text-sm outline-none resize-y"
              />
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link href="/dashboard/teacher/questions">
              <Button type="button" variant="outline">
                Batal
              </Button>
            </Link>
            <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className="gap-2">
              <Save className="w-4 h-4" />
              <span>{isEditing ? "Simpan Perubahan Soal" : "Simpan ke Bank Soal"}</span>
            </Button>
          </div>
        </form>

        {/* Kolom Live Preview (Tampilan Siswa) */}
        {showPreview && (
          <div className="sticky top-6 self-start space-y-4">
            <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <Eye className="w-4 h-4" /> Preview Tampilan Siswa
              </span>
              <Badge variant="outline">Simulasi</Badge>
            </div>

            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-bold text-indigo-400">Soal Contoh #01</span>
                <Badge variant={formData.difficulty === "HARD" ? "danger" : formData.difficulty === "MEDIUM" ? "warning" : "success"}>
                  {formData.difficulty}
                </Badge>
              </div>

              <div className="text-sm text-slate-200 font-medium leading-relaxed">
                {formData.content || "(Teks pertanyaan belum diisi...)"}
              </div>

              {formData.imageUrl && (
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <img src={formData.imageUrl} alt="Gambar Soal" className="max-h-48 rounded-lg object-contain mx-auto" />
                </div>
              )}

              <div className="space-y-2 pt-2">
                {formData.options.map((opt) => (
                  <div
                    key={opt.label}
                    className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center gap-3 text-xs"
                  >
                    <div className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center font-bold text-white shrink-0">
                      {opt.label}
                    </div>
                    <span className="text-slate-300 flex-1">{opt.content || `(Opsi ${opt.label})`}</span>
                  </div>
                ))}
              </div>

              {formData.explanation && (
                <div className="mt-4 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <span className="font-bold text-indigo-400">Preview Pembahasan:</span>
                  <p className="text-slate-400 mt-1">{formData.explanation}</p>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
