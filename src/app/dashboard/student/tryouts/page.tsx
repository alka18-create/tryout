"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  BookOpen,
  Clock,
  HelpCircle,
  Play,
  Search,
  Award,
  ArrowRight,
  ChevronDown,
  Check,
  Filter,
} from "lucide-react";
import { Card } from "@/components/ui/card";
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
  maxAttempts?: number;
  attemptsUsed?: number;
  attemptsRemaining?: number;
  canRetake?: boolean;
  highestScore?: number | null;
  bestSessionId?: string | null;
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDropdownOpen]);

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

  const selectedSubjectObj = subjects.find((s) => s.id === subjectFilter);
  const selectedSubjectLabel =
    subjectFilter === "ALL"
      ? "Semua Mata Pelajaran"
      : selectedSubjectObj?.name || "Pilih Mata Pelajaran";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            Katalog Paket Tryout
          </h1>
          <p className="text-sm text-slate-500 mt-1">
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
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors shadow-2xs"
          />
        </div>

        {subjects.length > 0 && (
          <div className="relative shrink-0" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="w-full sm:w-auto min-w-[210px] px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-sm text-slate-800 flex items-center justify-between gap-3 transition-colors cursor-pointer select-none focus:outline-none focus:border-blue-600 shadow-2xs"
              aria-haspopup="listbox"
              aria-expanded={isDropdownOpen}
            >
              <div className="flex items-center gap-2 truncate">
                <Filter className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="truncate font-medium">{selectedSubjectLabel}</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                  isDropdownOpen ? "rotate-180 text-blue-600" : ""
                }`}
              />
            </button>

            {/* Custom Dropdown Menu */}
            {isDropdownOpen && (
              <div
                className="absolute top-full left-0 right-0 sm:right-auto sm:min-w-[240px] mt-1.5 z-30 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                role="listbox"
              >
                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                  Pilih Mata Pelajaran
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSubjectFilter("ALL");
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    subjectFilter === "ALL"
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                  role="option"
                  aria-selected={subjectFilter === "ALL"}
                >
                  <span className="truncate">Semua Mata Pelajaran</span>
                  {subjectFilter === "ALL" && <Check className="w-4 h-4 text-blue-600 shrink-0 ml-2" />}
                </button>

                {subjects.map((sub) => {
                  const isSelected = subjectFilter === sub.id;
                  const count = tryouts.filter((t) => t.subject.id === sub.id).length;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        setSubjectFilter(sub.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-blue-50 text-blue-700 font-semibold"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <span className="truncate">{sub.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                          {count}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Subject Filter Chips for Mobile */}
      {subjects.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 sm:hidden">
          <button
            type="button"
            onClick={() => setSubjectFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              subjectFilter === "ALL"
                ? "bg-blue-600 text-white shadow-2xs shadow-blue-600/30"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Semua ({tryouts.length})
          </button>
          {subjects.map((sub) => {
            const isSelected = subjectFilter === sub.id;
            const count = tryouts.filter((t) => t.subject.id === sub.id).length;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSubjectFilter(sub.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-2xs shadow-blue-600/30"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>{sub.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                    isSelected ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Tryouts Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-white border border-slate-200 animate-pulse space-y-4 shadow-2xs"
            >
              <div className="h-5 bg-slate-200 rounded w-1/3" />
              <div className="h-6 bg-slate-200 rounded w-3/4" />
              <div className="h-16 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : filteredTryouts.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-10 h-10 text-slate-400" />}
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
                className="flex flex-col justify-between hover:border-blue-400 hover:shadow-md transition-all group bg-white border-slate-200/90"
              >
                <div className="p-5 space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="info">{tryout.subject.name}</Badge>
                    {isCompleted ? (
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] font-semibold text-slate-600 bg-slate-50">
                          {tryout.attemptsUsed || 1}/{tryout.maxAttempts || 3}x
                        </Badge>
                        <Badge variant={tryout.isPassed ? "success" : "danger"}>
                          {tryout.isPassed ? "LULUS" : "BELUM LULUS"}
                        </Badge>
                      </div>
                    ) : isInProgress ? (
                      <Badge variant="warning" className="animate-pulse">
                        SEDANG BERLANGSUNG
                      </Badge>
                    ) : (
                      <Badge variant="outline">TERSEDIA (Maks {tryout.maxAttempts || 3}x)</Badge>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {tryout.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {tryout.description || "Uji pemahaman Anda dengan paket tryout terstruktur ini."}
                    </p>
                  </div>

                  {/* Specs */}
                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 text-center">
                    <div>
                      <span className="text-[11px] text-slate-500 flex items-center justify-center gap-1 font-medium">
                        <Clock className="w-3 h-3 text-slate-400" />
                        Durasi
                      </span>
                      <p className="text-xs font-bold text-slate-800 mt-0.5">
                        {tryout.durationMinutes} Menit
                      </p>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-500 flex items-center justify-center gap-1 font-medium">
                        <HelpCircle className="w-3 h-3 text-slate-400" />
                        Soal
                      </span>
                      <p className="text-xs font-bold text-slate-800 mt-0.5">
                        {tryout.questionCount} Butir
                      </p>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-500 flex items-center justify-center gap-1 font-medium">
                        <Award className="w-3 h-3 text-slate-400" />
                        KKM
                      </span>
                      <p className="text-xs font-bold text-emerald-700 mt-0.5">
                        {tryout.passingScore}
                      </p>
                    </div>
                  </div>

                  {/* Score box if completed */}
                  {isCompleted && (tryout.highestScore !== null || tryout.latestScore !== null) && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600 font-medium">Nilai Tertinggi:</span>
                        <span
                          className={`text-sm font-extrabold ${
                            tryout.isPassed ? "text-emerald-700" : "text-rose-600"
                          }`}
                        >
                          {tryout.highestScore ?? tryout.latestScore} / 100
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                        <span>Percobaan:</span>
                        <span className="font-semibold text-slate-700">
                          {tryout.attemptsUsed || 1} dari {tryout.maxAttempts || 3}x ({tryout.attemptsRemaining ?? 0} sisa)
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Countdown banner if in progress */}
                  {isInProgress && (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-semibold">
                        <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                        Sisa Waktu Ujian:
                      </span>
                      <span className="font-bold text-amber-900">
                        {Math.floor(tryout.remainingSeconds / 60)}m {tryout.remainingSeconds % 60}s
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer Action */}
                <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2.5">
                  <span className="text-[11px] text-slate-500 font-medium shrink-0">
                    {tryout.questionCount > 0 ? "Pilihan Ganda A–E" : "Soal Kosong"}
                  </span>

                  {isInProgress ? (
                    <Link href={`/exam/${tryout.latestSessionId}`} className="shrink-0">
                      <Button variant="warning" size="sm" className="gap-2 text-xs font-bold">
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Lanjutkan</span>
                      </Button>
                    </Link>
                  ) : tryout.canRetake ? (
                    <Link href={`/dashboard/student/tryouts/${tryout.id}`} className="shrink-0">
                      <Button variant="primary" size="sm" className="gap-1.5 text-xs font-bold shadow-xs">
                        <Play className="w-3.5 h-3.5" />
                        <span>Kerjakan Lagi ({tryout.attemptsRemaining}x Sisa)</span>
                      </Button>
                    </Link>
                  ) : isCompleted ? (
                    <Link href={`/dashboard/student/tryouts/${tryout.id}`} className="shrink-0">
                      <Button variant="secondary" size="sm" className="gap-1.5 text-xs">
                        <span>Lihat Hasil</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  ) : (
                    <Link href={`/dashboard/student/tryouts/${tryout.id}`} className="shrink-0">
                      <Button variant="primary" size="sm" className="gap-1.5 text-xs">
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
