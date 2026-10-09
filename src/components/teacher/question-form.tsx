"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Eye, CheckCircle2, AlertCircle, HelpCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ImageUploader } from "./image-uploader";

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
    type?: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE";
    difficulty: "EASY" | "MEDIUM" | "HARD";
    content: string;
    imageUrl?: string | null;
    explanation?: string | null;
    explanationImageUrl?: string | null;
    options: Array<{
      label: string;
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
    type: initialData?.type || "SINGLE_CHOICE",
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

  const handleTypeChange = (newType: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE") => {
    let newOptions = [...formData.options];

    if (newType === "TRUE_FALSE") {
      newOptions = [
        { label: "A", content: "Benar", isCorrect: true, imageUrl: "" },
        { label: "B", content: "Salah", isCorrect: false, imageUrl: "" },
      ];
    } else if (newType === "SINGLE_CHOICE") {
      if (newOptions.length !== 5) {
        newOptions = [
          { label: "A", content: newOptions[0]?.content || "", isCorrect: true, imageUrl: newOptions[0]?.imageUrl || "" },
          { label: "B", content: newOptions[1]?.content || "", isCorrect: false, imageUrl: newOptions[1]?.imageUrl || "" },
          { label: "C", content: "", isCorrect: false, imageUrl: "" },
          { label: "D", content: "", isCorrect: false, imageUrl: "" },
          { label: "E", content: "", isCorrect: false, imageUrl: "" },
        ];
      } else {
        let found = false;
        newOptions = newOptions.map((o) => {
          if (o.isCorrect && !found) {
            found = true;
            return o;
          }
          return { ...o, isCorrect: false };
        });
        if (!found) newOptions[0].isCorrect = true;
      }
    } else if (newType === "MULTIPLE_CHOICE") {
      if (newOptions.length !== 5) {
        newOptions = [
          { label: "A", content: newOptions[0]?.content || "", isCorrect: true, imageUrl: newOptions[0]?.imageUrl || "" },
          { label: "B", content: newOptions[1]?.content || "", isCorrect: true, imageUrl: newOptions[1]?.imageUrl || "" },
          { label: "C", content: "", isCorrect: false, imageUrl: "" },
          { label: "D", content: "", isCorrect: false, imageUrl: "" },
          { label: "E", content: "", isCorrect: false, imageUrl: "" },
        ];
      }
    }

    setFormData({
      ...formData,
      type: newType,
      options: newOptions,
    });
  };

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

  const handleToggleMultipleCorrectOption = (index: number) => {
    const newOptions = [...formData.options];
    newOptions[index].isCorrect = !newOptions[index].isCorrect;
    setFormData({ ...formData, options: newOptions });
  };

  const handleOptionImageChange = (index: number, imageUrl: string) => {
    const newOptions = [...formData.options];
    newOptions[index].imageUrl = imageUrl;
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

    // Validasi kunci jawaban berdasarkan tipe soal
    const correctCount = formData.options.filter((opt) => opt.isCorrect).length;
    if (formData.type === "SINGLE_CHOICE" || formData.type === "TRUE_FALSE") {
      if (correctCount !== 1) {
        setFeedback({ type: "error", text: "Tepat satu opsi harus ditandai sebagai kunci jawaban benar." });
        return;
      }
    } else if (formData.type === "MULTIPLE_CHOICE") {
      if (correctCount < 2) {
        setFeedback({
          type: "error",
          text: "Pilihan ganda kompleks wajib memiliki minimal 2 kunci jawaban benar.",
        });
        return;
      }
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
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
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

      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {isEditing ? "Edit Soal Pilihan Ganda" : "Tambah Soal ke Bank Soal"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Lengkapi pertanyaan, 5 pilihan jawaban (A–E), kunci jawaban, dan pembahasan soal
          </p>
        </div>
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
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mata Pelajaran
                  </label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => {
                      setSelectedSubjectId(e.target.value);
                      setFormData({ ...formData, topicId: "" });
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900 text-sm outline-none shadow-xs transition-colors"
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Topik / Materi Pokok <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.topicId}
                    onChange={(e) => setFormData({ ...formData, topicId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900 text-sm outline-none shadow-xs transition-colors"
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

              {/* Tipe Soal */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tipe / Format Soal
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      val: "SINGLE_CHOICE",
                      title: "Pilihan Ganda",
                      desc: "1 Kunci Benar (A–E)",
                    },
                    {
                      val: "MULTIPLE_CHOICE",
                      title: "PG Kompleks",
                      desc: "≥ 2 Kunci Benar (Centang)",
                    },
                    {
                      val: "TRUE_FALSE",
                      title: "Benar / Salah",
                      desc: "2 Opsi (Benar vs Salah)",
                    },
                  ].map((t) => (
                    <button
                      key={t.val}
                      type="button"
                      onClick={() => handleTypeChange(t.val as any)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        formData.type === t.val
                          ? "border-blue-600 bg-blue-50/80 text-blue-900 shadow-xs ring-1 ring-blue-500"
                          : "border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-900">{t.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tingkat Kesulitan
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { val: "EASY", label: "Mudah", color: "text-emerald-600" },
                    { val: "MEDIUM", label: "Sedang", color: "text-amber-600" },
                    { val: "HARD", label: "Sulit", color: "text-rose-600" },
                  ].map((d) => (
                    <button
                      key={d.val}
                      type="button"
                      onClick={() => setFormData({ ...formData, difficulty: d.val as any })}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                        formData.difficulty === d.val
                          ? "border-blue-600 bg-blue-50 text-blue-700 shadow-xs"
                          : "border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-slate-100"
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900 text-sm outline-none resize-y shadow-xs transition-colors"
                />
              </div>

              <ImageUploader
                label="Lampiran Gambar Soal (Opsional)"
                description="Unggah diagram, kurva, atau ilustrasi soal (Maksimal 1 MB)"
                value={formData.imageUrl}
                onChange={(url) => setFormData({ ...formData, imageUrl: url })}
              />
            </CardContent>
          </Card>

          {/* Opsi Pilihan Jawaban */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {formData.type === "TRUE_FALSE"
                      ? "Pilihan Jawaban (Benar / Salah)"
                      : formData.type === "MULTIPLE_CHOICE"
                      ? "Pilihan Jawaban Kompleks (Centang Jawaban Benar)"
                      : "Pilihan Jawaban (A - E)"}
                  </CardTitle>
                  <CardDescription>
                    {formData.type === "MULTIPLE_CHOICE"
                      ? "Centang kotak untuk menandai semua opsi yang merupakan kunci jawaban benar (minimal 2 kunci benar)."
                      : formData.type === "TRUE_FALSE"
                      ? "Pilih radio button untuk menentukan apakah pernyataan soal bernilai Benar atau Salah."
                      : "Pilih radio button untuk menandai satu kunci jawaban yang benar."}
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
                      ? "border-emerald-400 bg-emerald-50/70 shadow-xs"
                      : "border-slate-200 bg-slate-50/50 hover:bg-slate-50"
                  }`}
                >
                  <div className="pt-2">
                    {formData.type === "MULTIPLE_CHOICE" ? (
                      <input
                        type="checkbox"
                        checked={opt.isCorrect}
                        onChange={() => handleToggleMultipleCorrectOption(index)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-white border-slate-300 cursor-pointer"
                        title="Tandai opsi ini sebagai salah satu kunci benar"
                      />
                    ) : (
                      <input
                        type="radio"
                        name="correctOption"
                        checked={opt.isCorrect}
                        onChange={() => handleSetCorrectOption(index)}
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 bg-white border-slate-300 cursor-pointer"
                        title="Tandai opsi ini sebagai kunci benar"
                      />
                    )}
                  </div>

                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                    opt.isCorrect
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-white border border-slate-200 text-slate-700 shadow-xs"
                  }`}>
                    {opt.label}
                  </div>

                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      required
                      value={opt.content}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={
                        formData.type === "TRUE_FALSE"
                          ? opt.label === "A" ? "Benar" : "Salah"
                          : `Pilihan jawaban ${opt.label}...`
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm text-slate-900 outline-none shadow-xs transition-colors"
                    />

                    {/* Lampiran Gambar Opsi (Maks 1 MB) */}
                    {formData.type !== "TRUE_FALSE" && (
                      <ImageUploader
                        compact
                        value={opt.imageUrl}
                        onChange={(url) => handleOptionImageChange(index, url)}
                      />
                    )}
                  </div>

                  {opt.isCorrect && (
                    <Badge variant={formData.type === "MULTIPLE_CHOICE" ? "info" : "success"} className="shrink-0 self-start mt-1">
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900 text-sm outline-none resize-y shadow-xs transition-colors"
              />

              <ImageUploader
                label="Lampiran Gambar Pembahasan (Opsional)"
                description="Unggah diagram solusi atau langkah kerja pembahasan (Maksimal 1 MB)"
                value={formData.explanationImageUrl}
                onChange={(url) => setFormData({ ...formData, explanationImageUrl: url })}
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
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
              <span className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                <Eye className="w-4 h-4" /> Preview Tampilan Siswa
              </span>
              <Badge variant="info">Simulasi</Badge>
            </div>

            <Card className="p-6 space-y-4 shadow-sm border-slate-200">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-bold text-blue-600">Soal Contoh #01</span>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline">
                    {formData.type === "MULTIPLE_CHOICE"
                      ? "PG Kompleks"
                      : formData.type === "TRUE_FALSE"
                      ? "Benar / Salah"
                      : "Pilihan Ganda"}
                  </Badge>
                  <Badge variant={formData.difficulty === "HARD" ? "danger" : formData.difficulty === "MEDIUM" ? "warning" : "success"}>
                    {formData.difficulty}
                  </Badge>
                </div>
              </div>

              {formData.type === "MULTIPLE_CHOICE" && (
                <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700 font-medium">
                  ℹ Pilihan Ganda Kompleks: Anda dapat memilih lebih dari satu jawaban.
                </div>
              )}

              <div className="text-sm text-slate-800 font-medium leading-relaxed">
                {formData.content || "(Teks pertanyaan belum diisi...)"}
              </div>

              {formData.imageUrl && (
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <img src={formData.imageUrl} alt="Gambar Soal" className="max-h-48 rounded-lg object-contain mx-auto" />
                </div>
              )}

              <div className="space-y-2 pt-2">
                {formData.options.map((opt) => (
                  <div
                    key={opt.label}
                    className="p-3 rounded-xl border border-slate-200 bg-white flex items-start gap-3 text-xs shadow-xs"
                  >
                    <div className="w-6 h-6 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 shrink-0 mt-0.5">
                      {opt.label}
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <span className="text-slate-800 block">{opt.content || `(Opsi ${opt.label})`}</span>
                      {opt.imageUrl && (
                        <div className="rounded-lg overflow-hidden border border-slate-200 max-w-xs">
                          <img
                            src={opt.imageUrl}
                            alt={`Opsi ${opt.label}`}
                            className="max-h-28 object-contain"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {(formData.explanation || formData.explanationImageUrl) && (
                <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <span className="font-bold text-blue-600 block">Preview Pembahasan:</span>
                  {formData.explanation && (
                    <p className="text-slate-600">{formData.explanation}</p>
                  )}
                  {formData.explanationImageUrl && (
                    <div className="rounded-lg overflow-hidden border border-slate-200 max-w-xs">
                      <img
                        src={formData.explanationImageUrl}
                        alt="Pembahasan"
                        className="max-h-36 object-contain"
                      />
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
