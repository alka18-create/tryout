import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { ScoringService } from "@/modules/scoring/scoring.service";
import {
  ArrowLeft,
  Award,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  BookOpen,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  FileText,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Hasil & Diagnostik Ujian - TryoutKu",
  description: "Rincian nilai ujian dan analisis penguasaan materi per topik.",
};

interface ResultPageProps {
  params: Promise<{ id: string }>;
}

export default async function ExamResultPage({ params }: ResultPageProps) {
  const session = await auth();
  if (!session || !session.user?.id) {
    redirect("/auth/login");
  }

  const { id: sessionId } = await params;

  let result;
  try {
    result = await ScoringService.getExamSessionResult(session.user.id, sessionId);
  } catch (err: any) {
    notFound();
  }

  const isDiscussionAvailable =
    result.discussionVisibility === "ALWAYS" ||
    result.discussionVisibility === "AFTER_SUBMIT";

  return (
    <div className="max-w-4xl space-y-6 mx-auto">
      {/* Back to History */}
      <Link
        href="/dashboard/student/history"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Kembali ke Riwayat Tryout</span>
      </Link>

      {/* 1. HERO BANNER: Nilai & Status Kelulusan */}
      <Card className="p-6 md:p-8 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="info">{result.subjectName}</Badge>
              <Badge variant={result.isPassed ? "success" : "danger"}>
                {result.isPassed ? "LULUS STANDAR KKM" : "DI BAWAH KKM"}
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {result.tryoutTitle}
            </h1>
            <p className="text-xs text-slate-400">
              Diselesaikan pada{" "}
              {new Date(result.submittedAt).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          {/* Nilai Box */}
          <div className="flex items-center gap-4 bg-slate-950/80 p-5 rounded-2xl border border-slate-800/80 shrink-0">
            <div className="text-right">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Skor Akhir
              </span>
              <span className="text-xs text-slate-500">Standar KKM: {result.passingScore}</span>
            </div>
            <div className="text-5xl font-black text-white">{result.totalScore}</div>
          </div>
        </div>

        {/* 4 Metrik Ringkas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-slate-800/80">
          <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/60 text-center">
            <div className="flex items-center justify-center gap-1.5 text-emerald-400 mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-semibold">Benar</span>
            </div>
            <p className="text-xl font-black text-white">{result.correctCount}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/60 text-center">
            <div className="flex items-center justify-center gap-1.5 text-rose-400 mb-1">
              <XCircle className="w-4 h-4" />
              <span className="text-xs font-semibold">Salah</span>
            </div>
            <p className="text-xl font-black text-white">{result.wrongCount}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/60 text-center">
            <div className="flex items-center justify-center gap-1.5 text-slate-400 mb-1">
              <HelpCircle className="w-4 h-4" />
              <span className="text-xs font-semibold">Kosong</span>
            </div>
            <p className="text-xl font-black text-white">{result.unansweredCount}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/60 text-center">
            <div className="flex items-center justify-center gap-1.5 text-indigo-400 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-semibold">Waktu</span>
            </div>
            <p className="text-xl font-black text-white">{result.durationSpentMinutes} Menit</p>
          </div>
        </div>
      </Card>

      {/* 2. DIAGNOSTIK PENGUASAAN MATERI (TOPIC MASTERY) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="w-5 h-5 text-indigo-400" />
                Diagnostik Penguasaan Materi (Topic Mastery)
              </CardTitle>
              <CardDescription>
                Peta kekuatan dan kelemahan pemahaman konsep Anda pada setiap topik yang diujikan
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {result.topicMastery.map((tm) => {
            const isStrong = tm.percentage >= 75;
            const isMedium = tm.percentage >= 60 && tm.percentage < 75;

            return (
              <div key={tm.topicId} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{tm.topicName}</span>
                    <span className="text-slate-400">
                      ({tm.correctCount} dari {tm.totalCount} soal benar)
                    </span>
                  </div>
                  <span
                    className={`font-black ${
                      isStrong
                        ? "text-emerald-400"
                        : isMedium
                        ? "text-amber-400"
                        : "text-rose-400"
                    }`}
                  >
                    {tm.percentage}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isStrong
                        ? "bg-emerald-500"
                        : isMedium
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    }`}
                    style={{ width: `${Math.min(100, tm.percentage)}%` }}
                  />
                </div>
              </div>
            );
          })}

          {/* Rekomendasi Evaluasi Belajar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800/80">
            {/* Topik Terkuat */}
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                Materi Terkuat Anda
              </span>
              {result.strongestTopics.length > 0 ? (
                <ul className="text-xs text-slate-300 space-y-1">
                  {result.strongestTopics.map((t) => (
                    <li key={t.topicId} className="flex items-center justify-between">
                      <span>• {t.topicName}</span>
                      <span className="font-bold text-emerald-400">{t.percentage}%</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400">
                  Pertahankan latihan untuk meningkatkan akurasi konsep materi Anda.
                </p>
              )}
            </div>

            {/* Topik yang Butuh Perbaikan */}
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-2">
              <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Materi yang Perlu Dipelajari Lagi
              </span>
              {result.improvementTopics.length > 0 ? (
                <ul className="text-xs text-slate-300 space-y-1">
                  {result.improvementTopics.map((t) => (
                    <li key={t.topicId} className="flex items-center justify-between">
                      <span>• {t.topicName}</span>
                      <span className="font-bold text-rose-400">{t.percentage}%</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400">
                  Luar biasa! Tidak ada topik dengan tingkat pemahaman di bawah standar.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. FOOTER ACTIONS: Ke Pembahasan */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <h4 className="font-bold text-white text-sm">Pembahasan & Analisis Soal</h4>
          <p className="text-xs text-slate-400">
            {isDiscussionAvailable
              ? "Lihat kunci jawaban dan pembahasan komprehensif untuk setiap butir soal."
              : "Pembahasan untuk tryout ini belum dibuka oleh guru."}
          </p>
        </div>

        {isDiscussionAvailable ? (
          <Link href={`/dashboard/student/exam-sessions/${sessionId}/discussion`}>
            <Button variant="primary" className="gap-2 shrink-0 text-xs font-bold">
              <FileText className="w-4 h-4" />
              <span>Buka Pembahasan Soal →</span>
            </Button>
          </Link>
        ) : (
          <Button variant="outline" disabled className="gap-2 shrink-0 text-xs">
            <span>Pembahasan Terkunci</span>
          </Button>
        )}
      </div>
    </div>
  );
}
