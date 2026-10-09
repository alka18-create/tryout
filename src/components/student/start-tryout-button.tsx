"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StartTryoutButtonProps {
  tryoutId: string;
  questionCount: number;
  attemptNumber?: number;
  maxAttempts?: number;
}

export function StartTryoutButton({
  tryoutId,
  questionCount,
  attemptNumber = 1,
  maxAttempts = 3,
}: StartTryoutButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    if (questionCount === 0) {
      setError("Paket tryout ini belum memiliki soal.");
      return;
    }

    const confirmMsg =
      attemptNumber > 1
        ? `Apakah Anda sudah siap memulai percobaan ke-${attemptNumber} (dari ${maxAttempts}x)? Nilai tertinggi dari seluruh percobaan Anda yang akan diambil.`
        : `Apakah Anda sudah siap memulai tryout ini? Waktu pengerjaan akan langsung berjalan. Anda memiliki kesempatan hingga ${maxAttempts}x percobaan.`;

    if (!confirm(confirmMsg)) {
      return;
    }

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
        return;
      }

      const sessionId = json.data.sessionId;
      router.push(`/exam/${sessionId}`);
    } catch {
      setError("Terjadi kesalahan jaringan saat memulai tryout.");
      setIsLoading(false);
    }
  };

  const buttonLabel =
    attemptNumber > 1
      ? `Mulai Percobaan ke-${attemptNumber} (dari ${maxAttempts}x) →`
      : "Mulai Kerjakan Tryout Sekarang →";

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button
        onClick={handleStart}
        isLoading={isLoading}
        variant="primary"
        size="lg"
        disabled={questionCount === 0}
        className="w-full gap-2 text-sm font-bold shadow-xs"
      >
        <Play className="w-4 h-4" />
        <span>{buttonLabel}</span>
      </Button>
    </div>
  );
}
