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
    <div className="max-w-5xl space-y-7 mx-auto pb-10">
      {/* Back to History */}
      <Link
        href="/dashboard/student/history"
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Kembali ke Riwayat Tryout</span>
      </Link>

      {/* 1. HERO BANNER: Nilai & Status Kelulusan */}
      <Card className="p-7 md:p-9 bg-white border-slate-200/90 shadow-sm rounded-3xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge variant="info" className="text-xs sm:text-sm px-3.5 py-1 font-bold rounded-xl">
                {result.subjectName}
              </Badge>
              <Badge variant="outline" className="text-xs sm:text-sm font-bold text-slate-700 bg-slate-50 border-slate-200 px-3.5 py-1 rounded-xl">
                Percobaan #{result.attemptNumber} dari {result.maxAttempts}x
              </Badge>
              <Badge
                variant={result.isPassed ? "success" : "danger"}
                className="text-xs sm:text-sm px-3.5 py-1 font-black rounded-xl"
              >
                {result.isPassed ? "LULUS STANDAR KKM" : "DI BAWAH KKM"}
              </Badge>
              {result.isHighestScore && (
                <Badge variant="success" className="text-xs sm:text-sm font-black px-3.5 py-1 rounded-xl">
                  SKOR TERTINGGI RESMI
                </Badge>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
              {result.tryoutTitle}
            </h1>
            <p className="text-sm sm:text-base text-slate-500">
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
          <div className="flex items-center gap-5 bg-slate-50/90 p-6 rounded-3xl border border-slate-200 shrink-0">
            <div className="text-right space-y-0.5">
              <span className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider block">
                Skor Percobaan Ini
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-400 block">
                Standar KKM: {result.passingScore}
              </span>
              {!result.isHighestScore && (
                <span className="text-xs sm:text-sm font-bold text-emerald-600 block mt-1">
                  Tertinggi: {result.highestScore}
                </span>
              )}
            </div>
            <div className="text-6xl sm:text-7xl font-black text-slate-900 tracking-tight">
              {result.totalScore}
            </div>
          </div>
        </div>

        {/* Riwayat Percobaan Siswa Lainnya (Jika > 1) */}
        {result.allAttempts && result.allAttempts.length > 1 && (
          <div className="pt-5 mt-5 border-t border-slate-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-sm gap-1">
              <span className="font-bold text-slate-800">Riwayat Percobaan Paket Ini:</span>
              <span className="text-slate-500 text-xs sm:text-sm">
                Nilai resmi diambil dari skor tertinggi (<strong>{result.highestScore}</strong>)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {result.allAttempts.map((att: any) => {
                const isCurrent = att.id === sessionId;
                return (
                  <div
                    key={att.id}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                      isCurrent
                        ? "bg-blue-50/90 border-blue-300 ring-2 ring-blue-400/40"
                        : att.isHighestScore
                        ? "bg-emerald-50/70 border-emerald-300"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-800">
                          Percobaan #{att.attemptNumber}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-600 text-white font-black">
                            INI
                          </span>
                        )}
                        {att.isHighestScore && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-600 text-white font-black">
                            TERBAIK
                          </span>
                        )}
                      </div>
                      <span className="text-2xl font-black text-slate-900 block mt-1">
                        {att.totalScore}
                      </span>
                    </div>

                    {!isCurrent && (
                      <Link
                        href={`/dashboard/student/exam-sessions/${att.id}/result`}
                        className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 font-bold px-2.5 py-1 rounded-lg hover:bg-blue-100/50 transition-colors"
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-6 mt-6 border-t border-slate-100">
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 text-center">
            <div className="flex items-center justify-center gap-1.5 text-emerald-600 mb-1.5">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-xs sm:text-sm font-bold">Benar</span>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900">{result.correctCount}</p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 text-center">
            <div className="flex items-center justify-center gap-1.5 text-rose-600 mb-1.5">
              <XCircle className="w-5 h-5" />
              <span className="text-xs sm:text-sm font-bold">Salah</span>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900">{result.wrongCount}</p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 text-center">
            <div className="flex items-center justify-center gap-1.5 text-slate-500 mb-1.5">
              <HelpCircle className="w-5 h-5" />
              <span className="text-xs sm:text-sm font-bold">Kosong</span>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900">{result.unansweredCount}</p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 text-center">
            <div className="flex items-center justify-center gap-1.5 text-blue-600 mb-1.5">
              <Clock className="w-5 h-5" />
              <span className="text-xs sm:text-sm font-bold">Waktu</span>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900">{result.durationSpentMinutes} Menit</p>
          </div>
        </div>
      </Card>

      {/* 2. DIAGNOSTIK PENGUASAAN MATERI (TOPIC MASTERY) */}
      <Card className="bg-white border-slate-200/90 shadow-sm rounded-3xl">
        <CardHeader className="border-b border-slate-100 p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2.5 text-xl sm:text-2xl font-black text-slate-900">
                <TrendingUp className="w-6 h-6 text-blue-600" />
                Diagnostik Penguasaan Materi (Topic Mastery)
              </CardTitle>
              <CardDescription className="text-sm sm:text-base text-slate-500 mt-1">
                Peta kekuatan dan kelemahan pemahaman konsep Anda pada setiap topik yang diujikan
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-6 sm:p-8">
          {result.topicMastery.map((tm) => {
            const isStrong = tm.percentage >= 75;
            const isMedium = tm.percentage >= 60 && tm.percentage < 75;

            return (
              <div key={tm.topicId} className="space-y-2">
                <div className="flex items-center justify-between text-sm sm:text-base">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{tm.topicName}</span>
                    <span className="text-xs sm:text-sm text-slate-500 font-medium">
                      ({tm.correctCount} dari {tm.totalCount} soal benar)
                    </span>
                  </div>
                  <span
                    className={`font-black text-base sm:text-lg ${
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
                <div className="h-3 sm:h-3.5 rounded-full bg-slate-100 overflow-hidden">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-6 border-t border-slate-100">
            {/* Topik Terkuat */}
            <div className="p-5 sm:p-6 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 space-y-3">
              <span className="text-sm sm:text-base font-bold text-emerald-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                Materi Terkuat Anda
              </span>
              {result.strongestTopics.length > 0 ? (
                <ul className="text-sm text-slate-700 space-y-2">
                  {result.strongestTopics.map((t) => (
                    <li key={t.topicId} className="flex items-center justify-between font-semibold">
                      <span>• {t.topicName}</span>
                      <span className="font-black text-emerald-600">{t.percentage}%</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs sm:text-sm text-slate-500">
                  Pertahankan latihan untuk meningkatkan akurasi konsep materi Anda.
                </p>
              )}
            </div>

            {/* Topik yang Butuh Perbaikan */}
            <div className="p-5 sm:p-6 rounded-2xl bg-rose-50/80 border border-rose-200/80 space-y-3">
              <span className="text-sm sm:text-base font-bold text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                Materi yang Perlu Dipelajari Lagi
              </span>
              {result.improvementTopics.length > 0 ? (
                <>
                  <ul className="text-sm text-slate-700 space-y-2">
                    {result.improvementTopics.map((t) => (
                      <li key={t.topicId} className="flex items-center justify-between font-semibold py-0.5">
                        <span className="truncate pr-2">• {t.topicName}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-black text-rose-600">{t.percentage}%</span>
                          <Link
                            href={`/dashboard/student/materials?search=${encodeURIComponent(t.topicName)}`}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 bg-white px-3 py-1 rounded-xl border border-rose-200 hover:border-blue-300 transition-colors shadow-2xs"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            Pelajari
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="pt-3 mt-3 border-t border-rose-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs sm:text-sm">
                    <span className="text-rose-700 font-medium">Pelajari materi sebelum mencoba ujian lagi:</span>
                    <Link
                      href="/dashboard/student/materials"
                      className="font-bold text-blue-700 hover:text-blue-900 underline text-xs sm:text-sm"
                    >
                      Buka Materi Belajar →
                    </Link>
                  </div>
                </>
              ) : (
                <p className="text-xs sm:text-sm text-slate-500">
                  Luar biasa! Tidak ada topik dengan tingkat pemahaman di bawah standar.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. RETAKE CARD (Jika masih ada sisa percobaan) */}
      {result.canRetake && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 p-6 rounded-3xl bg-blue-50/90 border border-blue-200 shadow-2xs">
          <div className="space-y-1">
            <h4 className="font-extrabold text-slate-900 text-base sm:text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              Tingkatkan Nilai Anda
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Anda masih memiliki <strong>{result.attemptsRemaining}x kesempatan</strong> percobaan lagi. Nilai tertinggi dari seluruh percobaan Anda yang akan diambil.
            </p>
          </div>
          <Link href={`/dashboard/student/tryouts/${result.tryoutId}`} className="shrink-0">
            <Button variant="primary" size="lg" className="gap-2 text-xs sm:text-sm font-black shadow-md shadow-blue-600/20 py-3 px-5 rounded-2xl w-full sm:w-auto">
              <span>Coba Lagi (Sisa {result.attemptsRemaining}x) →</span>
            </Button>
          </Link>
        </div>
      )}

      {/* 4. FOOTER ACTIONS: Ke Pembahasan */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm">
        <div className="space-y-1">
          <h4 className="font-extrabold text-slate-900 text-base sm:text-lg">Pembahasan & Analisis Soal</h4>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            {isDiscussionAvailable
              ? "Lihat kunci jawaban dan pembahasan komprehensif untuk setiap butir soal."
              : "Pembahasan untuk tryout ini belum dibuka oleh guru."}
          </p>
        </div>

        {isDiscussionAvailable ? (
          <Link href={`/dashboard/student/exam-sessions/${sessionId}/discussion`} className="shrink-0">
            <Button variant="primary" size="lg" className="gap-2 text-xs sm:text-sm font-black shadow-md shadow-blue-600/20 py-3 px-5 rounded-2xl w-full sm:w-auto">
              <FileText className="w-4 h-4" />
              <span>Buka Pembahasan Soal →</span>
            </Button>
          </Link>
        ) : (
          <Button variant="outline" size="lg" disabled className="gap-2 text-xs sm:text-sm font-bold shrink-0 rounded-2xl">
            <span>Pembahasan Terkunci</span>
          </Button>
        )}
      </div>
    </div>
  );
}
