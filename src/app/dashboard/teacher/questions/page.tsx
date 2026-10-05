"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileQuestion,
  PlusCircle,
  Search,
  Filter,
  Trash2,
  Edit3,
  CheckCircle2,
  BookOpen,
  HelpCircle,
  Eye,
  AlertCircle,
  FolderPlus,
  FileSpreadsheet,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { QuestionImportModal } from "@/components/teacher/question-import-modal";

interface Option {
  id: string;
  label: string;
  content: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  content: string;
  imageUrl?: string | null;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  explanation?: string | null;
  topic: {
    id: string;
    name: string;
    subject: {
      id: string;
      name: string;
      code?: string | null;
    };
  };
  options: Option[];
  _count: {
    inTryouts: number;
  };
}

interface Subject {
  id: string;
  name: string;
  code?: string | null;
}

interface Topic {
  id: string;
  name: string;
  subjectId: string;
}

export default function TeacherQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("");

  // Topic Modal State
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [newTopicSubjectId, setNewTopicSubjectId] = useState("");
  const [topicModalMsg, setTopicModalMsg] = useState("");

  // Import Excel Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadMetadata();
    loadQuestions();
  }, []);

  const loadMetadata = async () => {
    try {
      const [resSub, resTop] = await Promise.all([
        fetch("/api/teacher/subjects"),
        fetch("/api/teacher/topics"),
      ]);
      const jsonSub = await resSub.json();
      const jsonTop = await resTop.json();
      if (jsonSub.success) setSubjects(jsonSub.data);
      if (jsonTop.success) setTopics(jsonTop.data);
    } catch {
      console.error("Gagal memuat metadata");
    }
  };

  const loadQuestions = async (paramsObj?: Record<string, string>) => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams(paramsObj || {});
      if (search) query.set("search", search);
      if (selectedSubject) query.set("subjectId", selectedSubject);
      if (selectedTopic) query.set("topicId", selectedTopic);
      if (selectedDifficulty) query.set("difficulty", selectedDifficulty);

      const res = await fetch(`/api/teacher/questions?${query.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setQuestions(json.data.questions || []);
      }
    } catch {
      setFeedback({ type: "error", text: "Gagal memuat daftar soal." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    loadQuestions();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus soal ini?")) return;

    try {
      const res = await fetch(`/api/teacher/questions/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setFeedback({ type: "success", text: json.message || "Soal berhasil dihapus." });
        setQuestions((prev) => prev.filter((q) => q.id !== id));
      } else {
        setFeedback({ type: "error", text: json.error?.message || "Gagal menghapus soal." });
      }
    } catch {
      setFeedback({ type: "error", text: "Terjadi kesalahan saat menghapus soal." });
    }
  };

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    setTopicModalMsg("");

    if (!newTopicSubjectId || !newTopicName.trim()) {
      setTopicModalMsg("Mata pelajaran dan nama topik wajib diisi.");
      return;
    }

    try {
      const res = await fetch("/api/teacher/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: newTopicSubjectId,
          name: newTopicName.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setNewTopicName("");
        setIsTopicModalOpen(false);
        setFeedback({ type: "success", text: "Topik baru berhasil ditambahkan!" });
        loadMetadata();
      } else {
        setTopicModalMsg(json.error?.message || "Gagal membuat topik.");
      }
    } catch {
      setTopicModalMsg("Terjadi gangguan jaringan.");
    }
  };

  const filteredTopics = selectedSubject
    ? topics.filter((t) => t.subjectId === selectedSubject)
    : topics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <FileQuestion className="w-8 h-8 text-amber-400" />
            <span>Bank Soal Guru</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Kelola repositori bank soal pilihan ganda, kunci jawaban, dan pembahasan materi
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="md"
            onClick={() => setIsImportModalOpen(true)}
            className="gap-2 border-amber-500/30 text-amber-300 hover:bg-amber-500/10 hover:border-amber-500/50"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-400" />
            <span>Import Excel</span>
          </Button>

          <Button
            variant="outline"
            size="md"
            onClick={() => setIsTopicModalOpen(true)}
            className="gap-2"
          >
            <FolderPlus className="w-4 h-4" />
            <span>+ Topik Materi</span>
          </Button>

          <Link href="/dashboard/teacher/questions/new">
            <Button variant="primary" size="md" className="gap-2">
              <PlusCircle className="w-4 h-4" />
              <span>Buat Soal Baru</span>
            </Button>
          </Link>
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

      {/* Filter Bar */}
      <Card className="p-4 bg-slate-900/50">
        <form onSubmit={handleApplyFilter} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari teks soal atau pembahasan..."
              className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <select
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setSelectedTopic("");
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 outline-none focus:border-indigo-500"
            >
              <option value="">Semua Mapel</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 outline-none focus:border-indigo-500"
            >
              <option value="">Semua Topik</option>
              {filteredTopics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 outline-none focus:border-indigo-500"
            >
              <option value="">Semua Kesulitan</option>
              <option value="EASY">Mudah</option>
              <option value="MEDIUM">Sedang</option>
              <option value="HARD">Sulit</option>
            </select>

            <Button type="submit" size="sm" variant="secondary" className="px-3 shrink-0">
              <Filter className="w-3.5 h-3.5" />
            </Button>
          </div>
        </form>
      </Card>

      {/* List Soal */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : questions.length === 0 ? (
        <EmptyState
          icon={<FileQuestion className="w-12 h-12 text-slate-600" />}
          title="Tidak Ada Soal yang Sesuai"
          description="Belum ada soal dengan filter yang dipilih atau bank soal masih kosong."
          action={
            <Link href="/dashboard/teacher/questions/new">
              <Button size="sm" variant="primary">
                + Tambah Soal Pertama
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="text-xs text-slate-400 font-medium">
            Menampilkan <strong className="text-white">{questions.length}</strong> butir soal:
          </div>

          {questions.map((q, idx) => (
            <Card key={q.id} className="p-5 space-y-4 border-slate-800/80 hover:border-slate-700/80 transition-all">
              {/* Header Card Soal */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-600/20 text-indigo-400 text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <Badge variant="info">{q.topic.subject.name}</Badge>
                  <Badge variant="outline">{q.topic.name}</Badge>
                  <Badge
                    variant={
                      q.difficulty === "HARD"
                        ? "danger"
                        : q.difficulty === "MEDIUM"
                          ? "warning"
                          : "success"
                    }
                  >
                    {q.difficulty}
                  </Badge>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-500">
                    {q._count.inTryouts > 0 ? `Dipakai di ${q._count.inTryouts} tryout` : "Belum dipakai"}
                  </span>
                  <Link href={`/dashboard/teacher/questions/${q.id}/edit`}>
                    <Button size="sm" variant="outline" className="px-2.5 py-1 text-xs gap-1">
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </Button>
                  </Link>
                  <button
                    onClick={() => handleDelete(q.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Hapus Soal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Teks Pertanyaan */}
              <div className="text-sm font-medium text-slate-200 leading-relaxed">
                {q.content}
              </div>

              {q.imageUrl && (
                <div className="max-w-md p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <img src={q.imageUrl} alt="Gambar Soal" className="rounded-lg object-contain max-h-48" />
                </div>
              )}

              {/* Opsi Jawaban (A - E) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {q.options.map((opt) => (
                  <div
                    key={opt.id}
                    className={`p-2.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                      opt.isCorrect
                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300 font-semibold"
                        : "border-slate-800/80 bg-slate-950/40 text-slate-300"
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                        opt.isCorrect
                          ? "bg-emerald-500 text-slate-950"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {opt.label}
                    </span>
                    <span className="flex-1 truncate">{opt.content}</span>
                    {opt.isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                  </div>
                ))}
              </div>

              {/* Pembahasan Soal */}
              {q.explanation && (
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/60 text-xs">
                  <span className="font-bold text-indigo-400">💡 Pembahasan:</span>
                  <p className="text-slate-400 mt-1 leading-relaxed">{q.explanation}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Modal Tambah Topik */}
      {isTopicModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Tambah Topik Materi Pokok</h3>
            <p className="text-xs text-slate-400 mb-4">
              Topik materi digunakan untuk kategorisasi soal dan analitik diagnostik penguasaan siswa.
            </p>

            {topicModalMsg && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
                {topicModalMsg}
              </div>
            )}

            <form onSubmit={handleCreateTopic} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Mata Pelajaran
                </label>
                <select
                  required
                  value={newTopicSubjectId}
                  onChange={(e) => setNewTopicSubjectId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 outline-none"
                >
                  <option value="">-- Pilih Mata Pelajaran --</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Nama Topik / Bab
                </label>
                <input
                  type="text"
                  required
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  placeholder="Contoh: Interaksi Sosial, Aljabar Linear"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTopicModalOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" size="sm" variant="primary">
                  Simpan Topik
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Import Soal Excel */}
      <QuestionImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          loadQuestions();
          setFeedback({
            type: "success",
            text: "Soal dari Excel berhasil diimpor dan diperbarui di daftar.",
          });
        }}
      />
    </div>
  );
}
