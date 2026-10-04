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
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
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
  } catch (err: any) {
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
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Kembali ke Katalog Tryout</span>
      </Link>

      {/* Main Header Card */}
      <Card className="p-6 md:p-8 space-y-6 bg-gradient-to-b from-slate-900 to-slate-950 border-slate-800">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">{tryout.subject.name}</Badge>
            {isCompleted ? (
              <Badge variant={tryout.isPassed ? "success" : "danger"}>
                {tryout.isPassed ? "LULUS UJIAN" : "BELUM LULUS"}
              </Badge>
            ) : isInProgress ? (
              <Badge variant="warning" className="animate-pulse">
                SEDANG BERLANGSUNG
              </Badge>
            ) : (
              <Badge variant="outline">SIAP DIKERJAKAN</Badge>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {tryout.title}
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed">
            {tryout.description ||
              "Paket tryout ini dirancang untuk menguji pemahaman konsep materi secara mendalam melalui pilihan ganda berbobot."}
          </p>
        </div>

        {/* Specs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-y border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
            <Clock className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
            <span className="text-[11px] text-slate-400">Durasi Pengerjaan</span>
            <p className="text-sm font-bold text-white mt-0.5">{tryout.durationMinutes} Menit</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
            <HelpCircle className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
            <span className="text-[11px] text-slate-400">Jumlah Soal</span>
            <p className="text-sm font-bold text-white mt-0.5">{tryout.questionCount} Butir</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
            <Award className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
            <span className="text-[11px] text-slate-400">Standar KKM</span>
            <p className="text-sm font-bold text-emerald-400 mt-0.5">{tryout.passingScore} / 100</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
            <Sparkles className="w-4 h-4 text-amber-400 mx-auto mb-1" />
            <span className="text-[11px] text-slate-400">Tipe Opsi</span>
            <p className="text-sm font-bold text-white mt-0.5">Pilihan Ganda A–E</p>
          </div>
        </div>

        {/* Past Result Summary if Completed */}
        {isCompleted && tryout.latestScore !== null && (
          <div className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs text-indigo-300 font-semibold uppercase tracking-wider">
                Hasil Ujian Anda:
              </span>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-3xl font-black text-white">{tryout.latestScore}</span>
                <span className="text-xs text-slate-400">dari 100 poin</span>
                <Badge variant={tryout.isPassed ? "success" : "danger"} className="ml-2">
                  {tryout.isPassed ? "LULUS KKM" : "DI BAWAH KKM"}
                </Badge>
              </div>
            </div>
            <Link href="/dashboard/student">
              <Button variant="outline" size="sm" className="gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Lihat di Dashboard</span>
              </Button>
            </Link>
          </div>
        )}

        {/* Exam Rules & Instructions */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-indigo-400" />
            Petunjuk & Tata Tertib Pengerjaan
          </h3>

          <ul className="text-xs text-slate-400 space-y-2 leading-relaxed bg-slate-950/50 p-4 rounded-xl border border-slate-800">
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 font-bold">•</span>
              <span>
                <strong>Timer Server-Authoritative:</strong> Waktu ujian dihitung dari server. Jika
                Anda menutup browser atau merefresh halaman, waktu akan tetap berjalan.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 font-bold">•</span>
              <span>
                <strong>Autosave Otomatis:</strong> Setiap opsi yang Anda pilih langsung disimpan ke
                server secara otomatis dalam hitungan detik.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 font-bold">•</span>
              <span>
                <strong>Fitur Ragu-ragu:</strong> Anda dapat menandai nomor soal yang belum pasti
                dengan tombol ragu-ragu untuk ditinjau kembali sebelum submit.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 font-bold">•</span>
              <span>
                <strong>Auto-Submit Saat Waktu Habis:</strong> Ketika countdown menyentuh 00:00:00,
                lembar ujian otomatis disubmit dan dinilai secara instan.
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
                <span>Lanjutkan Sesi Ujian ({Math.floor(tryout.remainingSeconds / 60)} Menit Tersisa) →</span>
              </Button>
            </Link>
          ) : isCompleted ? (
            <div className="text-center py-2 text-xs text-slate-400">
              Anda sudah menyelesaikan paket tryout ini. Terima kasih telah berpartisipasi!
            </div>
          ) : (
            <StartTryoutButton tryoutId={tryout.id} questionCount={tryout.questionCount} />
          )}
        </div>
      </Card>
    </div>
  );
}
