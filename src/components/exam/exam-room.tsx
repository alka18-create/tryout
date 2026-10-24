"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Bookmark,
  ArrowLeft,
  ArrowRight,
  Send,
  CloudCheck,
  CloudUpload,
  Layers,
  HelpCircle,
  Menu,
  X,
  Award,
  Check,
  CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface QuestionOption {
  id: string;
  label: string;
  content: string;
  imageUrl?: string | null;
}

interface ExamQuestion {
  orderNumber: number;
  weight: number;
  questionId: string;
  type?: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE";
  content: string;
  imageUrl?: string | null;
  options: QuestionOption[];
  selectedOptionId: string | null;
  selectedOptionIds?: string[];
  isFlagged: boolean;
}

interface ExamSheetData {
  id: string;
  tryoutId: string;
  tryoutTitle: string;
  subjectName: string;
  attemptNumber?: number;
  maxAttempts?: number;
  status: string;
  durationMinutes: number;
  startedAt: string;
  expiresAt: string;
  remainingSeconds: number;
  totalQuestions: number;
  questions: ExamQuestion[];
}

export function ExamRoom({ initialData }: { initialData: ExamSheetData }) {
  const router = useRouter();

  // Questions state
  const [questions, setQuestions] = useState<ExamQuestion[]>(initialData.questions);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Timer state
  const [remainingSeconds, setRemainingSeconds] = useState(initialData.remainingSeconds);
  const expiresAtMs = useRef(new Date(initialData.expiresAt).getTime());

  // Autosave status: 'idle' | 'saving' | 'saved' | 'error'
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("saved");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // UI state
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    totalScore: number;
    isPassed: boolean;
    correctCount: number;
    wrongCount: number;
    unansweredCount: number;
  } | null>(null);

  const currentQuestion = questions[currentIndex];

  // 1. Timer Countdown & Server Synchronization
  useEffect(() => {
    // Fungsi sinkronisasi dengan server time
    const syncTime = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expiresAtMs.current - now) / 1000));
      setRemainingSeconds(diff);
      if (diff <= 0) {
        handleAutoSubmit();
      }
    };

    // Jalankan detik demi detik
    const timerInterval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Re-sinkronisasi saat tab kembali aktif
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncTime();
      }
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", syncTime);

    return () => {
      clearInterval(timerInterval);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", syncTime);
    };
  }, []);

  // 2. Format Waktu: HH:MM:SS atau MM:SS
  const formatTime = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;

    const pad = (n: number) => String(n).padStart(2, "0");
    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  // 3. Simpan Jawaban ke Server (Autosave)
  const triggerSaveAnswer = useCallback(
    async (
      questionId: string,
      selectedOptionId: string | null,
      selectedOptionIds: string[],
      isFlagged: boolean
    ) => {
      setSaveStatus("saving");
      try {
        const res = await fetch(`/api/student/exam-sessions/${initialData.id}/answer`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionId,
            selectedOptionId,
            selectedOptionIds,
            isFlagged,
          }),
        });

        const json = await res.json();
        if (res.ok && json.success) {
          setSaveStatus("saved");
        } else {
          setSaveStatus("error");
        }
      } catch {
        setSaveStatus("error");
      }
    },
    [initialData.id]
  );

  // 4. Pilih Opsi Jawaban (Mendukung Single Choice, PG Kompleks, & Benar/Salah)
  const handleSelectOption = (optionId: string) => {
    const updated = [...questions];
    const q = updated[currentIndex];
    const isMultiple = q.type === "MULTIPLE_CHOICE";

    let newSelectedId: string | null = null;
    let newSelectedIds: string[] = [];

    if (isMultiple) {
      const currentList = q.selectedOptionIds || (q.selectedOptionId ? [q.selectedOptionId] : []);
      if (currentList.includes(optionId)) {
        // Hapus jika sudah terpilih (toggle lepas)
        newSelectedIds = currentList.filter((id) => id !== optionId);
      } else {
        // Tambahkan ke pilihan
        newSelectedIds = [...currentList, optionId];
      }
      newSelectedId = newSelectedIds.length > 0 ? newSelectedIds[0] : null;
    } else {
      // SINGLE_CHOICE atau TRUE_FALSE
      const prevOption = q.selectedOptionId;
      newSelectedId = prevOption === optionId ? null : optionId; // toggle jika klik opsi sama
      newSelectedIds = newSelectedId ? [newSelectedId] : [];
    }

    updated[currentIndex].selectedOptionId = newSelectedId;
    updated[currentIndex].selectedOptionIds = newSelectedIds;
    setQuestions(updated);

    // Autosave dengan debounce 100ms
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      triggerSaveAnswer(
        q.questionId,
        newSelectedId,
        newSelectedIds,
        q.isFlagged
      );
    }, 100);
  };

  // 5. Toggle Flag Ragu-Ragu
  const handleToggleFlag = () => {
    const updated = [...questions];
    const q = updated[currentIndex];
    const newFlag = !q.isFlagged;
    q.isFlagged = newFlag;
    setQuestions(updated);

    triggerSaveAnswer(
      q.questionId,
      q.selectedOptionId,
      q.selectedOptionIds || (q.selectedOptionId ? [q.selectedOptionId] : []),
      newFlag
    );
  };

  // 6. Submit Manual Ujian
  const handleSubmitExam = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/student/exam-sessions/${initialData.id}/submit`, {
        method: "POST",
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSubmitResult(json.data);
      } else {
        alert(json.error?.message || "Gagal mengumpulkan ujian.");
        setIsSubmitting(false);
      }
    } catch {
      alert("Terjadi kesalahan jaringan saat mengumpulkan ujian.");
      setIsSubmitting(false);
    }
  };

  // 7. Auto-Submit Ketika Waktu Habis
  const handleAutoSubmit = async () => {
    try {
      const res = await fetch(`/api/student/exam-sessions/${initialData.id}/submit`, {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSubmitResult(json.data);
      }
    } catch {
      console.error("Gagal auto-submit waktu habis.");
    }
  };

  // Statistik Jawaban
  const answeredCount = questions.filter(
    (q) => (q.selectedOptionIds && q.selectedOptionIds.length > 0) || q.selectedOptionId !== null
  ).length;
  const flaggedCount = questions.filter((q) => q.isFlagged).length;
  const unansweredCount = questions.length - answeredCount;
  const isTimeCritical = remainingSeconds <= 300; // < 5 menit

  // Jika ujian sudah selesai disubmit (Modal Hasil Selesai)
  if (submitResult) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200/90 rounded-3xl max-w-lg w-full p-8 text-center space-y-6 shadow-xl animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Badge variant="info">{initialData.subjectName}</Badge>
              <Badge variant="outline" className="text-xs font-semibold text-slate-700">
                Percobaan {initialData.attemptNumber || 1} dari {initialData.maxAttempts || 3}x
              </Badge>
            </div>
            <h2 className="text-2xl font-black text-slate-900">Ujian Telah Selesai!</h2>
            <p className="text-xs text-slate-500">
              Jawaban Anda pada paket &quot;{initialData.tryoutTitle}&quot; telah berhasil dikumpulkan dan
              dinilai otomatis. Sistem mencatat nilai tertinggi dari seluruh percobaan Anda.
            </p>
          </div>

          {/* Skor Card */}
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
              Nilai Percobaan #{initialData.attemptNumber || 1}:
            </span>
            <div className="text-5xl font-black text-slate-900">{submitResult.totalScore}</div>
            <div className="flex items-center justify-center gap-2">
              <Badge variant={submitResult.isPassed ? "success" : "danger"}>
                {submitResult.isPassed ? "LULUS STANDAR KKM" : "DI BAWAH KKM"}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200 text-xs">
              <div>
                <span className="text-emerald-600 font-bold block">{submitResult.correctCount}</span>
                <span className="text-slate-500 text-[11px]">Benar</span>
              </div>
              <div>
                <span className="text-rose-600 font-bold block">{submitResult.wrongCount}</span>
                <span className="text-slate-500 text-[11px]">Salah</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold block">{submitResult.unansweredCount}</span>
                <span className="text-slate-400 text-[11px]">Kosong</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push(`/dashboard/student/exam-sessions/${initialData.id}/result`)}
              className="w-full gap-2 font-bold shadow-xs"
            >
              <span>Lihat Rincian & Evaluasi Nilai →</span>
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={() => router.push("/dashboard/student/tryouts")}
              className="w-full text-xs text-slate-600"
            >
              <span>Kembali ke Katalog Tryout</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col select-none">
      {/* 1. TOP HEADER (Sticky Focus Bar) */}
      <header className="h-16 sm:h-18 px-4 sm:px-8 bg-white border-b border-slate-200/90 shadow-xs flex items-center justify-between sticky top-0 z-30">
        {/* Left: Info Paket */}
        <div className="flex items-center gap-3.5">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="info" className="text-xs hidden sm:inline-flex px-2.5 py-0.5">
                {initialData.subjectName}
              </Badge>
              <Badge variant="outline" className="text-xs font-semibold text-blue-700 bg-blue-50/70 border-blue-200 px-2.5 py-0.5">
                Percobaan {initialData.attemptNumber || 1}/{initialData.maxAttempts || 3}
              </Badge>
              <h1 className="font-extrabold text-base sm:text-lg text-slate-900 line-clamp-1 max-w-[200px] sm:max-w-xl">
                {initialData.tryoutTitle}
              </h1>
            </div>
            {/* Status Simpan */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
              {saveStatus === "saving" ? (
                <>
                  <CloudUpload className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  <span className="text-amber-600 font-medium">Menyimpan jawaban...</span>
                </>
              ) : saveStatus === "saved" ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-slate-500">Jawaban tersimpan otomatis</span>
                </>
              ) : saveStatus === "error" ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-rose-600 font-medium">Gagal simpan (mencoba lagi)</span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* Right: Timer & Submit Trigger */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Countdown Clock */}
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl border font-mono font-black text-sm sm:text-base tracking-wider transition-colors shadow-xs ${
              isTimeCritical
                ? "bg-rose-50 border-rose-300 text-rose-600 animate-pulse ring-2 ring-rose-200"
                : "bg-blue-50/90 border-blue-200 text-blue-700"
            }`}
          >
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span>{formatTime(remainingSeconds)}</span>
          </div>

          {/* Tombol Buka Lembar Nomor di Mobile */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden p-2 rounded-xl bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200"
            title="Navigasi Nomor Soal"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Tombol Kumpulkan Ujian */}
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsSubmitModalOpen(true)}
            className="hidden sm:inline-flex gap-2 text-xs sm:text-sm font-bold shadow-xs px-4 py-2.5 rounded-2xl"
          >
            <Send className="w-4 h-4" />
            <span>Selesai & Kumpulkan</span>
          </Button>
        </div>
      </header>

      {/* 2. BODY LAYOUT: Main Question Screen + Number Grid Sidebar */}
      <div className="flex-1 flex max-w-[1440px] w-full mx-auto">
        {/* Main Question Sheet */}
        <main className="flex-1 flex flex-col justify-between p-4 sm:p-8 space-y-6">
          <div className="space-y-6 max-w-4xl mx-auto w-full">
            {/* Question Header Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <span className="text-xl sm:text-2xl font-black text-slate-900">
                  Soal Nomor {currentQuestion.orderNumber}
                </span>
                <span className="text-sm text-slate-400 font-semibold">/ {questions.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={currentQuestion.type === "MULTIPLE_CHOICE" ? "info" : "outline"} className="text-xs sm:text-sm px-3 py-1 font-bold">
                  {currentQuestion.type === "MULTIPLE_CHOICE"
                    ? "PG Kompleks"
                    : currentQuestion.type === "TRUE_FALSE"
                    ? "Benar / Salah"
                    : "Pilihan Ganda"}
                </Badge>
                <Badge variant="default" className="text-xs sm:text-sm px-3 py-1 font-semibold">
                  Bobot: {currentQuestion.weight} Poin
                </Badge>
              </div>
            </div>

            {/* Question Text */}
            <div className="space-y-4">
              <div className="text-lg sm:text-xl text-slate-900 leading-relaxed font-medium select-text">
                {currentQuestion.content}
              </div>

              {/* Optional Question Image */}
              {currentQuestion.imageUrl && (
                <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white p-3 shadow-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentQuestion.imageUrl}
                    alt="Lampiran Soal"
                    className="max-h-96 mx-auto object-contain rounded-xl"
                  />
                </div>
              )}
            </div>

            {/* Options List */}
            <div className="space-y-3.5 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold text-slate-600 uppercase tracking-wider block">
                  {currentQuestion.type === "MULTIPLE_CHOICE"
                    ? "Pilih Satu atau Lebih Jawaban Benar:"
                    : "Pilih Jawaban:"}
                </span>
                {currentQuestion.type === "MULTIPLE_CHOICE" && (
                  <span className="text-xs sm:text-sm text-blue-600 font-bold flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4" /> Centang jawaban yang benar
                  </span>
                )}
              </div>
              {currentQuestion.options.map((option) => {
                const isSelected = currentQuestion.type === "MULTIPLE_CHOICE"
                  ? (currentQuestion.selectedOptionIds || []).includes(option.id) || currentQuestion.selectedOptionId === option.id
                  : currentQuestion.selectedOptionId === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelectOption(option.id)}
                    className={`w-full text-left p-4 sm:p-5 rounded-2xl border transition-all flex items-start gap-4 sm:gap-5 group shadow-xs cursor-pointer ${
                      isSelected
                        ? "bg-blue-50/90 border-blue-600 text-blue-950 ring-2 ring-blue-600"
                        : "bg-white border-slate-200 text-slate-800 hover:border-blue-300 hover:bg-blue-50/30"
                    }`}
                  >
                    {/* Circle / Square Letter / Checkbox */}
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 ${
                        currentQuestion.type === "MULTIPLE_CHOICE" ? "rounded-xl" : "rounded-2xl"
                      } flex items-center justify-center font-black text-base shrink-0 transition-colors ${
                        isSelected
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 group-hover:bg-blue-100 group-hover:text-blue-700"
                      }`}
                    >
                      {isSelected && currentQuestion.type === "MULTIPLE_CHOICE" ? (
                        <Check className="w-5 h-5 stroke-[3]" />
                      ) : (
                        option.label
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pt-1 text-base sm:text-lg leading-relaxed select-text font-normal">
                      {option.content}
                      {option.imageUrl && (
                        <div className="mt-2.5 rounded-xl overflow-hidden border border-slate-200 max-w-sm">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={option.imageUrl}
                            alt={`Opsi ${option.label}`}
                            className="max-h-48 object-contain"
                          />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Navigation Toolbar */}
          <div className="max-w-4xl mx-auto w-full pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
            <Button
              variant="outline"
              size="lg"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              className="gap-2 text-sm sm:text-base font-bold rounded-2xl px-5 py-3"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </Button>

            {/* Toggle Ragu-Ragu */}
            <button
              type="button"
              onClick={handleToggleFlag}
              className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold border transition-colors flex items-center gap-2 shadow-xs cursor-pointer ${
                currentQuestion.isFlagged
                  ? "bg-amber-100/80 border-amber-400 text-amber-900"
                  : "bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Bookmark className={`w-4 h-4 ${currentQuestion.isFlagged ? "fill-current text-amber-700" : ""}`} />
              <span>{currentQuestion.isFlagged ? "Ragu-Ragu (Ditandai)" : "Tandai Ragu-Ragu"}</span>
            </button>

            {currentIndex === questions.length - 1 ? (
              <Button
                variant="primary"
                size="lg"
                onClick={() => setIsSubmitModalOpen(true)}
                className="gap-2 text-sm sm:text-base font-bold shadow-md shadow-blue-600/20 rounded-2xl px-6 py-3"
              >
                <span>Tinjau & Kumpulkan</span>
                <Send className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                className="gap-2 text-sm sm:text-base font-bold shadow-md shadow-blue-600/20 rounded-2xl px-6 py-3"
              >
                <span>Berikutnya</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </main>

        {/* 3. SIDEBAR / DRAWER: Number Navigator Grid */}
        <aside
          className={`fixed inset-y-0 right-0 z-40 w-80 sm:w-88 bg-white border-l border-slate-200/90 shadow-sm p-6 flex flex-col justify-between transform transition-transform duration-300 md:relative md:transform-none md:flex ${
            isSidebarOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
          }`}
        >
          <div className="space-y-4">
            {/* Header Sidebar */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                Daftar Nomor Soal
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[11px] font-bold px-2 py-0.5 text-slate-600 bg-slate-50">
                  {answeredCount}/{questions.length} Selesai
                </Badge>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="md:hidden text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                  title="Tutup Navigator"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Mini Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                <span>Progres Pengerjaan</span>
                <span className="text-blue-600 font-bold">{Math.round((answeredCount / questions.length) * 100)}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${(answeredCount / questions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Status Legend (Pill Cards) */}
            <div className="grid grid-cols-3 gap-1.5 text-[11px] font-medium pt-1">
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0 shadow-2xs" />
                <span className="truncate">Dijawab <strong>({answeredCount})</strong></span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0 shadow-2xs" />
                <span className="truncate">Ragu <strong>({flaggedCount})</strong></span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-white border border-slate-400 shrink-0" />
                <span className="truncate">Belum <strong>({unansweredCount})</strong></span>
              </div>
            </div>

            {/* Grid 5 Columns - Symmetrical Aspect Square Keypad */}
            <div className="p-1 max-h-[55vh] overflow-y-auto">
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, idx) => {
                  const isCurrent = idx === currentIndex;
                  const isAnswered =
                    (q.selectedOptionIds && q.selectedOptionIds.length > 0) || q.selectedOptionId !== null;
                  const isFlagged = q.isFlagged;

                  // Tentukan warna dasar tombol
                  let baseStyle = "bg-white border border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50/40 hover:text-blue-700 shadow-2xs";
                  if (isFlagged) {
                    baseStyle = "bg-amber-400 text-amber-950 font-bold border-amber-400 shadow-xs hover:bg-amber-500";
                  } else if (isAnswered) {
                    baseStyle = "bg-emerald-600 text-white font-bold border-emerald-600 shadow-xs hover:bg-emerald-700";
                  }

                  // Tentukan style khusus jika tombol adalah soal yang sedang aktif
                  let activeIndicator = "";
                  if (isCurrent) {
                    if (isAnswered) {
                      activeIndicator = "ring-2 ring-offset-1 ring-blue-600 font-black";
                    } else if (isFlagged) {
                      activeIndicator = "ring-2 ring-offset-1 ring-blue-600 font-black";
                    } else {
                      activeIndicator = "border-2 border-blue-600 bg-blue-50 text-blue-700 font-black shadow-xs";
                    }
                  }

                  return (
                    <button
                      key={q.questionId}
                      type="button"
                      onClick={() => {
                        setCurrentIndex(idx);
                        setIsSidebarOpen(false);
                      }}
                      className={`aspect-square w-full rounded-2xl text-xs sm:text-sm transition-all flex flex-col items-center justify-center relative cursor-pointer ${baseStyle} ${activeIndicator}`}
                      title={`Pindah ke Soal Nomor ${idx + 1}`}
                    >
                      <span>{idx + 1}</span>
                      {/* Titik indikator soal aktif di bawah angka */}
                      {isCurrent && (
                        <span
                          className={`w-1 h-1 rounded-full mt-0.5 ${
                            isAnswered || isFlagged ? "bg-white" : "bg-blue-600"
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Submit in Sidebar */}
          <div className="pt-4 border-t border-slate-100">
            <Button
              variant="primary"
              size="lg"
              onClick={() => setIsSubmitModalOpen(true)}
              className="w-full gap-2 text-sm font-bold shadow-md shadow-blue-600/20 py-3 rounded-2xl"
            >
              <Send className="w-4 h-4" />
              <span>Selesai & Kumpulkan</span>
            </Button>
          </div>
        </aside>
      </div>

      {/* 4. MODAL: Konfirmasi Kumpulkan Ujian */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-xl animate-in fade-in zoom-in-95">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto">
                <Send className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Kumpulkan Lembar Ujian?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Pastikan Anda telah memeriksa seluruh jawaban. Setelah dikumpulkan, lembar ujian akan
                langsung dinilai dan tidak dapat diubah kembali.
              </p>
            </div>

            {/* Statistik Ringkas */}
            <div className="grid grid-cols-3 gap-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs">
              <div>
                <span className="text-slate-500 text-[11px]">Terjawab:</span>
                <p className="font-extrabold text-emerald-600 text-base">{answeredCount}</p>
              </div>
              <div>
                <span className="text-slate-500 text-[11px]">Ragu-ragu:</span>
                <p className="font-extrabold text-amber-600 text-base">{flaggedCount}</p>
              </div>
              <div>
                <span className="text-slate-500 text-[11px]">Kosong:</span>
                <p className="font-extrabold text-rose-600 text-base">{unansweredCount}</p>
              </div>
            </div>

            {unansweredCount > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span className="font-medium">Masih terdapat {unansweredCount} soal yang belum Anda jawab.</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="md"
                disabled={isSubmitting}
                onClick={() => setIsSubmitModalOpen(false)}
                className="text-xs flex-1"
              >
                Kembali Periksa
              </Button>
              <Button
                variant="primary"
                size="md"
                isLoading={isSubmitting}
                onClick={handleSubmitExam}
                className="text-xs font-bold flex-1 gap-2 shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Ya, Kumpulkan</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
