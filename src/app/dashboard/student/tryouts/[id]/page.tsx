import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { ExamService } from "@/modules/exam/exam.service";
import {
  ArrowLeft,
  Clock,
  HelpCircle,
  Award,
  Play,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StartTryoutButton } from "@/components/student/start-tryout-button";

export const metadata = {
  title: "Detail Paket Tryout - TryoutKu",
  description: "Petunjuk pengerjaan dan konfirmasi mulai ujian tryout.",
};

interface StudentTryoutDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function StudentTryoutDetailPage({ params }: StudentTryoutDetailPageProps) {
  const session = await auth();
  if (!session || !session.user?.id) {
    redirect("/auth/login");
  }

  const { id } = await params;

  let tryout;
  try {
    tryout = await ExamService.getTryoutDetailForStudent(session.user.id, id);
  } catch {
    notFound();
  }

  const isInProgress = tryout.participationStatus === "IN_PROGRESS";
  const isCompleted =
    tryout.participationStatus === "SUBMITTED" || tryout.participationStatus === "EXPIRED";

  return (
    <div className="max-w-3xl space-y-6 mx-auto">
      {/* Back Link */}
      <Link
        href="/dashboard/student/tryouts"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Kembali ke Katalog Tryout</span>
      </Link>

      {/* Main Header Card */}
      <Card className="p-6 md:p-8 space-y-6 bg-white border-slate-200 shadow-sm">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">{tryout.subject.name}</Badge>
            {isCompleted ? (
              <>
                <Badge variant="outline" className="text-xs font-semibold text-slate-600 bg-slate-50">
                  {tryout.attemptsUsed}/{tryout.maxAttempts}x Percobaan
                </Badge>
                <Badge variant={tryout.isPassed ? "success" : "danger"}>
                  {tryout.isPassed ? "LULUS UJIAN" : "BELUM LULUS"}
                </Badge>
              </>
            ) : isInProgress ? (
              <Badge variant="warning" className="animate-pulse">
                SEDANG BERLANGSUNG (PERCOBAAN #{tryout.attemptsUsed})
              </Badge>
            ) : (
              <Badge variant="outline">SIAP DIKERJAKAN (MAKS {tryout.maxAttempts}X)</Badge>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {tryout.title}
          </h1>

          <p className="text-sm text-slate-600 leading-relaxed">
            {tryout.description ||
              "Paket tryout ini dirancang untuk menguji pemahaman konsep materi secara mendalam melalui pilihan ganda berbobot."}
          </p>
        </div>

        {/* Specs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-y border-slate-100">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
            <Clock className="w-4 h-4 text-blue-600 mx-auto mb-1" />
            <span className="text-[11px] text-slate-500 font-medium">Durasi Pengerjaan</span>
            <p className="text-sm font-bold text-slate-900 mt-0.5">{tryout.durationMinutes} Menit</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
            <HelpCircle className="w-4 h-4 text-blue-600 mx-auto mb-1" />
            <span className="text-[11px] text-slate-500 font-medium">Jumlah Soal</span>
            <p className="text-sm font-bold text-slate-900 mt-0.5">{tryout.questionCount} Butir</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
            <Award className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
            <span className="text-[11px] text-slate-500 font-medium">Standar KKM</span>
            <p className="text-sm font-bold text-emerald-700 mt-0.5">{tryout.passingScore} / 100</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
            <Sparkles className="w-4 h-4 text-amber-600 mx-auto mb-1" />
            <span className="text-[11px] text-slate-500 font-medium">Batas Percobaan</span>
            <p className="text-sm font-bold text-slate-900 mt-0.5">{tryout.maxAttempts}x (Skor Terbaik)</p>
          </div>
        </div>

        {/* Past Result Summary if Completed */}
        {isCompleted && (tryout.highestScore !== null || tryout.latestScore !== null) && (
          <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-blue-800 font-semibold uppercase tracking-wider">
                  Nilai Resmi Anda (Tertinggi):
                </span>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="text-3xl font-black text-slate-900">
                    {tryout.highestScore ?? tryout.latestScore}
                  </span>
                  <span className="text-xs text-slate-500">dari 100 poin</span>
                  <Badge variant={tryout.isPassed ? "success" : "danger"} className="ml-2">
                    {tryout.isPassed ? "LULUS KKM" : "DI BAWAH KKM"}
                  </Badge>
                </div>
              </div>
              <Link href="/dashboard/student">
                <Button variant="outline" size="sm" className="gap-2 bg-white shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Lihat di Dashboard</span>
                </Button>
              </Link>
            </div>

            {/* Riwayat Semua Percobaan */}
            {tryout.attemptsHistory && tryout.attemptsHistory.length > 0 && (
              <div className="pt-3 border-t border-blue-200/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">Riwayat Nilai Setiap Percobaan:</span>
                  <span className="text-slate-500 text-[11px]">
                    Sisa Percobaan: {tryout.attemptsRemaining} dari {tryout.maxAttempts}x
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {tryout.attemptsHistory.map((att: any) => (
                    <div
                      key={att.sessionId}
                      className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                        att.isHighestScore
                          ? "bg-emerald-50/90 border-emerald-300 ring-1 ring-emerald-400"
                          : "bg-white border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">
                          Percobaan #{att.attemptNumber}
                        </span>
                        {att.isHighestScore ? (
                          <Badge variant="success" className="text-[9px] px-1.5 py-0 font-bold">
                            NILAI TERBAIK
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">
                            {att.isPassed ? "Lulus" : "Remidi"}
                          </span>
                        )}
                      </div>
                      <div className="mt-2.5 flex items-baseline justify-between">
                        <span className="text-xl font-black text-slate-900">{att.totalScore}</span>
                        <Link
                          href={`/dashboard/student/exam-sessions/${att.sessionId}/result`}
                          className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                        >
                          Rincian →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Exam Rules & Instructions */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-blue-600" />
            Petunjuk & Kebijakan Percobaan
          </h3>

          <ul className="text-xs text-slate-600 space-y-2 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>
                <strong>Maksimal {tryout.maxAttempts}x Percobaan:</strong> Anda dapat mengulang
                tryout hingga {tryout.maxAttempts} kali untuk memperbaiki nilai. Nilai tertinggi dari
                seluruh percobaan yang Anda lakukan adalah nilai resmi Anda.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>
                <strong>Soal & Opsi Teracak Dinamis:</strong> Setiap sesi percobaan baru menyajikan
                kombinasi urutan soal dan pilihan jawaban yang teracak secara unik.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>
                <strong>Timer Server-Authoritative:</strong> Waktu ujian dihitung dari server secara
                real-time meskipun browser ditutup.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>
                <strong>Autosave Otomatis:</strong> Setiap jawaban langsung tersimpan seketika di
                server cloud.
              </span>
            </li>
          </ul>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          {isInProgress ? (
            <Link href={`/exam/${tryout.activeSessionId}`} className="block">
              <Button variant="warning" size="lg" className="w-full gap-2 font-bold text-sm">
                <Play className="w-4 h-4 fill-current" />
                <span>
                  Lanjutkan Sesi Ujian (Percobaan #{tryout.attemptsUsed}) -{" "}
                  {Math.floor(tryout.remainingSeconds / 60)} Menit Tersisa →
                </span>
              </Button>
            </Link>
          ) : tryout.canRetake ? (
            <StartTryoutButton
              tryoutId={tryout.id}
              questionCount={tryout.questionCount}
              attemptNumber={tryout.attemptsUsed + 1}
              maxAttempts={tryout.maxAttempts}
            />
          ) : isCompleted ? (
            <div className="text-center py-3 px-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-medium">
              Batas maksimal {tryout.maxAttempts}x percobaan telah tercapai. Nilai tertinggi Anda yang
              tersimpan adalah <strong>{tryout.highestScore}</strong>.
            </div>
          ) : (
            <StartTryoutButton
              tryoutId={tryout.id}
              questionCount={tryout.questionCount}
              attemptNumber={1}
              maxAttempts={tryout.maxAttempts}
            />
          )}
        </div>
      </Card>
    </div>
  );
}
