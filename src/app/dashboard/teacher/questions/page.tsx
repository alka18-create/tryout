"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  ArrowLeft,
  ChevronRight,
  GraduationCap,
  Layers,
  FileText,
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
  description?: string | null;
  _count?: {
    topics: number;
    tryouts: number;
    questions: number;
  };
}

interface Topic {
  id: string;
  name: string;
  subjectId: string;
}

function TeacherQuestionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSubjectId = searchParams.get("subjectId") || "";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubjectsLoading, setIsSubjectsLoading] = useState(true);

  // Active Subject Navigation
  const [selectedSubject, setSelectedSubject] = useState(initialSubjectId);
  const [subjectSearch, setSubjectSearch] = useState("");

  // Question Filter States (Saat di dalam kumpulan soal suatu mapel)
  const [search, setSearch] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("");

  // Modals State
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectCode, setNewSubjectCode] = useState("");
  const [newSubjectDesc, setNewSubjectDesc] = useState("");
  const [subjectModalMsg, setSubjectModalMsg] = useState("");

  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [newTopicSubjectId, setNewTopicSubjectId] = useState("");
  const [topicModalMsg, setTopicModalMsg] = useState("");

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadMetadata();
  }, []);

  // Sinkronisasi saat query param berubah atau saat subjectId terpilih
  useEffect(() => {
    const urlSubjectId = searchParams.get("subjectId") || "";
    setSelectedSubject(urlSubjectId);
    if (urlSubjectId) {
      loadQuestions({ subjectId: urlSubjectId });
    }
  }, [searchParams]);

  const loadMetadata = async () => {
    setIsSubjectsLoading(true);
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
    } finally {
      setIsSubjectsLoading(false);
    }
  };

  const loadQuestions = async (paramsObj?: Record<string, string>) => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams(paramsObj || {});
      const activeSub = paramsObj?.subjectId !== undefined ? paramsObj.subjectId : selectedSubject;

      if (activeSub) query.set("subjectId", activeSub);
      if (search) query.set("search", search);
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

  const handleSelectSubject = (subjectId: string) => {
    setSelectedSubject(subjectId);
    setSelectedTopic("");
    setSearch("");
    setSelectedDifficulty("");
    router.push(`/dashboard/teacher/questions?subjectId=${subjectId}`);
    loadQuestions({ subjectId });
  };

  const handleBackToSubjects = () => {
    setSelectedSubject("");
    setSelectedTopic("");
    setSearch("");
    setSelectedDifficulty("");
    router.push("/dashboard/teacher/questions");
    loadMetadata();
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
        loadMetadata(); // update total count
      } else {
        setFeedback({ type: "error", text: json.error?.message || "Gagal menghapus soal." });
      }
    } catch {
      setFeedback({ type: "error", text: "Terjadi kesalahan saat menghapus soal." });
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubjectModalMsg("");

    if (!newSubjectName.trim() || !newSubjectCode.trim()) {
      setSubjectModalMsg("Nama dan kode mata pelajaran wajib diisi.");
      return;
    }

    try {
      const res = await fetch("/api/teacher/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSubjectName.trim(),
          code: newSubjectCode.trim().toUpperCase(),
          description: newSubjectDesc.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setNewSubjectName("");
        setNewSubjectCode("");
        setNewSubjectDesc("");
        setIsSubjectModalOpen(false);
        setFeedback({ type: "success", text: "Mata pelajaran baru berhasil ditambahkan!" });
        loadMetadata();
      } else {
        setSubjectModalMsg(json.error?.message || "Gagal membuat mata pelajaran.");
      }
    } catch {
      setSubjectModalMsg("Terjadi gangguan jaringan.");
    }
  };

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    setTopicModalMsg("");

    const targetSubId = newTopicSubjectId || selectedSubject;

    if (!targetSubId || !newTopicName.trim()) {
      setTopicModalMsg("Mata pelajaran dan nama topik wajib diisi.");
      return;
    }

    try {
      const res = await fetch("/api/teacher/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: targetSubId,
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

  const currentSubject = subjects.find((s) => s.id === selectedSubject);

  const filteredTopics = selectedSubject
    ? topics.filter((t) => t.subjectId === selectedSubject)
    : topics;

  const filteredSubjects = subjects.filter((s) => {
    const q = subjectSearch.toLowerCase();
    return s.name.toLowerCase().includes(q) || (s.code && s.code.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      {/* Feedback Banner Global */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center justify-between gap-3 border animate-in fade-in duration-200 ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            )}
            <span className="font-medium">{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs text-slate-400 hover:text-slate-600 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: KATALOG MATA PELAJARAN (TAMPIL SAAT BELUM MEMILIH MAPEL)          */}
      {/* ========================================================================= */}
      {!selectedSubject ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header Katalog Mapel */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                <BookOpen className="w-8 h-8 text-blue-600" />
                <span>Bank Soal & Materi</span>
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Pilih mata pelajaran di bawah untuk melihat dan mengelola kumpulan butir soal, atau gunakan tombol import untuk memasukkan soal sekaligus via Excel.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="outline"
                size="md"
                onClick={() => setIsImportModalOpen(true)}
                className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 shadow-xs"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Import Excel</span>
              </Button>

              <Button
                variant="outline"
                size="md"
                onClick={() => setIsSubjectModalOpen(true)}
                className="gap-2 shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Mata Pelajaran</span>
              </Button>

              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  setNewTopicSubjectId(subjects[0]?.id || "");
                  setIsTopicModalOpen(true);
                }}
                className="gap-2 shadow-xs"
              >
                <FolderPlus className="w-4 h-4" />
                <span>+ Topik Materi</span>
              </Button>
            </div>
          </div>

          {/* Search Bar Mapel */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-full max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={subjectSearch}
                onChange={(e) => setSubjectSearch(e.target.value)}
                placeholder="Cari nama atau kode mata pelajaran..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 shadow-xs transition-colors"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium shrink-0">
              Total: <strong className="text-slate-900">{filteredSubjects.length}</strong> Mata Pelajaran
            </div>
          </div>

          {/* Grid Kartu Mata Pelajaran */}
          {isSubjectsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <Skeleton className="h-48 w-full rounded-2xl" />
              <Skeleton className="h-48 w-full rounded-2xl" />
              <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
          ) : filteredSubjects.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="w-12 h-12 text-slate-400" />}
              title="Mata Pelajaran Tidak Ditemukan"
              description={
                subjectSearch
                  ? `Tidak ada mata pelajaran yang cocok dengan pencarian "${subjectSearch}".`
                  : "Belum ada mata pelajaran yang terdaftar di sistem."
              }
              action={
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setIsSubjectModalOpen(true)}
                  className="gap-2 shadow-xs"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Tambah Mata Pelajaran Pertama</span>
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredSubjects.map((sub) => {
                const questionCount = sub._count?.questions || 0;
                const topicCount = sub._count?.topics || 0;
                const tryoutCount = sub._count?.tryouts || 0;

                return (
                  <Card
                    key={sub.id}
                    className="p-5 flex flex-col justify-between bg-white border-slate-200/90 hover:border-blue-300 hover:shadow-md transition-all duration-200 group shadow-xs"
                  >
                    <div className="space-y-3.5">
                      {/* Top Header Card */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        {sub.code && (
                          <Badge variant="outline" className="font-mono font-bold text-blue-700 border-blue-200 bg-blue-50/50">
                            {sub.code}
                          </Badge>
                        )}
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {sub.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {sub.description || "Mata pelajaran kurikulum TryoutKu."}
                        </p>
                      </div>

                      {/* Stat Counters */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/70">
                          <p className="text-[10px] text-slate-500 uppercase font-semibold">Soal</p>
                          <p className="text-sm font-black text-blue-600 mt-0.5">{questionCount}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/70">
                          <p className="text-[10px] text-slate-500 uppercase font-semibold">Topik</p>
                          <p className="text-sm font-black text-indigo-600 mt-0.5">{topicCount}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/70">
                          <p className="text-[10px] text-slate-500 uppercase font-semibold">Tryout</p>
                          <p className="text-sm font-black text-slate-700 mt-0.5">{tryoutCount}</p>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-4 mt-2">
                      <Button
                        variant="primary"
                        size="md"
                        onClick={() => handleSelectSubject(sub.id)}
                        className="w-full justify-between text-xs font-semibold shadow-xs"
                      >
                        <span>Buka Kumpulan Soal</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* VIEW 2: KUMPULAN SOAL PADA MATA PELAJARAN YANG TERPILIH                   */
        /* ========================================================================= */
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Tombol Navigasi Kembali */}
          <div>
            <button
              onClick={handleBackToSubjects}
              className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline underline-offset-4 transition-colors group cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
              <span>Kembali ke Daftar Mata Pelajaran</span>
            </button>
          </div>

          {/* Header Mapel Terpilih */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                  <FileQuestion className="w-8 h-8 text-blue-600" />
                  <span>Bank Soal: {currentSubject?.name || "Mata Pelajaran"}</span>
                </h1>
                {currentSubject?.code && (
                  <Badge variant="outline" className="font-mono font-bold text-blue-700 border-blue-200 bg-blue-50/50">
                    {currentSubject.code}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Koleksi butir soal pilihan ganda, kunci jawaban, dan pembahasan materi pada mata pelajaran ini.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="outline"
                size="md"
                onClick={() => setIsImportModalOpen(true)}
                className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 shadow-xs"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Import Excel</span>
              </Button>

              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  setNewTopicSubjectId(selectedSubject);
                  setIsTopicModalOpen(true);
                }}
                className="gap-2 shadow-xs"
              >
                <FolderPlus className="w-4 h-4" />
                <span>+ Topik Materi</span>
              </Button>

              <Link href={`/dashboard/teacher/questions/new`}>
                <Button variant="primary" size="md" className="gap-2 shadow-xs">
                  <PlusCircle className="w-4 h-4" />
                  <span>Buat Soal Baru</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Filter Bar Soal */}
          <Card className="p-4 bg-white border-slate-200/90 shadow-xs">
            <form onSubmit={handleApplyFilter} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="lg:col-span-2 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari teks soal atau pembahasan..."
                  className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <select
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 outline-none focus:border-blue-600"
                >
                  <option value="">Semua Topik {currentSubject ? `(${currentSubject.name})` : ""}</option>
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
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 outline-none focus:border-blue-600"
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
              <Skeleton className="h-40 w-full rounded-2xl" />
              <Skeleton className="h-40 w-full rounded-2xl" />
              <Skeleton className="h-40 w-full rounded-2xl" />
            </div>
          ) : questions.length === 0 ? (
            <EmptyState
              icon={<FileQuestion className="w-12 h-12 text-slate-400" />}
              title={`Belum Ada Soal pada Mapel ${currentSubject?.name || ""}`}
              description="Buat soal pertama Anda untuk mata pelajaran ini atau impor banyak soal sekaligus dari template Excel."
              action={
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsImportModalOpen(true)}
                    className="gap-2 shadow-xs"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Import Excel</span>
                  </Button>
                  <Link href={`/dashboard/teacher/questions/new`}>
                    <Button size="sm" variant="primary" className="shadow-xs">
                      + Tambah Soal Baru
                    </Button>
                  </Link>
                </div>
              }
            />
          ) : (
            <div className="space-y-4">
              <div className="text-xs text-slate-500 font-medium">
                Menampilkan <strong className="text-slate-900">{questions.length}</strong> butir soal pada mata pelajaran{" "}
                <strong className="text-blue-600">{currentSubject?.name}</strong>:
              </div>

              {questions.map((q, idx) => (
                <Card
                  key={q.id}
                  className="p-5 space-y-4 bg-white border-slate-200/90 hover:border-blue-300 transition-all shadow-xs"
                >
                  {/* Header Card Soal */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {q.topic.name}
                      </Badge>
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
                      <span className="text-[11px] text-slate-400 font-medium">
                        {q._count.inTryouts > 0 ? `Dipakai di ${q._count.inTryouts} tryout` : "Belum dipakai"}
                      </span>
                      <Link href={`/dashboard/teacher/questions/${q.id}/edit`}>
                        <Button size="sm" variant="outline" className="px-2.5 py-1 text-xs gap-1 shadow-xs">
                          <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Edit</span>
                        </Button>
                      </Link>
                      <button
                        onClick={() => handleDelete(q.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Hapus Soal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Isi Pertanyaan */}
                  <div className="text-sm text-slate-800 font-medium leading-relaxed whitespace-pre-wrap">
                    {q.content}
                  </div>

                  {/* Gambar Soal (Jika Ada) */}
                  {q.imageUrl && (
                    <div className="max-w-md rounded-xl overflow-hidden border border-slate-200 bg-slate-50 p-1">
                      <img src={q.imageUrl} alt="Lampiran Soal" className="w-full object-cover rounded-lg" />
                    </div>
                  )}

                  {/* Opsi Jawaban */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    {q.options.map((opt) => (
                      <div
                        key={opt.id}
                        className={`p-2.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                          opt.isCorrect
                            ? "border-emerald-300 bg-emerald-50/80 text-emerald-950 font-semibold"
                            : "border-slate-200 bg-slate-50/60 text-slate-700"
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                            opt.isCorrect
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {opt.label}
                        </span>
                        <span className="flex-1 truncate">{opt.content}</span>
                        {opt.isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                      </div>
                    ))}
                  </div>

                  {/* Pembahasan Soal */}
                  {q.explanation && (
                    <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs">
                      <span className="font-bold text-blue-900">💡 Pembahasan:</span>
                      <p className="text-blue-950 mt-1 leading-relaxed">{q.explanation}</p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: TAMBAH MATA PELAJARAN                                            */}
      {/* ========================================================================= */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-xl space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <span>Tambah Mata Pelajaran Baru</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Mata pelajaran akan menjadi wadah pengelompokan topik materi dan bank soal.
              </p>
            </div>

            {subjectModalMsg && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                {subjectModalMsg}
              </div>
            )}

            <form onSubmit={handleCreateSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Nama Mata Pelajaran *
                </label>
                <input
                  type="text"
                  required
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder="Contoh: Matematika Wajib, Biologi, Kimia"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 outline-none focus:border-blue-600 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Kode Mata Pelajaran *
                </label>
                <input
                  type="text"
                  required
                  value={newSubjectCode}
                  onChange={(e) => setNewSubjectCode(e.target.value.toUpperCase())}
                  placeholder="Contoh: MAT, BIO, KIM"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 outline-none focus:border-blue-600 font-mono shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Deskripsi (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={newSubjectDesc}
                  onChange={(e) => setNewSubjectDesc(e.target.value)}
                  placeholder="Deskripsi singkat mengenai mata pelajaran ini..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 outline-none focus:border-blue-600 shadow-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSubjectModalOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" size="sm" variant="primary" className="shadow-xs">
                  Simpan Mata Pelajaran
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: TAMBAH TOPIK MATERI                                              */}
      {/* ========================================================================= */}
      {isTopicModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-xl space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-blue-600" />
                <span>Tambah Topik Materi Pokok</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Topik materi digunakan untuk kategorisasi soal dan analitik penguasaan materi (*Topic Mastery*).
              </p>
            </div>

            {topicModalMsg && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                {topicModalMsg}
              </div>
            )}

            <form onSubmit={handleCreateTopic} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Mata Pelajaran *
                </label>
                <select
                  required
                  value={newTopicSubjectId || selectedSubject}
                  onChange={(e) => setNewTopicSubjectId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 outline-none focus:border-blue-600 shadow-xs"
                >
                  <option value="">-- Pilih Mata Pelajaran --</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code || "-"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Nama Topik / Bab Materi *
                </label>
                <input
                  type="text"
                  required
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  placeholder="Contoh: Interaksi Sosial, Aljabar Linear"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 outline-none focus:border-blue-600 shadow-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTopicModalOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" size="sm" variant="primary" className="shadow-xs">
                  Simpan Topik
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: IMPORT SOAL DARI EXCEL                                           */}
      {/* ========================================================================= */}
      <QuestionImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          loadMetadata();
          if (selectedSubject) {
            loadQuestions({ subjectId: selectedSubject });
          }
          setFeedback({
            type: "success",
            text: "Soal dari Excel berhasil diimpor ke sistem!",
          });
        }}
      />
    </div>
  );
}

export default function TeacherQuestionsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <TeacherQuestionsContent />
    </Suspense>
  );
}
