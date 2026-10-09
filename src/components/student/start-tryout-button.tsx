"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  AlertCircle,
  Timer,
  Award,
  FileQuestion,
  X,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface StartTryoutButtonProps {
  tryoutId: string;
  tryoutTitle?: string;
  durationMinutes?: number;
  questionCount: number;
  attemptNumber?: number;
  maxAttempts?: number;
}

export function StartTryoutButton({
  tryoutId,
  tryoutTitle,
  durationMinutes,
  questionCount,
  attemptNumber = 1,
  maxAttempts = 3,
}: StartTryoutButtonProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keyboard shortcut Esc untuk menutup modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isModalOpen && !isLoading) {
        setIsModalOpen(false);
      }
    };
    if (isModalOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isModalOpen, isLoading]);

  const handleOpenConfirm = () => {
    if (questionCount === 0) {
      setError("Paket tryout ini belum memiliki soal.");
      return;
    }
    setError(null);
    setIsModalOpen(true);
  };

  const handleStartExam = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/student/tryouts/${tryoutId}/start`, {
        method: "POST",
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error?.message || "Gagal memulai sesi ujian.");
        setIsLoading(false);
        setIsModalOpen(false);
        return;
      }

      const sessionId = json.data.sessionId;
      router.push(`/exam/${sessionId}`);
    } catch {
      setError("Terjadi kesalahan jaringan saat memulai tryout.");
      setIsLoading(false);
      setIsModalOpen(false);
    }
  };

  const buttonLabel =
    attemptNumber > 1
      ? `Mulai Percobaan ke-${attemptNumber} (dari ${maxAttempts}x) →`
      : "Mulai Kerjakan Tryout Sekarang →";

  return (
    <>
      <div className="space-y-3">
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <Button
          onClick={handleOpenConfirm}
          variant="primary"
          size="lg"
          disabled={questionCount === 0}
          className="w-full gap-2.5 text-sm font-bold shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 active:scale-[0.99] transition-all py-3.5 rounded-2xl"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{buttonLabel}</span>
        </Button>
      </div>

      {/* Modal Dialog Konfirmasi Modern */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isLoading) {
              setIsModalOpen(false);
            }
          }}
        >
          <div className="relative w-full max-w-md bg-white border border-slate-100 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-7 space-y-6 text-left animate-in zoom-in-95 duration-200">
            {/* Header Modal */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                    {attemptNumber > 1 ? "Mulai Ulang Tryout?" : "Siap Memulai Tryout?"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {tryoutTitle ? tryoutTitle : "Konfirmasi kesiapan pengerjaan ujian Anda"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isLoading}
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Poin Informasi Pengerjaan */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 text-xs text-slate-600">
              {durationMinutes && (
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-blue-100/70 text-blue-700">
                    <Timer className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">Durasi: {durationMinutes} Menit</span>
                    <p className="text-[11px] text-slate-500">Timer server langsung berjalan mundur saat dimulai.</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-indigo-100/70 text-indigo-700">
                  <FileQuestion className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-slate-900">{questionCount} Butir Soal</span>
                  <p className="text-[11px] text-slate-500">Pilihan ganda biasa, kompleks, dan benar/salah.</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-100/70 text-amber-700">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-slate-900">
                    Percobaan #{attemptNumber} dari {maxAttempts}x kesempatan
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Nilai tertinggi dari seluruh percobaan Anda yang akan diambil.
                  </p>
                </div>
              </div>
            </div>

            {/* Pesan Instruksi */}
            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-blue-50/70 border border-blue-100 text-blue-900 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
              <p className="leading-relaxed">
                Jawaban Anda tersimpan otomatis secara berkala. Pastikan koneksi internet Anda stabil.
              </p>
            </div>

            {/* Tombol Aksi */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                disabled={isLoading}
                onClick={() => setIsModalOpen(false)}
                className="flex-1 rounded-2xl py-2.5 font-bold text-xs text-slate-600 hover:bg-slate-100 border-slate-200"
              >
                Nanti Saja
              </Button>

              <Button
                type="button"
                variant="primary"
                size="md"
                isLoading={isLoading}
                onClick={handleStartExam}
                className="flex-1 rounded-2xl py-2.5 font-bold text-xs shadow-md shadow-blue-600/20 gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Ya, Mulai Sekarang</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
