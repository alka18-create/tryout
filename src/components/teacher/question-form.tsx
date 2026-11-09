"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Eye, CheckCircle2, AlertCircle, HelpCircle, Plus, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ImageUploader } from "./image-uploader";
import { CustomSelect } from "@/components/ui/custom-select";
import {
  buildMatrixOptions,
  parseMatrixQuestion,
  type MatrixRowItem,
} from "@/lib/matrix-question";

type QuestionFormType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE" | "MATRIX" | "WEIGHTED_CHOICE";

const DEFAULT_MATRIX_COLUMNS = ["Sesuai", "Tidak Sesuai"];
const MAX_MATRIX_COLUMNS = 5;

interface MatrixRowDraft {
  statement: string;
  imageUrl: string;
  correctColumn: string;
}

/** Membaca data awal soal matriks dari opsi tersimpan menjadi baris & kolom editor. */
function parseInitialMatrix(initialData?: QuestionFormProps["initialData"]): {
  columns: string[];
  rows: MatrixRowDraft[];
} {
  if (initialData?.type !== "MATRIX" || !initialData.options?.length) {
    return { columns: [], rows: [] };
  }

  const parsed = parseMatrixQuestion(
    initialData.options.map((opt, index) => ({
      id: String(index),
      label: opt.label,
      content: opt.content,
      imageUrl: opt.imageUrl || "",
      isCorrect: opt.isCorrect,
    })),
  );

  return {
    columns: parsed.columnNames,
    rows: parsed.rows.map((row: MatrixRowItem) => ({
      statement: row.statement,
      imageUrl: row.imageUrl || "",
      correctColumn:
        row.columns.find((column) => column.isCorrect)?.columnName ?? parsed.columnNames[0] ?? "",
    })),
  };
}

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
    type?: QuestionFormType;
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
      score?: number | null;
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
    options: initialData?.options?.map((opt) => ({
      ...opt,
      imageUrl: opt.imageUrl || "",
      score: opt.score ?? null,
    })) || [
      { label: "A", content: "", isCorrect: true, imageUrl: "", score: null },
      { label: "B", content: "", isCorrect: false, imageUrl: "", score: null },
      { label: "C", content: "", isCorrect: false, imageUrl: "", score: null },
      { label: "D", content: "", isCorrect: false, imageUrl: "", score: null },
      { label: "E", content: "", isCorrect: false, imageUrl: "", score: null },
    ],
  });

  const initialMatrix = parseInitialMatrix(initialData);
  const [matrixColumns, setMatrixColumns] = useState<string[]>(
    initialMatrix.columns.length > 0 ? initialMatrix.columns : DEFAULT_MATRIX_COLUMNS,
  );
  const [matrixRows, setMatrixRows] = useState<MatrixRowDraft[]>(
    initialMatrix.rows.length > 0
      ? initialMatrix.rows
      : [
          { statement: "", imageUrl: "", correctColumn: DEFAULT_MATRIX_COLUMNS[0] },
          { statement: "", imageUrl: "", correctColumn: DEFAULT_MATRIX_COLUMNS[0] },
        ],
  );

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

  const handleTypeChange = (newType: QuestionFormType) => {
    let newOptions = [...formData.options];

    if (newType === "TRUE_FALSE") {
      newOptions = [
        { label: "A", content: "Benar", isCorrect: true, imageUrl: "", score: null },
        { label: "B", content: "Salah", isCorrect: false, imageUrl: "", score: null },
      ];
    } else if (newType === "SINGLE_CHOICE") {
      if (newOptions.length !== 5) {
        newOptions = [
          { label: "A", content: newOptions[0]?.content || "", isCorrect: true, imageUrl: newOptions[0]?.imageUrl || "", score: null },
          { label: "B", content: newOptions[1]?.content || "", isCorrect: false, imageUrl: newOptions[1]?.imageUrl || "", score: null },
          { label: "C", content: "", isCorrect: false, imageUrl: "", score: null },
          { label: "D", content: "", isCorrect: false, imageUrl: "", score: null },
          { label: "E", content: "", isCorrect: false, imageUrl: "", score: null },
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
          { label: "A", content: newOptions[0]?.content || "", isCorrect: true, imageUrl: newOptions[0]?.imageUrl || "", score: null },
          { label: "B", content: newOptions[1]?.content || "", isCorrect: true, imageUrl: newOptions[1]?.imageUrl || "", score: null },
          { label: "C", content: "", isCorrect: false, imageUrl: "", score: null },
          { label: "D", content: "", isCorrect: false, imageUrl: "", score: null },
          { label: "E", content: "", isCorrect: false, imageUrl: "", score: null },
        ];
      }
    } else if (newType === "WEIGHTED_CHOICE") {
      // TKP: 5 opsi dengan skor awal 5-4-3-2-1 (dapat diubah guru).
      newOptions = [
        { label: "A", content: newOptions[0]?.content || "", isCorrect: false, imageUrl: newOptions[0]?.imageUrl || "", score: 5 },
        { label: "B", content: newOptions[1]?.content || "", isCorrect: false, imageUrl: newOptions[1]?.imageUrl || "", score: 4 },
        { label: "C", content: newOptions[2]?.content || "", isCorrect: false, imageUrl: newOptions[2]?.imageUrl || "", score: 3 },
        { label: "D", content: newOptions[3]?.content || "", isCorrect: false, imageUrl: newOptions[3]?.imageUrl || "", score: 2 },
        { label: "E", content: newOptions[4]?.content || "", isCorrect: false, imageUrl: newOptions[4]?.imageUrl || "", score: 1 },
      ];
    } else if (newType === "MATRIX") {
      // Siapkan struktur awal matriks bila belum pernah diisi
      if (matrixColumns.length < 2) {
        setMatrixColumns([...DEFAULT_MATRIX_COLUMNS]);
      }
      if (matrixRows.length === 0) {
        setMatrixRows([
          { statement: "", imageUrl: "", correctColumn: DEFAULT_MATRIX_COLUMNS[0] },
          { statement: "", imageUrl: "", correctColumn: DEFAULT_MATRIX_COLUMNS[0] },
        ]);
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

  const handleOptionScoreChange = (index: number, score: number) => {
    const newOptions = [...formData.options];
    newOptions[index].score = Number.isNaN(score) ? null : score;
    setFormData({ ...formData, options: newOptions });
  };

  // ─── Handler Editor Soal Matriks ───────────────────────────────────────────

  const handleMatrixColumnChange = (index: number, value: string) => {
    const previousName = matrixColumns[index];
    const newColumns = [...matrixColumns];
    newColumns[index] = value;

    setMatrixColumns(newColumns);
    setMatrixRows((rows) =>
      rows.map((row) =>
        row.correctColumn === previousName ? { ...row, correctColumn: value } : row,
      ),
    );
  };

  const addMatrixColumn = () => {
    if (matrixColumns.length >= MAX_MATRIX_COLUMNS) return;
    setMatrixColumns([...matrixColumns, `Kolom ${matrixColumns.length + 1}`]);
  };

  const removeMatrixColumn = (index: number) => {
    if (matrixColumns.length <= 2) return;
    const removedName = matrixColumns[index];
    const newColumns = matrixColumns.filter((_, i) => i !== index);
    setMatrixColumns(newColumns);
    setMatrixRows((rows) =>
      rows.map((row) =>
        row.correctColumn === removedName
          ? { ...row, correctColumn: newColumns[0] }
          : row,
      ),
    );
  };

  const handleMatrixRowChange = (index: number, patch: Partial<MatrixRowDraft>) => {
    setMatrixRows((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const addMatrixRow = () => {
    setMatrixRows((rows) => [
      ...rows,
      { statement: "", imageUrl: "", correctColumn: matrixColumns[0] || "" },
    ]);
  };

  const removeMatrixRow = (index: number) => {
    if (matrixRows.length <= 1) return;
    setMatrixRows((rows) => rows.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!formData.topicId) {
      setFeedback({ type: "error", text: "Silakan pilih topik materi untuk soal ini." });
      return;
    }

    // Validasi khusus soal matriks
    if (formData.type === "MATRIX") {
      if (matrixColumns.length < 2) {
        setFeedback({ type: "error", text: "Soal matriks wajib memiliki minimal 2 kolom jawaban." });
        return;
      }
      if (matrixColumns.some((column) => !column.trim())) {
        setFeedback({ type: "error", text: "Nama kolom matriks tidak boleh kosong." });
        return;
      }
      if (new Set(matrixColumns.map((c) => c.trim())).size !== matrixColumns.length) {
        setFeedback({ type: "error", text: "Nama kolom matriks tidak boleh sama satu dengan lainnya." });
        return;
      }
      if (matrixRows.length < 1) {
        setFeedback({ type: "error", text: "Soal matriks wajib memiliki minimal 1 baris pernyataan." });
        return;
      }
      const emptyRowIndex = matrixRows.findIndex((row) => !row.statement.trim());
      if (emptyRowIndex !== -1) {
        setFeedback({
          type: "error",
          text: `Pernyataan pada baris ${emptyRowIndex + 1} matriks wajib diisi.`,
        });
        return;
      }
      const missingKeyIndex = matrixRows.findIndex(
        (row) => !row.correctColumn || !matrixColumns.includes(row.correctColumn),
      );
      if (missingKeyIndex !== -1) {
        setFeedback({
          type: "error",
          text: `Baris ${missingKeyIndex + 1} matriks belum memiliki kolom kunci jawaban.`,
        });
        return;
      }
    }

    const emptyOption = formData.options.find(
      (opt) => !opt.content.trim() && !opt.imageUrl?.trim(),
    );
    if (formData.type !== "MATRIX" && emptyOption) {
      setFeedback({
        type: "error",
        text: `Opsi ${emptyOption.label} wajib diisi teks atau lampiran gambar.`,
      });
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
    } else if (formData.type === "WEIGHTED_CHOICE") {
      if (formData.options.length !== 5) {
        setFeedback({
          type: "error",
          text: "Soal opsi berbobot (TKP) wajib memiliki tepat 5 opsi jawaban (A-E).",
        });
        return;
      }
      const scores = formData.options.map((opt) => opt.score);
      if (
        scores.some(
          (s) => typeof s !== "number" || !Number.isInteger(s) || s < 1 || s > 5,
        )
      ) {
        setFeedback({
          type: "error",
          text: "Setiap opsi wajib memiliki skor bilangan bulat 1 sampai 5.",
        });
        return;
      }
      if (new Set(scores).size !== formData.options.length) {
        setFeedback({
          type: "error",
          text: "Skor antar opsi tidak boleh sama (harus unik 1-5).",
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

      // Untuk soal matriks, susun opsi dari tabel baris & kolom editor
      const payload = {
        ...formData,
        imageUrl: formData.imageUrl || null,
        explanation: formData.explanation || null,
        explanationImageUrl: formData.explanationImageUrl || null,
        options:
          formData.type === "MATRIX"
            ? buildMatrixOptions(matrixRows, matrixColumns)
            : formData.options,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        let errorMsg = json.error?.message || "Gagal menyimpan soal.";
        if (json.error?.details && typeof json.error.details === "object") {
          const detailStr = Object.entries(json.error.details)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
            .join("; ");
          if (detailStr && !errorMsg.includes(detailStr)) {
            errorMsg += ` (${detailStr})`;
          }
        }
        setFeedback({
          type: "error",
          text: errorMsg,
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

  const previewMatrix =
    formData.type === "MATRIX"
      ? parseMatrixQuestion(
          buildMatrixOptions(matrixRows, matrixColumns).map((opt, index) => ({
            id: String(index),
            ...opt,
          })),
        )
      : null;

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
                  <CustomSelect
                    value={selectedSubjectId}
                    onChange={(val) => {
                      setSelectedSubjectId(val);
                      setFormData({ ...formData, topicId: "" });
                    }}
                    placeholder="-- Pilih Mata Pelajaran --"
                    options={subjects.map((sub) => ({
                      value: sub.id,
                      label: sub.name,
                    }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Topik / Materi Pokok <span className="text-rose-500">*</span>
                  </label>
                  <CustomSelect
                    value={formData.topicId}
                    onChange={(val) => setFormData({ ...formData, topicId: val })}
                    placeholder="-- Pilih Topik --"
                    options={[
                      { value: "", label: "-- Pilih Topik --" },
                      ...filteredTopics.map((top) => ({
                        value: top.id,
                        label: top.name,
                      })),
                    ]}
                  />
                </div>
              </div>

              {/* Tipe Soal */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tipe / Format Soal
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
                    {
                      val: "MATRIX",
                      title: "Matriks / Tabel",
                      desc: "Beberapa Pernyataan & Kolom",
                    },
                    {
                      val: "WEIGHTED_CHOICE",
                      title: "Opsi Berbobot (TKP)",
                      desc: "5 Opsi, Skor 1–5",
                    },
                  ].map((t) => (
                    <button
                      key={t.val}
                      type="button"
                      onClick={() => handleTypeChange(t.val as QuestionFormType)}
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
                      : formData.type === "MATRIX"
                      ? "Tabel Pernyataan & Kolom Jawaban"
                      : formData.type === "WEIGHTED_CHOICE"
                      ? "Pilihan Jawaban Berbobot (TKP)"
                      : "Pilihan Jawaban (A - E)"}
                  </CardTitle>
                  <CardDescription>
                    {formData.type === "MULTIPLE_CHOICE"
                      ? "Centang kotak untuk menandai semua opsi yang merupakan kunci jawaban benar (minimal 2 kunci benar)."
                      : formData.type === "TRUE_FALSE"
                      ? "Pilih radio button untuk menentukan apakah pernyataan soal bernilai Benar atau Salah."
                      : formData.type === "MATRIX"
                      ? "Tambahkan kolom jawaban (mis. Sesuai / Tidak Sesuai), lalu isi pernyataan per baris dan tandai satu kolom kunci untuk setiap baris."
                      : formData.type === "WEIGHTED_CHOICE"
                      ? "Isi skor 1–5 pada setiap opsi (khas soal TKP). Skor antar opsi harus unik. Jawaban kosong bernilai 0."
                      : "Pilih radio button untuk menandai satu kunci jawaban yang benar."}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {formData.type === "MATRIX" ? (
                <div className="space-y-5">
                  {/* Editor Kolom */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Kolom Jawaban ({matrixColumns.length}/{MAX_MATRIX_COLUMNS})
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addMatrixColumn}
                        disabled={matrixColumns.length >= MAX_MATRIX_COLUMNS}
                        className="gap-1.5 text-[11px] h-8"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Kolom</span>
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {matrixColumns.map((column, columnIndex) => (
                        <div key={columnIndex} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={column}
                            onChange={(e) => handleMatrixColumnChange(columnIndex, e.target.value)}
                            placeholder={`Nama kolom ${columnIndex + 1}...`}
                            className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm text-slate-900 outline-none shadow-xs transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => removeMatrixColumn(columnIndex)}
                            disabled={matrixColumns.length <= 2}
                            title="Hapus kolom"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Editor Baris Pernyataan */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Baris Pernyataan ({matrixRows.length})
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addMatrixRow}
                        className="gap-1.5 text-[11px] h-8"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Baris</span>
                      </Button>
                    </div>

                    {matrixRows.map((row, rowIndex) => (
                      <div
                        key={rowIndex}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 bg-white border border-slate-200 text-slate-700 shadow-xs mt-0.5">
                            {rowIndex + 1}
                          </div>
                          <textarea
                            rows={2}
                            value={row.statement}
                            onChange={(e) =>
                              handleMatrixRowChange(rowIndex, { statement: e.target.value })
                            }
                            placeholder={`Pernyataan ${rowIndex + 1}...`}
                            className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm text-slate-900 outline-none resize-y shadow-xs transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => removeMatrixRow(rowIndex)}
                            disabled={matrixRows.length <= 1}
                            title="Hapus baris"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer mt-0.5"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pl-11">
                          <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                            Kunci:
                          </span>
                          {matrixColumns.map((column) => {
                            const isKey = row.correctColumn === column;
                            return (
                              <button
                                key={column}
                                type="button"
                                onClick={() =>
                                  handleMatrixRowChange(rowIndex, { correctColumn: column })
                                }
                                className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                  isKey
                                    ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                                    : "bg-white border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-700"
                                }`}
                              >
                                {column || "(kolom kosong)"}
                              </button>
                            );
                          })}
                        </div>

                        <div className="pl-11">
                          <ImageUploader
                            compact
                            value={row.imageUrl}
                            onChange={(url) => handleMatrixRowChange(rowIndex, { imageUrl: url })}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                formData.options.map((opt, index) => (
                <div
                  key={opt.label}
                  className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                    formData.type !== "WEIGHTED_CHOICE" && opt.isCorrect
                      ? "border-emerald-400 bg-emerald-50/70 shadow-xs"
                      : "border-slate-200 bg-slate-50/50 hover:bg-slate-50"
                  }`}
                >
                  <div className="pt-1.5">
                    {formData.type === "WEIGHTED_CHOICE" ? (
                      <div className="flex flex-col items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          max={5}
                          required
                          value={opt.score ?? ""}
                          onChange={(e) =>
                            handleOptionScoreChange(index, parseInt(e.target.value, 10))
                          }
                          className="w-14 px-2 py-1.5 text-center text-sm font-bold rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600 shadow-xs"
                          title="Skor opsi (1-5)"
                        />
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Skor</span>
                      </div>
                    ) : formData.type === "MULTIPLE_CHOICE" ? (
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
                    formData.type !== "WEIGHTED_CHOICE" && opt.isCorrect
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-white border border-slate-200 text-slate-700 shadow-xs"
                  }`}>
                    {opt.label}
                  </div>

                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      required={!opt.imageUrl}
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

                  {formData.type === "WEIGHTED_CHOICE" ? (
                    <Badge variant="info" className="shrink-0 self-start mt-1">
                      Skor {opt.score ?? "-"}
                    </Badge>
                  ) : opt.isCorrect ? (
                    <Badge variant={formData.type === "MULTIPLE_CHOICE" ? "info" : "success"} className="shrink-0 self-start mt-1">
                      Kunci Benar
                    </Badge>
                  ) : null}
                </div>
              ))
              )}
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
                      : formData.type === "MATRIX"
                      ? "Matriks / Tabel"
                      : formData.type === "WEIGHTED_CHOICE"
                      ? "Opsi Berbobot (TKP)"
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
                {formData.type === "MATRIX" && previewMatrix ? (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-[360px] text-[11px]">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700">
                          <th className="text-left font-bold px-2.5 py-2">Pernyataan</th>
                          {previewMatrix.columnNames.map((columnName) => (
                            <th key={columnName} className="px-2 py-2 text-center font-bold whitespace-nowrap">
                              {columnName || "—"}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewMatrix.rows.map((row) => (
                          <tr key={row.rowNumber} className="border-t border-slate-200 align-top">
                            <td className="px-2.5 py-2.5 text-slate-800">
                              <span className="font-bold text-slate-500 mr-1">{row.rowNumber}.</span>
                              {row.statement || "(Pernyataan belum diisi)"}
                            </td>
                            {row.columns.map((column) => (
                              <td key={column.optionId} className="px-2 py-2.5 text-center">
                                <span className="inline-block w-4 h-4 rounded-full border border-slate-300" />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  formData.options.map((opt) => (
                    <div
                      key={opt.label}
                      className="p-3 rounded-xl border border-slate-200 bg-white flex items-start gap-3 text-xs shadow-xs"
                    >
                      <div className="w-6 h-6 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 shrink-0 mt-0.5">
                        {opt.label}
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <span className="text-slate-800 block">{opt.content || `(Opsi ${opt.label})`}</span>
                        {formData.type === "WEIGHTED_CHOICE" && (
                          <span className="inline-block text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                            Skor {opt.score ?? "-"}
                          </span>
                        )}
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
                  ))
                )}
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
