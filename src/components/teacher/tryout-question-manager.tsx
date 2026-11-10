"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  Lock,
  Layers,
  HelpCircle,
  Search,
  Filter,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CustomSelect } from "@/components/ui/custom-select";
import { formatMatrixOptionLabel } from "@/lib/matrix-question";

interface QuestionOption {
  id: string;
  label: string;
  content: string;
  isCorrect: boolean;
  score?: number | null;
  imageUrl?: string | null;
}

type SkdSectionValue = "TWK" | "TIU" | "TKP";

interface Question {
  id: string;
  content: string;
  imageUrl?: string | null;
  type?: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE" | "MATRIX" | "WEIGHTED_CHOICE";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  topicId: string;
  topic: {
    id: string;
    name: string;
    subject?: {
      id: string;
      name: string;
    } | null;
  };
  explanation?: string | null;
  options: QuestionOption[];
}

interface AttachedQuestion {
  questionId: string;
  orderNumber: number;
  weight: number;
  section?: SkdSectionValue | null;
  question: Question;
}

interface TryoutDetail {
  id: string;
  title: string;
  durationMinutes: number;
  passingScore: number;
  scoringMode: "NORMALIZED" | "RAW";
  passingTwk?: number | null;
  passingTiu?: number | null;
  passingTkp?: number | null;
  questionCount?: number | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  subjectId: string;
  subject: {
    id: string;
    name: string;
  };
  isLocked: boolean;
  tryoutQuestions: AttachedQuestion[];
}

export function TryoutQuestionManager({ initialTryout }: { initialTryout: TryoutDetail }) {
  const [tryout, setTryout] = useState<TryoutDetail>(initialTryout);
  const [questions, setQuestions] = useState<AttachedQuestion[]>(
    initialTryout.tryoutQuestions.sort((a, b) => a.orderNumber - b.orderNumber)
  );

  // Bank Soal picker state
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [isFetchingBank, setIsFetchingBank] = useState(false);
  const [bankSearch, setBankSearch] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<string>("ALL");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("ALL");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  // Kategori subtes yang diterapkan saat menambahkan soal dari bank (mode RAW/SKD)
  const [bankSection, setBankSection] = useState<SkdSectionValue>("TWK");
  // Filter mata pelajaran pada modal bank soal (mode RAW/SKD: soal bisa berasal dari banyak mapel)
  const [bankSubject, setBankSubject] = useState<string>("ALL");

  // Preview modal state
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [isFullPreviewOpen, setIsFullPreviewOpen] = useState(false);
  const [previewActiveIndex, setPreviewActiveIndex] = useState(0);

  // Feedback & Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Ambil bank soal ketika modal dibuka
  const openBankModal = async () => {
    setIsBankModalOpen(true);
    setIsFetchingBank(true);
    setBankSubject("ALL");
    setBankSearch("");
    setSelectedTopic("ALL");
    setSelectedDifficulty("ALL");
    setSelectedQuestionIds(new Set());
    try {
      // Mode RAW/SKD: soal TKP/TIU/TWK bisa tersimpan di mata pelajaran berbeda,
      // jadi tampilkan bank soal dari seluruh mata pelajaran (dan semua halaman).
      // Mode NORMALIZED: tampilkan bank soal sesuai mata pelajaran paket.
      const baseUrl =
        tryout.scoringMode === "RAW"
          ? "/api/teacher/questions"
          : `/api/teacher/questions?subjectId=${tryout.subjectId}`;

      const collected: Question[] = [];
      let page = 1;
      const pageSize = 500;
      while (true) {
        const url = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}page=${page}&limit=${pageSize}`;
        const res = await fetch(url);
        if (!res.ok) {
          setFeedback({
            type: "error",
            text: (await res.json().catch(() => null))?.error?.message || "Gagal mengambil bank soal.",
          });
          return;
        }
        const json = await res.json();
        if (!json.success) {
          setFeedback({ type: "error", text: json.error?.message || "Gagal mengambil bank soal." });
          return;
        }
        const questionsList: Question[] = Array.isArray(json.data)
          ? json.data
          : (json.data?.questions || []);
        collected.push(...questionsList);
        const pagination = json.data?.pagination;
        if (!pagination || page >= pagination.totalPages) break;
        page += 1;
      }

      // Filter out questions that are already in this tryout
      const existingIds = new Set(questions.map((q) => q.questionId));
      setAvailableQuestions(collected.filter((q) => !existingIds.has(q.id)));
    } catch {
      setFeedback({ type: "error", text: "Gagal mengambil bank soal." });
    } finally {
      setIsFetchingBank(false);
    }
  };

  // Move Question Up
  const moveUp = (index: number) => {
    if (index === 0 || tryout.isLocked) return;
    const newItems = [...questions];
    const temp = newItems[index];
    newItems[index] = newItems[index - 1];
    newItems[index - 1] = temp;
    // Recalculate orderNumber
    const reordered = newItems.map((item, idx) => ({
      ...item,
      orderNumber: idx + 1,
    }));
    setQuestions(reordered);
  };

  // Move Question Down
  const moveDown = (index: number) => {
    if (index === questions.length - 1 || tryout.isLocked) return;
    const newItems = [...questions];
    const temp = newItems[index];
    newItems[index] = newItems[index + 1];
    newItems[index + 1] = temp;
    // Recalculate orderNumber
    const reordered = newItems.map((item, idx) => ({
      ...item,
      orderNumber: idx + 1,
    }));
    setQuestions(reordered);
  };

  // Remove Question
  const removeQuestion = (questionId: string) => {
    if (tryout.isLocked) return;
    const newItems = questions
      .filter((q) => q.questionId !== questionId)
      .map((item, idx) => ({
        ...item,
        orderNumber: idx + 1,
      }));
    setQuestions(newItems);
  };

  // Change Weight
  const updateWeight = (questionId: string, weight: number) => {
    if (tryout.isLocked) return;
    setQuestions((prev) =>
      prev.map((item) =>
        item.questionId === questionId ? { ...item, weight: Math.max(0.1, weight) } : item
      )
    );
  };

  // Change Section (kategori subtes SKD)
  const updateSection = (questionId: string, section: SkdSectionValue) => {
    if (tryout.isLocked) return;
    setQuestions((prev) =>
      prev.map((item) =>
        item.questionId === questionId
          ? {
              ...item,
              section,
              // Bobot default SKD: TWK/TIU 5 poin per soal benar; TKP memakai skor opsi (1-5).
              weight: section === "TKP" ? 1 : 5,
            }
          : item
      )
    );
  };

  // Add Selected from Bank Soal
  const handleAddSelectedQuestions = () => {
    const toAdd = availableQuestions.filter((q) => selectedQuestionIds.has(q.id));
    const nextOrder = questions.length + 1;
    const isRaw = tryout.scoringMode === "RAW";
    const section = isRaw ? bankSection : null;
    const defaultWeight = isRaw ? (section === "TKP" ? 1 : 5) : 1.0;

    const newAttached: AttachedQuestion[] = toAdd.map((q, idx) => ({
      questionId: q.id,
      orderNumber: nextOrder + idx,
      weight: defaultWeight,
      section,
      question: q,
    }));

    setQuestions([...questions, ...newAttached]);
    setSelectedQuestionIds(new Set());
    setIsBankModalOpen(false);
  };

  // Save Questions via API
  const handleSave = async () => {
    if (tryout.isLocked) return;
    setIsSaving(true);
    setFeedback(null);

    // Mode RAW/SKD: setiap soal wajib punya kategori subtes.
    if (tryout.scoringMode === "RAW") {
      const missing = questions.find((q) => !q.section);
      if (missing) {
        setFeedback({
          type: "error",
          text: "Mode skor mentah (SKD) mewajibkan setiap soal memiliki kategori subtes (TWK/TIU/TKP).",
        });
        setIsSaving(false);
        return;
      }
    }

    try {
      const payload = {
        questions: questions.map((q) => ({
          questionId: q.questionId,
          orderNumber: q.orderNumber,
          weight: q.weight,
          section: q.section ?? null,
        })),
      };

      const res = await fetch(`/api/teacher/tryouts/${tryout.id}/questions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setFeedback({
          type: "error",
          text: json.error?.message || "Gagal menyimpan susunan soal.",
        });
        setIsSaving(false);
        return;
      }

      setFeedback({
        type: "success",
        text: `Susunan soal berhasil disimpan! Total: ${questions.length} butir soal.`,
      });
      setIsSaving(false);
    } catch {
      setFeedback({ type: "error", text: "Terjadi kesalahan saat menyimpan susunan soal." });
      setIsSaving(false);
    }
  };

  const totalWeight = questions.reduce((acc, cur) => acc + cur.weight, 0);
  // Skor maksimum: TWK/TIU memakai bobot soal, TKP memakai skor opsi tertinggi.
  const maxScore = questions.reduce(
    (acc, cur) =>
      acc +
      (cur.question.type === "WEIGHTED_CHOICE"
        ? Math.max(0, ...cur.question.options.map((o) => o.score ?? 0))
        : cur.weight),
    0,
  );

  const isRaw = tryout.scoringMode === "RAW";
  const sectionCounts = {
    TWK: questions.filter((q) => q.section === "TWK").length,
    TIU: questions.filter((q) => q.section === "TIU").length,
    TKP: questions.filter((q) => q.section === "TKP").length,
  };
  const skdTarget = { TWK: 30, TIU: 35, TKP: 45 };
  const isSkdComposition =
    sectionCounts.TWK === skdTarget.TWK &&
    sectionCounts.TIU === skdTarget.TIU &&
    sectionCounts.TKP === skdTarget.TKP;

  // Unique topics from available bank questions
  const availableTopics = Array.from(
    new Set(availableQuestions.map((q) => q.topic?.name).filter(Boolean))
  );

  // Unique mata pelajaran dari bank soal (mode RAW/SKD)
  const availableSubjects = Array.from(
    new Map(
      availableQuestions
        .map((q) => q.topic?.subject)
        .filter((s): s is { id: string; name: string } => Boolean(s && s.name))
        .map((s) => [s.id, s.name]),
    ).entries(),
  ).map(([id, name]) => ({ id, name }));

  const filteredBankQuestions = availableQuestions.filter((q) => {
    const matchesSearch = q.content.toLowerCase().includes(bankSearch.toLowerCase());
    const matchesTopic = selectedTopic === "ALL" || q.topic?.name === selectedTopic;
    const matchesDiff = selectedDifficulty === "ALL" || q.difficulty === selectedDifficulty;
    const matchesSubject =
      bankSubject === "ALL" || q.topic?.subject?.id === bankSubject;
    return matchesSearch && matchesTopic && matchesDiff && matchesSubject;
  });

  const handleSelectAllBank = () => {
    const allFilteredIds = filteredBankQuestions.map((q) => q.id);
    const isAllSelected =
      allFilteredIds.length > 0 &&
      allFilteredIds.every((id) => selectedQuestionIds.has(id));

    const newSet = new Set(selectedQuestionIds);
    if (isAllSelected) {
      allFilteredIds.forEach((id) => newSet.delete(id));
    } else {
      allFilteredIds.forEach((id) => newSet.add(id));
    }
    setSelectedQuestionIds(newSet);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="space-y-1">
          <Link
            href="/dashboard/teacher/tryouts"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Paket Tryout</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{tryout.title}</h1>
            <Badge variant="info">{tryout.subject.name}</Badge>
            <Badge
              variant={
                tryout.status === "PUBLISHED"
                  ? "success"
                  : tryout.status === "DRAFT"
                  ? "warning"
                  : "default"
              }
            >
              {tryout.status}
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            Atur urutan nomor soal, bobot nilai, atau tambahkan butir soal baru dari bank soal.
          </p>
        </div>

        {/* Action Header Buttons */}
        <div className="flex items-center gap-2">
          {questions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPreviewActiveIndex(0);
                setIsFullPreviewOpen(true);
              }}
              className="gap-1.5 text-xs shadow-xs"
            >
              <Eye className="w-3.5 h-3.5 text-blue-600" />
              <span>Preview Simulasi Siswa</span>
            </Button>
          )}

          {!tryout.isLocked && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              isLoading={isSaving}
              className="gap-1.5 text-xs shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Susunan ({questions.length})</span>
            </Button>
          )}
        </div>
      </div>

      {/* Locked Notice Banner */}
      {tryout.isLocked && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-start gap-3">
          <Lock className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-bold">Susunan Soal Dikunci</h4>
            <p className="text-xs text-amber-700 mt-0.5">
              Paket tryout ini sudah memiliki sesi ujian peserta. Urutan dan pilihan soal dikunci secara
              permanen untuk mencegah ketidaksesuaian data nilai historis peserta.
            </p>
          </div>
        </div>
      )}

      {/* Feedback Alert */}
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border-slate-200/90 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">
            {tryout.questionCount ? "Soal Ditampilkan" : "Total Soal"}
          </span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {tryout.questionCount ? (
              <div className="flex flex-col">
                <span>{tryout.questionCount} Butir</span>
                <span className="text-xs font-normal text-slate-500 mt-0.5">
                  dari {questions.length} butir bank soal
                </span>
              </div>
            ) : (
              `${questions.length} Butir`
            )}
          </div>
        </Card>
        <Card className="p-4 bg-white border-slate-200/90 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">
            {isRaw ? "Skor Maksimum" : "Total Bobot Nilai"}
          </span>
          <div className="text-2xl font-extrabold text-blue-600 mt-1">
            {isRaw ? `${maxScore} Poin` : `${totalWeight} Poin`}
          </div>
        </Card>
        <Card className="p-4 bg-white border-slate-200/90 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Durasi Ujian</span>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">
            {tryout.durationMinutes} Menit
          </div>
        </Card>
        <Card className="p-4 bg-white border-slate-200/90 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">
            {isRaw ? "Ambang Batas" : "Standar KKM"}
          </span>
          {isRaw ? (
            <div className="mt-1 space-y-0.5 text-[11px] font-bold text-amber-700">
              <div>TWK ≥ {tryout.passingTwk ?? "-"}</div>
              <div>TIU ≥ {tryout.passingTiu ?? "-"}</div>
              <div>TKP ≥ {tryout.passingTkp ?? "-"}</div>
            </div>
          ) : (
            <div className="text-2xl font-extrabold text-amber-600 mt-1">
              {tryout.passingScore} / 100
            </div>
          )}
        </Card>
      </div>

      {/* Ringkasan Komposisi Subtes SKD */}
      {isRaw && (
        <div
          className={`p-4 rounded-xl border ${
            isSkdComposition
              ? "bg-emerald-50 border-emerald-200"
              : "bg-blue-50 border-blue-200"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4
                className={`text-sm font-bold ${
                  isSkdComposition ? "text-emerald-900" : "text-blue-900"
                }`}
              >
                Komposisi Subtes SKD
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Target SKD: TWK 30 • TIU 35 • TKP 45 (total 110 soal).{" "}
                {isSkdComposition
                  ? "Komposisi sudah sesuai."
                  : "Sesuaikan jumlah soal per subtes."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {(["TWK", "TIU", "TKP"] as const).map((s) => (
                <div
                  key={s}
                  className="text-center px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-xs"
                >
                  <div className="text-[10px] font-bold text-slate-500">{s}</div>
                  <div
                    className={`text-sm font-extrabold ${
                      sectionCounts[s] === skdTarget[s]
                        ? "text-emerald-600"
                        : "text-amber-600"
                    }`}
                  >
                    {sectionCounts[s]}
                    <span className="text-[10px] text-slate-400 font-medium">
                      /{skdTarget[s]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Warning banner jika soal kurang dari target tampil */}
      {tryout.questionCount && questions.length < tryout.questionCount && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="font-bold">Target Soal Belum Terpenuhi</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Paket ini diatur untuk menampilkan <strong>{tryout.questionCount} butir soal acak</strong> ke peserta, namun saat ini baru dipilih <strong>{questions.length} butir soal</strong> dari bank soal. Tambahkan minimal <strong>{tryout.questionCount - questions.length} butir soal lagi</strong> agar paket tryout dapat dipublikasikan.
            </p>
          </div>
        </div>
      )}

      {/* Main List of Attached Questions */}
      <Card className="bg-white border-slate-200/90 shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <CardTitle className="text-lg text-slate-900">Urutan Soal Tryout</CardTitle>
            <CardDescription className="text-slate-500">
              Gunakan tombol panah untuk mengubah nomor urut pengerjaan soal peserta
            </CardDescription>
          </div>
          {!tryout.isLocked && (
            <Button
              variant="secondary"
              size="sm"
              onClick={openBankModal}
              className="gap-1.5 text-xs shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>Ambil dari Bank Soal</span>
            </Button>
          )}
        </CardHeader>

        <CardContent className="pt-4">
          {questions.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <HelpCircle className="w-6 h-6" />
              </div>
              <p className="text-slate-800 font-semibold text-sm">
                Belum ada butir soal yang dipasang pada paket ini.
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {isRaw
                  ? "Silakan klik tombol \u201cAmbil dari Bank Soal\u201d untuk memilih soal dari seluruh mata pelajaran (TKP, TIU, dan TWK), lalu tetapkan kategori subtesnya."
                  : `Silakan klik tombol \u201cAmbil dari Bank Soal\u201d untuk memilih soal yang telah Anda buat di mata pelajaran ${tryout.subject.name}.`}
              </p>
              {!tryout.isLocked && (
                <Button variant="primary" size="sm" onClick={openBankModal} className="mt-2 gap-2 shadow-xs">
                  <Plus className="w-4 h-4" />
                  <span>Buka Bank Soal</span>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((item, index) => {
                const correctOpt = item.question.options?.find((o) => o.isCorrect);
                return (
                  <div
                    key={item.questionId}
                    className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-blue-300 transition-colors"
                  >
                    {/* Number & Content Snippet */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-extrabold text-sm flex items-center justify-center shrink-0">
                        {item.orderNumber}
                      </div>
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {item.section && (
                            <Badge
                              variant={
                                item.section === "TWK"
                                  ? "info"
                                  : item.section === "TIU"
                                  ? "success"
                                  : "warning"
                              }
                              className="text-[10px]"
                            >
                              {item.section}
                            </Badge>
                          )}
                          <Badge variant="default" className="text-[10px]">
                            {item.question.topic?.name || "Topik Umum"}
                          </Badge>
                          <Badge
                            variant={
                              item.question.difficulty === "HARD"
                                ? "danger"
                                : item.question.difficulty === "MEDIUM"
                                ? "warning"
                                : "success"
                            }
                            className="text-[10px]"
                          >
                            {item.question.difficulty}
                          </Badge>
                          {item.question.type === "WEIGHTED_CHOICE" ? (
                            <span className="text-[11px] font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              Skor opsi 1–5
                            </span>
                          ) : correctOpt ? (
                            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Kunci:{" "}
                              {item.question.type === "MATRIX"
                                ? "per baris"
                                : formatMatrixOptionLabel(correctOpt.label)}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm text-slate-800 line-clamp-2 leading-relaxed">
                          {item.question.content}
                        </p>
                      </div>
                    </div>

                    {/* Weight Input & Actions */}
                    <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      {/* Kategori Subtes (mode SKD) */}
                      {isRaw && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-500 font-medium">Subtes:</span>
                          <select
                            disabled={tryout.isLocked}
                            value={item.section ?? ""}
                            onChange={(e) =>
                              updateSection(item.questionId, e.target.value as SkdSectionValue)
                            }
                            className="px-2 py-1 text-xs font-bold rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600 shadow-xs disabled:opacity-50"
                          >
                            <option value="" disabled>
                              Pilih
                            </option>
                            <option value="TWK">TWK</option>
                            <option value="TIU">TIU</option>
                            <option value="TKP">TKP</option>
                          </select>
                        </div>
                      )}

                      {/* Bobot */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500 font-medium">Bobot:</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0.1"
                          disabled={tryout.isLocked}
                          value={item.weight}
                          onChange={(e) => updateWeight(item.questionId, parseFloat(e.target.value) || 1)}
                          className="w-16 px-2 py-1 text-center text-xs font-bold rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600 shadow-xs disabled:opacity-50"
                        />
                      </div>

                      {/* Preview Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviewQuestion(item.question)}
                        className="text-xs text-slate-400 hover:text-slate-700 p-2"
                        title="Lihat Detail Soal"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>

                      {/* Reorder Buttons */}
                      {!tryout.isLocked && (
                        <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                          <button
                            type="button"
                            onClick={() => moveUp(index)}
                            disabled={index === 0}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                            title="Pindah ke Atas"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveDown(index)}
                            disabled={index === questions.length - 1}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                            title="Pindah ke Bawah"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeQuestion(item.questionId)}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 ml-1"
                            title="Lepaskan dari Tryout"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: Bank Soal Picker */}
      {isBankModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-600" />
                  Pilih Soal dari Bank Soal
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isRaw
                    ? "Menampilkan soal aktif dari seluruh mata pelajaran. Tetapkan kategori subtes (TWK/TIU/TKP) pada soal yang dipilih."
                    : `Menampilkan soal aktif untuk mata pelajaran ${tryout.subject.name}`}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBankModalOpen(false)}
                className="text-xs"
              >
                Tutup
              </Button>
            </div>

            {/* Filter Controls */}
            <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari kata kunci soal..."
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 shadow-xs"
                />
              </div>

              {isRaw && availableSubjects.length > 0 && (
                <div className="w-full sm:w-auto min-w-[170px]">
                  <CustomSelect
                    value={bankSubject}
                    onChange={(val) => setBankSubject(val)}
                    placeholder="Semua Mata Pelajaran"
                    options={[
                      { value: "ALL", label: "Semua Mata Pelajaran" },
                      ...availableSubjects.map((s) => ({ value: s.id, label: s.name })),
                    ]}
                    triggerClassName="py-1.5 text-xs"
                  />
                </div>
              )}

              <div className="w-full sm:w-auto min-w-[160px]">
                <CustomSelect
                  value={selectedTopic}
                  onChange={(val) => setSelectedTopic(val)}
                  placeholder={`Semua Topik (${availableTopics.length})`}
                  options={[
                    { value: "ALL", label: `Semua Topik (${availableTopics.length})` },
                    ...availableTopics.map((top) => ({ value: top, label: top })),
                  ]}
                  triggerClassName="py-1.5 text-xs"
                />
              </div>

              <div className="w-full sm:w-auto min-w-[140px]">
                <CustomSelect
                  value={selectedDifficulty}
                  onChange={(val) => setSelectedDifficulty(val)}
                  placeholder="Semua Kesulitan"
                  options={[
                    { value: "ALL", label: "Semua Kesulitan" },
                    { value: "EASY", label: "Mudah (EASY)" },
                    { value: "MEDIUM", label: "Sedang (MEDIUM)" },
                    { value: "HARD", label: "Sulit (HARD)" },
                  ]}
                  triggerClassName="py-1.5 text-xs"
                />
              </div>

              {filteredBankQuestions.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllBank}
                  className="text-xs whitespace-nowrap shadow-xs"
                >
                  {filteredBankQuestions.length > 0 &&
                  filteredBankQuestions.every((q) => selectedQuestionIds.has(q.id))
                    ? "Batal Pilih Semua"
                    : `Pilih Semua (${filteredBankQuestions.length})`}
                </Button>
              )}
            </div>

            {/* Modal Body: Available Questions List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {isFetchingBank ? (
                <div className="py-12 text-center text-slate-500 text-xs animate-pulse">
                  Memuat data bank soal...
                </div>
              ) : filteredBankQuestions.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs space-y-2">
                  <p className="font-semibold text-slate-700">
                    {isRaw
                      ? "Tidak ada soal yang tersedia pada bank soal."
                      : `Tidak ada soal yang tersedia untuk mata pelajaran "${tryout.subject.name}".`}
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                    {availableQuestions.length > 0
                      ? "Semua soal yang sesuai dengan filter pencarian ini telah dimasukkan ke dalam paket tryout."
                      : isRaw
                      ? "Pastikan Anda telah menambahkan soal di menu Bank Soal, atau periksa filter pencarian Anda."
                      : "Pastikan Anda telah menambahkan soal pada mata pelajaran ini di menu Bank Soal, atau periksa filter pencarian Anda."}
                  </p>
                </div>
              ) : (
                filteredBankQuestions.map((q) => {
                  const isChecked = selectedQuestionIds.has(q.id);
                  const correctOpt = q.options?.find((o) => o.isCorrect);

                  return (
                    <div
                      key={q.id}
                      onClick={() => {
                        const newSet = new Set(selectedQuestionIds);
                        if (newSet.has(q.id)) {
                          newSet.delete(q.id);
                        } else {
                          newSet.add(q.id);
                        }
                        setSelectedQuestionIds(newSet);
                      }}
                      className={`p-3 rounded-xl border cursor-pointer transition-colors flex items-start gap-3 shadow-xs ${
                        isChecked
                          ? "bg-blue-50/80 border-blue-400"
                          : "bg-white border-slate-200 hover:border-blue-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by div onClick
                        className="mt-1 accent-blue-600 rounded"
                      />
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {isRaw && q.topic?.subject?.name && (
                            <Badge variant="info" className="text-[10px]">
                              {q.topic.subject.name}
                            </Badge>
                          )}
                          <Badge variant="default" className="text-[10px]">
                            {q.topic?.name || "Topik Umum"}
                          </Badge>
                          <Badge
                            variant={
                              q.difficulty === "HARD"
                                ? "danger"
                                : q.difficulty === "MEDIUM"
                                ? "warning"
                                : "success"
                            }
                            className="text-[10px]"
                          >
                            {q.difficulty}
                          </Badge>
                          {q.type === "WEIGHTED_CHOICE" ? (
                            <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                              Skor opsi 1–5
                            </span>
                          ) : correctOpt ? (
                            <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              Kunci:{" "}
                              {q.type === "MATRIX"
                                ? "per baris"
                                : formatMatrixOptionLabel(correctOpt.label)}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-slate-800 line-clamp-2">{q.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-xs text-slate-500">
                  Terpilih:{" "}
                  <span className="font-bold text-slate-900">{selectedQuestionIds.size}</span> butir soal
                </div>
                {isRaw && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500 font-medium">Subtes:</span>
                    <select
                      value={bankSection}
                      onChange={(e) => setBankSection(e.target.value as SkdSectionValue)}
                      className="px-2 py-1 text-xs font-bold rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600 shadow-xs"
                    >
                      <option value="TWK">TWK</option>
                      <option value="TIU">TIU</option>
                      <option value="TKP">TKP</option>
                    </select>
                    <span className="text-[11px] text-slate-400">diterapkan ke soal terpilih</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBankModalOpen(false)}
                  className="text-xs"
                >
                  Batal
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={selectedQuestionIds.size === 0}
                  onClick={handleAddSelectedQuestions}
                  className="gap-1.5 text-xs shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambahkan ({selectedQuestionIds.size}) Soal</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Single Question Preview */}
      {previewQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="info">{previewQuestion.topic?.name}</Badge>
                <Badge
                  variant={
                    previewQuestion.difficulty === "HARD"
                      ? "danger"
                      : previewQuestion.difficulty === "MEDIUM"
                      ? "warning"
                      : "success"
                  }
                >
                  {previewQuestion.difficulty}
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewQuestion(null)}
                className="text-xs"
              >
                Tutup
              </Button>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-slate-800 leading-relaxed font-medium">
                {previewQuestion.content}
              </p>
              {previewQuestion.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 p-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewQuestion.imageUrl}
                    alt="Lampiran Soal"
                    className="max-h-60 w-auto mx-auto object-contain rounded-lg"
                  />
                </div>
              )}
            </div>

            {/* Options */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Pilihan Jawaban:
              </span>
              {previewQuestion.options?.map((opt) => {
                const maxScore = Math.max(
                  0,
                  ...previewQuestion.options.map((o) => o.score ?? 0)
                );
                const isWeighted = previewQuestion.type === "WEIGHTED_CHOICE";
                const isHighlighted = isWeighted ? opt.score === maxScore : opt.isCorrect;

                return (
                  <div
                    key={opt.id}
                    className={`p-3 rounded-xl border flex items-center gap-3 text-xs shadow-xs ${
                      isHighlighted
                        ? "bg-emerald-50/80 border-emerald-300 text-emerald-950 font-semibold"
                        : "bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    <span
                      className={`min-w-6 h-6 px-1.5 rounded-md flex items-center justify-center font-bold text-[10px] whitespace-nowrap ${
                        isHighlighted
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {formatMatrixOptionLabel(opt.label)}
                    </span>
                    <div className="flex-1 space-y-1">
                      <span>{opt.content}</span>
                      {opt.imageUrl && (
                        <div className="rounded-lg overflow-hidden border border-slate-200 max-w-xs mt-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={opt.imageUrl} alt={`Opsi ${opt.label}`} className="max-h-24 object-contain" />
                        </div>
                      )}
                    </div>
                    {isWeighted ? (
                      <span className="ml-auto text-[10px] text-blue-800 font-bold bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200 shrink-0">
                        SKOR {opt.score ?? "-"}
                      </span>
                    ) : opt.isCorrect ? (
                      <span className="ml-auto text-[10px] text-emerald-800 font-bold bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">KUNCI</span>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* Explanation */}
            {previewQuestion.explanation && (
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-950 space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-blue-900">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  Pembahasan Soal:
                </span>
                <p className="text-blue-950 leading-relaxed font-normal">{previewQuestion.explanation}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Full Student Simulation Preview */}
      {isFullPreviewOpen && questions.length > 0 && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Top Bar */}
            <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="info" className="text-[10px]">
                    SIMULASI TAMPILAN PESERTA
                  </Badge>
                  <h3 className="font-bold text-slate-900 text-sm">{tryout.title}</h3>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullPreviewOpen(false)}
                className="text-xs"
              >
                Keluar Simulasi
              </Button>
            </div>

            {/* Content Split: Left Question, Right Grid */}
            <div className="flex-1 overflow-y-auto flex flex-col md:flex-row">
              {/* Question Screen */}
              <div className="flex-1 p-6 space-y-6 border-b md:border-b-0 md:border-r border-slate-100">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-sm font-bold text-slate-900">
                    Soal Nomor {previewActiveIndex + 1} dari {questions.length}
                  </span>
                  <Badge variant="default" className="text-xs">
                    {questions[previewActiveIndex].section
                      ? `Subtes: ${questions[previewActiveIndex].section}`
                      : `Bobot: ${questions[previewActiveIndex].weight} Poin`}
                  </Badge>
                </div>

                <div className="space-y-4">
                  <p className="text-base text-slate-800 leading-relaxed">
                    {questions[previewActiveIndex].question.content}
                  </p>

                  {questions[previewActiveIndex].question.imageUrl && (
                    <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 p-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={questions[previewActiveIndex].question.imageUrl!}
                        alt="Lampiran Soal"
                        className="max-h-64 mx-auto object-contain rounded-lg"
                      />
                    </div>
                  )}
                </div>

                {/* Options */}
                <div className="space-y-2.5 pt-2">
                  {questions[previewActiveIndex].question.options.map((opt) => (
                    <div
                      key={opt.id}
                      className={`p-3.5 rounded-xl border flex items-center gap-3.5 text-sm shadow-xs ${
                        opt.isCorrect
                          ? "bg-emerald-50/80 border-emerald-300 text-emerald-950 font-medium"
                          : "bg-white border-slate-200 text-slate-700"
                      }`}
                    >
                      <span
                        className={`min-w-7 h-7 px-1.5 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 whitespace-nowrap ${
                          opt.isCorrect
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {formatMatrixOptionLabel(opt.label)}
                      </span>
                      <div className="flex-1 space-y-1">
                        <span className="leading-snug">{opt.content}</span>
                        {opt.imageUrl && (
                          <div className="rounded-lg overflow-hidden border border-slate-200 max-w-xs mt-1">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={opt.imageUrl} alt={`Opsi ${opt.label}`} className="max-h-28 object-contain" />
                          </div>
                        )}
                      </div>
                      {opt.isCorrect && (
                        <span className="ml-auto text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded shrink-0">
                          Kunci Jawaban Guru
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Explanation */}
                {questions[previewActiveIndex].question.explanation && (
                  <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-950 space-y-1 mt-4">
                    <span className="font-bold flex items-center gap-1.5 text-blue-900">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      Pembahasan & Analisis Jawaban:
                    </span>
                    <p className="text-blue-950 leading-relaxed font-normal">
                      {questions[previewActiveIndex].question.explanation}
                    </p>
                  </div>
                )}
              </div>

              {/* Right Side: Number Navigator */}
              <div className="w-full md:w-64 p-5 bg-slate-50/70 space-y-4 shrink-0">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Navigasi Nomor Soal
                </span>
                <div className="grid grid-cols-5 gap-2">
                  {questions.map((q, idx) => (
                    <button
                      key={q.questionId}
                      onClick={() => setPreviewActiveIndex(idx)}
                      className={`h-9 rounded-lg font-bold text-xs transition-colors flex items-center justify-center shadow-xs ${
                        idx === previewActiveIndex
                          ? "bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2 ring-offset-white"
                          : "bg-white border border-slate-200 text-slate-700 hover:border-blue-300"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>

                <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={previewActiveIndex === 0}
                    onClick={() => setPreviewActiveIndex((prev) => Math.max(0, prev - 1))}
                    className="text-xs flex-1 shadow-xs"
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={previewActiveIndex === questions.length - 1}
                    onClick={() =>
                      setPreviewActiveIndex((prev) => Math.min(questions.length - 1, prev + 1))
                    }
                    className="text-xs flex-1 shadow-xs"
                  >
                    Berikutnya
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
