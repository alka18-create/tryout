"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  BookOpen,
  Clock,
  HelpCircle,
  Play,
  CheckCircle2,
  AlertCircle,
  Search,
  Award,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

interface TryoutStudentItem {
  id: string;
  title: string;
  description: string | null;
  subject: {
    id: string;
    name: string;
    code: string;
  };
  durationMinutes: number;
  passingScore: number;
  questionCount: number;
  startDate: string | null;
  endDate: string | null;
  isPeriodActive: boolean;
  participationStatus: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "EXPIRED";
  remainingSeconds: number;
  latestSessionId: string | null;
  latestScore: number | null;
  isPassed: boolean | null;
}

export default function StudentTryoutsPage() {
  const [tryouts, setTryouts] = useState<TryoutStudentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("ALL");
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([]);

  const fetchTryouts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/student/tryouts");
      const json = await res.json();
      if (json.success && json.data) {
        setTryouts(json.data);

        // Ambil daftar unik mata pelajaran
        const subsMap = new Map<string, string>();
        json.data.forEach((t: TryoutStudentItem) => {
          subsMap.set(t.subject.id, t.subject.name);
        });
        const subsArray = Array.from(subsMap.entries()).map(([id, name]) => ({ id, name }));
        setSubjects(subsArray);
      }
    } catch {
      console.error("Gagal memuat paket tryout");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTryouts();
  }, [fetchTryouts]);

  const filteredTryouts = tryouts.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase()));
    const matchesSubject = subjectFilter === "ALL" || t.subject.id === subjectFilter;
    return matchesSearch && matchesSubject;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-400" />
            Katalog Paket Tryout
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Pilih paket ujian tryout berbasis materi untuk mengukur pemahaman dan kesiapan Anda.
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari judul tryout atau materi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {subjects.length > 0 && (
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 outline-none"
          >
            <option value="ALL">Semua Mata Pelajaran</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Tryouts Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse space-y-4"
            >
              <div className="h-5 bg-slate-800 rounded w-1/3" />
              <div className="h-6 bg-slate-800 rounded w-3/4" />
              <div className="h-16 bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      ) : filteredTryouts.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-10 h-10 text-slate-500" />}
          title="Tidak Ada Tryout yang Cocok"
          description="Saat ini belum ada paket tryout yang sesuai dengan pencarian atau filter yang Anda pilih."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTryouts.map((tryout) => {
            const isInProgress = tryout.participationStatus === "IN_PROGRESS";
            const isCompleted =
              tryout.participationStatus === "SUBMITTED" || tryout.participationStatus === "EXPIRED";

            return (
              <Card
                key={tryout.id}
                className="flex flex-col justify-between hover:border-slate-700 transition-all group"
              >
                <div className="p-5 space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="info">{tryout.subject.name}</Badge>
                    {isCompleted ? (
                      <Badge variant={tryout.isPassed ? "success" : "danger"}>
                        {tryout.isPassed ? "LULUS" : "BELUM LULUS"}
                      </Badge>
                    ) : isInProgress ? (
                      <Badge variant="warning" className="animate-pulse">
                        SEDANG BERLANGSUNG
                      </Badge>
                    ) : (
                      <Badge variant="outline">TERSEDIA</Badge>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-lg text-white group-hover:text-indigo-400 transition-colors line-clamp-2">
                      {tryout.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {tryout.description || "Uji pemahaman Anda dengan paket tryout terstruktur ini."}
                    </p>
                  </div>

                  {/* Specs */}
                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-800/80 text-center">
                    <div>
                      <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        Durasi
                      </span>
                      <p className="text-xs font-bold text-slate-200 mt-0.5">
                        {tryout.durationMinutes} Menit
                      </p>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                        <HelpCircle className="w-3 h-3 text-slate-500" />
                        Soal
                      </span>
                      <p className="text-xs font-bold text-slate-200 mt-0.5">
                        {tryout.questionCount} Butir
                      </p>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                        <Award className="w-3 h-3 text-slate-500" />
                        KKM
                      </span>
                      <p className="text-xs font-bold text-emerald-400 mt-0.5">
                        {tryout.passingScore}
                      </p>
                    </div>
                  </div>

                  {/* Score box if completed */}
                  {isCompleted && tryout.latestScore !== null && (
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-medium">Skor Terakhir Anda:</span>
                      <span
                        className={`text-sm font-extrabold ${
                          tryout.isPassed ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {tryout.latestScore} / 100
                      </span>
                    </div>
                  )}

                  {/* Countdown banner if in progress */}
                  {isInProgress && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-semibold">
                        <Clock className="w-3.5 h-3.5 animate-spin" />
                        Sisa Waktu Ujian:
                      </span>
                      <span className="font-bold">
                        {Math.floor(tryout.remainingSeconds / 60)}m {tryout.remainingSeconds % 60}s
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer Action */}
                <div className="p-4 bg-slate-950/40 border-t border-slate-800/80 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-500">
                    {tryout.questionCount > 0 ? "Pilihan Ganda A–E" : "Soal Kosong"}
                  </span>

                  {isInProgress ? (
                    <Link href={`/exam/${tryout.latestSessionId}`} className="w-full sm:w-auto">
                      <Button variant="warning" size="sm" className="w-full gap-2 text-xs font-bold">
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Lanjutkan Ujian</span>
                      </Button>
                    </Link>
                  ) : isCompleted ? (
                    <Link href={`/dashboard/student/tryouts/${tryout.id}`} className="w-full sm:w-auto">
                      <Button variant="secondary" size="sm" className="w-full gap-1.5 text-xs">
                        <span>Lihat Ringkasan</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  ) : (
                    <Link href={`/dashboard/student/tryouts/${tryout.id}`} className="w-full sm:w-auto">
                      <Button variant="primary" size="sm" className="w-full gap-1.5 text-xs">
                        <Play className="w-3.5 h-3.5" />
                        <span>Mulai Tryout</span>
                      </Button>
                    </Link>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
