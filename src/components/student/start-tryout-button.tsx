"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StartTryoutButtonProps {
  tryoutId: string;
  questionCount: number;
}

export function StartTryoutButton({ tryoutId, questionCount }: StartTryoutButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    if (questionCount === 0) {
      setError("Paket tryout ini belum memiliki soal.");
      return;
    }

    if (!confirm("Apakah Anda sudah siap memulai tryout ini? Waktu pengerjaan akan langsung berjalan.")) {
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

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
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
        className="w-full gap-2 text-sm font-bold shadow-lg shadow-indigo-500/20"
      >
        <Play className="w-4 h-4" />
        <span>Mulai Kerjakan Tryout Sekarang →</span>
      </Button>
    </div>
  );
}
