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
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Kembali ke Riwayat Tryout</span>
      </Link>

      {/* 1. HERO BANNER: Nilai & Status Kelulusan */}
      <Card className="p-6 md:p-8 bg-white border-slate-200/90 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info">{result.subjectName}</Badge>
              <Badge variant="outline" className="text-xs font-semibold text-slate-700 bg-slate-50">
                Percobaan #{result.attemptNumber} dari {result.maxAttempts}x
              </Badge>
              <Badge variant={result.isPassed ? "success" : "danger"}>
                {result.isPassed ? "LULUS STANDAR KKM" : "DI BAWAH KKM"}
              </Badge>
              {result.isHighestScore && (
                <Badge variant="success" className="text-xs font-bold">
                  SKOR TERTINGGI RESMI
                </Badge>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {result.tryoutTitle}
            </h1>
            <p className="text-xs text-slate-500">
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
          <div className="flex items-center gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200 shrink-0">
            <div className="text-right">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Skor Percobaan Ini
              </span>
              <span className="text-xs text-slate-400">Standar KKM: {result.passingScore}</span>
              {!result.isHighestScore && (
                <span className="text-[11px] font-bold text-emerald-600 block mt-1">
                  Tertinggi: {result.highestScore}
                </span>
              )}
            </div>
            <div className="text-5xl font-black text-slate-900">{result.totalScore}</div>
          </div>
        </div>

        {/* Riwayat Percobaan Siswa Lainnya (Jika > 1) */}
        {result.allAttempts && result.allAttempts.length > 1 && (
          <div className="pt-4 mt-4 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">Riwayat Percobaan Paket Ini:</span>
              <span className="text-slate-500">Nilai resmi diambil dari skor tertinggi ({result.highestScore})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {result.allAttempts.map((att: any) => {
                const isCurrent = att.id === sessionId;
                return (
                  <div
                    key={att.id}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                      isCurrent
                        ? "bg-blue-50/90 border-blue-300 ring-1 ring-blue-400"
                        : att.isHighestScore
                        ? "bg-emerald-50/70 border-emerald-300"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800">
                          Percobaan #{att.attemptNumber}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-600 text-white font-bold">
                            INI
                          </span>
                        )}
                        {att.isHighestScore && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-600 text-white font-bold">
                            TERBAIK
                          </span>
                        )}
                      </div>
                      <span className="text-lg font-black text-slate-900 block mt-0.5">
                        {att.totalScore}
                      </span>
                    </div>

                    {!isCurrent && (
                      <Link
                        href={`/dashboard/student/exam-sessions/${att.id}/result`}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        Lihat →
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4 Metrik Ringkas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-slate-100">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
            <div className="flex items-center justify-center gap-1.5 text-emerald-600 mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-semibold">Benar</span>
            </div>
            <p className="text-xl font-black text-slate-900">{result.correctCount}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
            <div className="flex items-center justify-center gap-1.5 text-rose-600 mb-1">
              <XCircle className="w-4 h-4" />
              <span className="text-xs font-semibold">Salah</span>
            </div>
            <p className="text-xl font-black text-slate-900">{result.wrongCount}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
            <div className="flex items-center justify-center gap-1.5 text-slate-500 mb-1">
              <HelpCircle className="w-4 h-4" />
              <span className="text-xs font-semibold">Kosong</span>
            </div>
            <p className="text-xl font-black text-slate-900">{result.unansweredCount}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
            <div className="flex items-center justify-center gap-1.5 text-blue-600 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-semibold">Waktu</span>
            </div>
            <p className="text-xl font-black text-slate-900">{result.durationSpentMinutes} Menit</p>
          </div>
        </div>
      </Card>

      {/* 2. DIAGNOSTIK PENGUASAAN MATERI (TOPIC MASTERY) */}
      <Card className="bg-white border-slate-200/90 shadow-xs">
        <CardHeader className="border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Diagnostik Penguasaan Materi (Topic Mastery)
              </CardTitle>
              <CardDescription className="text-slate-500">
                Peta kekuatan dan kelemahan pemahaman konsep Anda pada setiap topik yang diujikan
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-4">
          {result.topicMastery.map((tm) => {
            const isStrong = tm.percentage >= 75;
            const isMedium = tm.percentage >= 60 && tm.percentage < 75;

            return (
              <div key={tm.topicId} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{tm.topicName}</span>
                    <span className="text-slate-500">
                      ({tm.correctCount} dari {tm.totalCount} soal benar)
                    </span>
                  </div>
                  <span
                    className={`font-black ${
                      isStrong
                        ? "text-emerald-600"
                        : isMedium
                        ? "text-amber-600"
                        : "text-rose-600"
                    }`}
                  >
                    {tm.percentage}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            {/* Topik Terkuat */}
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200/80 space-y-2">
              <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Materi Terkuat Anda
              </span>
              {result.strongestTopics.length > 0 ? (
                <ul className="text-xs text-slate-700 space-y-1">
                  {result.strongestTopics.map((t) => (
                    <li key={t.topicId} className="flex items-center justify-between font-medium">
                      <span>• {t.topicName}</span>
                      <span className="font-bold text-emerald-600">{t.percentage}%</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">
                  Pertahankan latihan untuk meningkatkan akurasi konsep materi Anda.
                </p>
              )}
            </div>

            {/* Topik yang Butuh Perbaikan */}
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200/80 space-y-2">
              <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Materi yang Perlu Dipelajari Lagi
              </span>
              {result.improvementTopics.length > 0 ? (
                <>
                  <ul className="text-xs text-slate-700 space-y-1.5">
                    {result.improvementTopics.map((t) => (
                      <li key={t.topicId} className="flex items-center justify-between font-medium py-0.5">
                        <span className="truncate pr-2">• {t.topicName}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold text-rose-600">{t.percentage}%</span>
                          <Link
                            href={`/dashboard/student/materials?search=${encodeURIComponent(t.topicName)}`}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-white px-2 py-0.5 rounded border border-rose-200 hover:border-blue-300 transition-colors shadow-2xs"
                          >
                            <BookOpen className="w-3 h-3" />
                            Pelajari
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="pt-2 mt-2 border-t border-rose-200/60 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-rose-700">Pelajari materi sebelum mencoba ujian lagi:</span>
                    <Link
                      href="/dashboard/student/materials"
                      className="font-bold text-blue-700 hover:text-blue-900 underline text-[11px]"
                    >
                      Buka Materi Belajar →
                    </Link>
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-500">
                  Luar biasa! Tidak ada topik dengan tingkat pemahaman di bawah standar.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. RETAKE CARD (Jika masih ada sisa percobaan) */}
      {result.canRetake && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-blue-50/80 border border-blue-200">
          <div>
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              Tingkatkan Nilai Anda
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              Anda masih memiliki <strong>{result.attemptsRemaining}x kesempatan</strong> percobaan lagi. Nilai tertinggi dari seluruh percobaan Anda yang akan diambil.
            </p>
          </div>
          <Link href={`/dashboard/student/tryouts/${result.tryoutId}`}>
            <Button variant="primary" className="gap-2 shrink-0 text-xs font-bold shadow-xs">
              <span>Coba Lagi (Sisa {result.attemptsRemaining}x) →</span>
            </Button>
          </Link>
        </div>
      )}

      {/* 4. FOOTER ACTIONS: Ke Pembahasan */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
        <div>
          <h4 className="font-bold text-slate-900 text-sm">Pembahasan & Analisis Soal</h4>
          <p className="text-xs text-slate-500">
            {isDiscussionAvailable
              ? "Lihat kunci jawaban dan pembahasan komprehensif untuk setiap butir soal."
              : "Pembahasan untuk tryout ini belum dibuka oleh guru."}
          </p>
        </div>

        {isDiscussionAvailable ? (
          <Link href={`/dashboard/student/exam-sessions/${sessionId}/discussion`}>
            <Button variant="primary" className="gap-2 shrink-0 text-xs font-bold shadow-xs">
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
