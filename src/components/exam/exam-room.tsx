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
  content: string;
  imageUrl?: string | null;
  options: QuestionOption[];
  selectedOptionId: string | null;
  isFlagged: boolean;
}

interface ExamSheetData {
  id: string;
  tryoutId: string;
  tryoutTitle: string;
  subjectName: string;
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
    async (questionId: string, selectedOptionId: string | null, isFlagged: boolean) => {
      setSaveStatus("saving");
      try {
        const res = await fetch(`/api/student/exam-sessions/${initialData.id}/answer`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionId,
            selectedOptionId,
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

  // 4. Pilih Opsi Jawaban
  const handleSelectOption = (optionId: string) => {
    const updated = [...questions];
    const prevOption = updated[currentIndex].selectedOptionId;
    const newOption = prevOption === optionId ? null : optionId; // toggle jika klik opsi sama

    updated[currentIndex].selectedOptionId = newOption;
    setQuestions(updated);

    // Autosave dengan debounce 100ms
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      triggerSaveAnswer(
        updated[currentIndex].questionId,
        newOption,
        updated[currentIndex].isFlagged
      );
    }, 100);
  };

  // 5. Toggle Flag Ragu-Ragu
  const handleToggleFlag = () => {
    const updated = [...questions];
    const newFlag = !updated[currentIndex].isFlagged;
    updated[currentIndex].isFlagged = newFlag;
    setQuestions(updated);

    triggerSaveAnswer(
      updated[currentIndex].questionId,
      updated[currentIndex].selectedOptionId,
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
  const answeredCount = questions.filter((q) => q.selectedOptionId !== null).length;
  const flaggedCount = questions.filter((q) => q.isFlagged).length;
  const unansweredCount = questions.length - answeredCount;
  const isTimeCritical = remainingSeconds <= 300; // < 5 menit

  // Jika ujian sudah selesai disubmit (Modal Hasil Selesai)
  if (submitResult) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-8 text-center space-y-6 shadow-2xl animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <Badge variant="info">{initialData.subjectName}</Badge>
            <h2 className="text-2xl font-black text-white">Ujian Telah Selesai!</h2>
            <p className="text-xs text-slate-400">
              Jawaban Anda pada paket &quot;{initialData.tryoutTitle}&quot; telah berhasil dikumpulkan dan
              dinilai otomatis.
            </p>
          </div>

          {/* Skor Card */}
          <div className="p-6 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              Nilai Akhir Ujian:
            </span>
            <div className="text-5xl font-black text-white">{submitResult.totalScore}</div>
            <div className="flex items-center justify-center gap-2">
              <Badge variant={submitResult.isPassed ? "success" : "danger"}>
                {submitResult.isPassed ? "LULUS STANDAR KKM" : "DI BAWAH KKM"}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/80 text-xs text-slate-300">
              <div>
                <span className="text-emerald-400 font-bold block">{submitResult.correctCount}</span>
                <span className="text-slate-500 text-[11px]">Benar</span>
              </div>
              <div>
                <span className="text-rose-400 font-bold block">{submitResult.wrongCount}</span>
                <span className="text-slate-500 text-[11px]">Salah</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">{submitResult.unansweredCount}</span>
                <span className="text-slate-500 text-[11px]">Kosong</span>
              </div>
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={() => router.push("/dashboard/student")}
            className="w-full gap-2 font-bold"
          >
            <span>Kembali ke Dashboard Siswa →</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col select-none">
      {/* 1. TOP HEADER (Sticky Focus Bar) */}
      <header className="h-16 px-4 sm:px-6 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between sticky top-0 z-30">
        {/* Left: Info Paket */}
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="info" className="text-[10px] hidden sm:inline-flex">
                {initialData.subjectName}
              </Badge>
              <h1 className="font-bold text-sm sm:text-base text-white line-clamp-1 max-w-[200px] sm:max-w-md">
                {initialData.tryoutTitle}
              </h1>
            </div>
            {/* Status Simpan */}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
              {saveStatus === "saving" ? (
                <>
                  <CloudUpload className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span className="text-amber-300">Menyimpan jawaban...</span>
                </>
              ) : saveStatus === "saved" ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-slate-400">Jawaban tersimpan otomatis</span>
                </>
              ) : saveStatus === "error" ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-rose-400">Gagal simpan (mencoba lagi)</span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* Right: Timer & Submit Trigger */}
        <div className="flex items-center gap-3">
          {/* Countdown Clock */}
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border font-mono font-bold text-sm tracking-wider transition-colors ${
              isTimeCritical
                ? "bg-rose-500/10 border-rose-500/40 text-rose-400 animate-pulse ring-2 ring-rose-500/20"
                : "bg-slate-950 border-slate-800 text-indigo-400"
            }`}
          >
            <Clock className="w-4 h-4 shrink-0" />
            <span>{formatTime(remainingSeconds)}</span>
          </div>

          {/* Tombol Buka Lembar Nomor di Mobile */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
            title="Navigasi Nomor Soal"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Tombol Kumpulkan Ujian */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsSubmitModalOpen(true)}
            className="hidden sm:inline-flex gap-1.5 text-xs font-bold shadow-md shadow-indigo-500/20"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Selesai & Kumpulkan</span>
          </Button>
        </div>
      </header>

      {/* 2. BODY LAYOUT: Main Question Screen + Number Grid Sidebar */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Main Question Sheet */}
        <main className="flex-1 flex flex-col justify-between p-4 sm:p-8 space-y-6">
          <div className="space-y-6 max-w-3xl mx-auto w-full">
            {/* Question Header Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold text-white">
                  Soal Nomor {currentQuestion.orderNumber}
                </span>
                <span className="text-xs text-slate-500">/ {questions.length}</span>
              </div>
              <Badge variant="default" className="text-xs">
                Bobot: {currentQuestion.weight} Poin
              </Badge>
            </div>

            {/* Question Text */}
            <div className="space-y-4">
              <div className="text-base sm:text-lg text-slate-100 leading-relaxed font-medium select-text">
                {currentQuestion.content}
              </div>

              {/* Optional Question Image */}
              {currentQuestion.imageUrl && (
                <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/60 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentQuestion.imageUrl}
                    alt="Lampiran Soal"
                    className="max-h-80 mx-auto object-contain rounded-xl"
                  />
                </div>
              )}
            </div>

            {/* Options List (A - E) */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Pilih Jawaban:
              </span>
              {currentQuestion.options.map((option) => {
                const isSelected = currentQuestion.selectedOptionId === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelectOption(option.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-4 group ${
                      isSelected
                        ? "bg-indigo-600/15 border-indigo-500 shadow-md shadow-indigo-500/10 text-white ring-1 ring-indigo-500"
                        : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                    }`}
                  >
                    {/* Circle / Square Letter */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                        isSelected
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                          : "bg-slate-800 text-slate-300 group-hover:bg-slate-700 group-hover:text-white"
                      }`}
                    >
                      {option.label}
                    </div>

                    <div className="flex-1 min-w-0 pt-1 text-sm sm:text-base leading-relaxed select-text">
                      {option.content}
                      {option.imageUrl && (
                        <div className="mt-2 rounded-lg overflow-hidden border border-slate-800 max-w-xs">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={option.imageUrl}
                            alt={`Opsi ${option.label}`}
                            className="max-h-40 object-contain"
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
          <div className="max-w-3xl mx-auto w-full pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="outline"
              size="md"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              className="gap-2 text-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </Button>

            {/* Toggle Ragu-Ragu */}
            <button
              type="button"
              onClick={handleToggleFlag}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-2 ${
                currentQuestion.isFlagged
                  ? "bg-amber-500/15 border-amber-500 text-amber-300 shadow-sm shadow-amber-500/10"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
              }`}
            >
              <Bookmark className={`w-4 h-4 ${currentQuestion.isFlagged ? "fill-current" : ""}`} />
              <span>{currentQuestion.isFlagged ? "Ragu-Ragu (Ditandai)" : "Tandai Ragu-Ragu"}</span>
            </button>

            {currentIndex === questions.length - 1 ? (
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsSubmitModalOpen(true)}
                className="gap-2 text-xs font-bold shadow-md shadow-indigo-500/20"
              >
                <span>Tinjau & Kumpulkan</span>
                <Send className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                className="gap-2 text-xs"
              >
                <span>Berikutnya</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </main>

        {/* 3. SIDEBAR / DRAWER: Number Navigator Grid */}
        <aside
          className={`fixed inset-y-0 right-0 z-40 w-72 bg-slate-900/95 backdrop-blur-md border-l border-slate-800 p-5 flex flex-col justify-between transform transition-transform duration-300 md:relative md:transform-none md:flex ${
            isSidebarOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
          }`}
        >
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="font-bold text-sm text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                Daftar Nomor Soal
              </span>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="md:hidden text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Legend */}
            <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400 pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-indigo-600" />
                <span>Dijawab ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-amber-500" />
                <span>Ragu ({flaggedCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-slate-800 border border-slate-700" />
                <span>Belum ({unansweredCount})</span>
              </div>
            </div>

            {/* Grid 5 Columns */}
            <div className="grid grid-cols-5 gap-2 max-h-[60vh] overflow-y-auto pr-1">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = q.selectedOptionId !== null;
                const isFlagged = q.isFlagged;

                let btnStyle = "bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700";
                if (isFlagged) {
                  btnStyle = "bg-amber-500 text-slate-950 font-bold border-amber-400";
                } else if (isAnswered) {
                  btnStyle = "bg-indigo-600 text-white font-bold border-indigo-500";
                }

                return (
                  <button
                    key={q.questionId}
                    type="button"
                    onClick={() => {
                      setCurrentIndex(idx);
                      setIsSidebarOpen(false);
                    }}
                    className={`h-10 rounded-xl text-xs font-semibold transition-all flex items-center justify-center relative ${btnStyle} ${
                      isCurrent ? "ring-2 ring-white ring-offset-2 ring-offset-slate-950 scale-105" : ""
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Submit in Sidebar */}
          <div className="pt-4 border-t border-slate-800">
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsSubmitModalOpen(true)}
              className="w-full gap-2 text-xs font-bold shadow-md shadow-indigo-500/20"
            >
              <Send className="w-4 h-4" />
              <span>Selesai & Kumpulkan</span>
            </Button>
          </div>
        </aside>
      </div>

      {/* 4. MODAL: Konfirmasi Kumpulkan Ujian */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                <Send className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Kumpulkan Lembar Ujian?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pastikan Anda telah memeriksa seluruh jawaban. Setelah dikumpulkan, lembar ujian akan
                langsung dinilai dan tidak dapat diubah kembali.
              </p>
            </div>

            {/* Statistik Ringkas */}
            <div className="grid grid-cols-3 gap-2 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-xs">
              <div>
                <span className="text-slate-400 text-[11px]">Terjawab:</span>
                <p className="font-extrabold text-emerald-400 text-base">{answeredCount}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Ragu-ragu:</span>
                <p className="font-extrabold text-amber-400 text-base">{flaggedCount}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Kosong:</span>
                <p className="font-extrabold text-rose-400 text-base">{unansweredCount}</p>
              </div>
            </div>

            {unansweredCount > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Masih terdapat {unansweredCount} soal yang belum Anda jawab.</span>
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
                className="text-xs font-bold flex-1 gap-2"
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
