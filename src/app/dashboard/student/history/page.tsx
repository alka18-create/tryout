import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ScoringService } from "@/modules/scoring/scoring.service";
import {
  History,
  Award,
  CheckCircle2,
  Clock,
  TrendingUp,
  FileText,
  Play,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = {
  title: "Riwayat & Hasil Tryout - TryoutKu",
  description: "Riwayat pengerjaan tryout dan statistik perkembangan nilai siswa.",
};

export default async function StudentHistoryPage() {
  const session = await auth();
  if (!session || !session.user?.id) {
    redirect("/auth/login");
  }

  const data = await ScoringService.getStudentExamHistory(session.user.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-indigo-400" />
            Riwayat & Analisis Nilai
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Pantau perkembangan nilai tryout Anda dari waktu ke waktu dan pelajari materi yang telah diujikan.
          </p>
        </div>

        <Link href="/dashboard/student/tryouts">
          <Button variant="primary" className="gap-2 shrink-0">
            <BookOpen className="w-4 h-4" />
            <span>Kerjakan Tryout Baru</span>
          </Button>
        </Link>
      </div>

      {/* Ringkasan Metrik 3 Kolom */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 flex items-center gap-4 bg-slate-900/60">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">Tryout Diselesaikan</span>
            <p className="text-2xl font-extrabold text-white mt-0.5">{data.totalCompleted} Paket</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4 bg-slate-900/60">
          <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">Rata-rata Skor Anda</span>
            <p className="text-2xl font-extrabold text-white mt-0.5">
              {data.totalCompleted > 0 ? `${data.averageScore} / 100` : "—"}
            </p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4 bg-slate-900/60">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">Tingkat Kelulusan KKM</span>
            <p className="text-2xl font-extrabold text-emerald-400 mt-0.5">
              {data.totalCompleted > 0 ? `${data.passingRate}%` : "—"}
            </p>
          </div>
        </Card>
      </div>

      {/* Visualisasi Tren Perkembangan Nilai */}
      {data.scoreTrend.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              Grafik Perkembangan Skor
            </CardTitle>
            <CardDescription>
              Pergerakan nilai Anda dari setiap sesi tryout yang diselesaikan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-44 flex items-end gap-3 sm:gap-6 pt-6 pb-2 px-2 border-b border-slate-800">
              {data.scoreTrend.map((st) => {
                const heightPercent = Math.max(10, Math.min(100, st.score));
                const isHigh = st.score >= 75;

                return (
                  <div
                    key={st.index}
                    className="flex-1 flex flex-col items-center gap-2 group h-full justify-end"
                  >
                    <span className="text-[11px] font-bold text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                      {st.score}
                    </span>
                    <div className="w-full max-w-[40px] bg-slate-800 rounded-t-xl overflow-hidden h-full flex items-end">
                      <div
                        className={`w-full rounded-t-xl transition-all duration-500 ${
                          isHigh ? "bg-indigo-500 group-hover:bg-indigo-400" : "bg-rose-500 group-hover:bg-rose-400"
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap mt-1">
                      {st.date}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daftar Tabel Riwayat */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Hasil Ujian</CardTitle>
          <CardDescription>
            Seluruh riwayat pengerjaan tryout lengkap dengan diagnostik dan pembahasan
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.history.length === 0 ? (
            <EmptyState
              icon={<History className="w-10 h-10 text-slate-500" />}
              title="Belum Ada Riwayat Tryout"
              description="Anda belum menyelesaikan sesi tryout apapun. Mulai kerjakan paket tryout sekarang untuk melihat analisis nilai."
              action={
                <Link href="/dashboard/student/tryouts">
                  <Button variant="primary">Jelajahi Paket Tryout</Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {data.history.map((item) => (
                <div
                  key={item.sessionId}
                  className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="info">{item.subjectName}</Badge>
                      <Badge variant={item.isPassed ? "success" : "danger"}>
                        {item.isPassed ? "LULUS KKM" : "DI BAWAH KKM"}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {new Date(item.submittedAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <h4 className="font-bold text-white text-base leading-snug line-clamp-1">
                      {item.tryoutTitle}
                    </h4>

                    {/* Ringkasan Skor & Detail Jawaban */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {item.correctCount} Benar
                      </span>
                      <span>•</span>
                      <span>{item.wrongCount} Salah</span>
                      <span>•</span>
                      <span>{item.unansweredCount} Kosong</span>
                      <span>•</span>
                      <span>{item.durationSpentMinutes} Menit</span>
                    </div>
                  </div>

                  {/* Skor & Tombol Aksi */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                    <div className="text-right">
                      <span className="text-[11px] text-slate-500 block">Skor Ujian</span>
                      <span className="text-2xl font-black text-white">{item.totalScore}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link href={`/dashboard/student/exam-sessions/${item.sessionId}/result`}>
                        <Button variant="secondary" size="sm" className="gap-1.5 text-xs">
                          <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Diagnostik</span>
                        </Button>
                      </Link>

                      <Link href={`/dashboard/student/exam-sessions/${item.sessionId}/discussion`}>
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                          <FileText className="w-3.5 h-3.5" />
                          <span>Pembahasan</span>
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
