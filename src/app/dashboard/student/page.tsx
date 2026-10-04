import React from "react";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BookOpen, Clock, Award, ArrowRight, Play, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function StudentDashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;

  // 1. Ambil tryout yang berstatus PUBLISHED
  const availableTryouts = await prisma.tryout.findMany({
    where: { status: "PUBLISHED" },
    include: {
      subject: true,
      _count: { select: { tryoutQuestions: true } },
      examSessions: {
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    take: 6,
  });

  // 2. Ambil riwayat ujian user
  const recentSessions = await prisma.examSession.findMany({
    where: {
      userId,
      status: { in: ["SUBMITTED", "EXPIRED"] },
    },
    include: {
      tryout: {
        include: { subject: true },
      },
    },
    orderBy: { submittedAt: "desc" },
    take: 5,
  });

  const completedCount = recentSessions.length;
  const averageScore =
    completedCount > 0
      ? Math.round(
          (recentSessions.reduce((acc, s) => acc + s.totalScore, 0) / completedCount) * 10,
        ) / 10
      : 0;

  return (
    <div className="space-y-8">
      {/* Sapaan Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Halo, {session?.user?.name || "Peserta"} 👋
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Siap melanjutkan latihan tryout dan mengevaluasi penguasaan materi hari ini?
          </p>
        </div>
        <Link href="/dashboard/student/tryouts">
          <Button variant="primary" className="gap-2 shrink-0">
            <BookOpen className="w-4 h-4" />
            <span>Jelajahi Tryout</span>
          </Button>
        </Link>
      </div>

      {/* Ringkasan Skor & Aktivitas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 flex items-center gap-4 bg-slate-900/60">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Tryout Diselesaikan</p>
            <p className="text-2xl font-black text-white mt-0.5">{completedCount}</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4 bg-slate-900/60">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/25 flex items-center justify-center text-violet-400">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Rata-rata Skor Anda</p>
            <p className="text-2xl font-black text-white mt-0.5">
              {completedCount > 0 ? averageScore : "—"}
            </p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4 bg-slate-900/60">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Status Akun</p>
            <p className="text-base font-bold text-emerald-400 mt-1">Aktif & Siap</p>
          </div>
        </Card>
      </div>

      {/* Tryout Tersedia */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Tryout Tersedia</h2>
            <p className="text-xs text-slate-400">Pilih paket tryout yang ingin Anda kerjakan</p>
          </div>
          <Link
            href="/dashboard/student/tryouts"
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            Lihat Semua <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableTryouts.map((tryout) => {
            const lastSession = tryout.examSessions[0];
            const isCompleted =
              lastSession && (lastSession.status === "SUBMITTED" || lastSession.status === "EXPIRED");
            const isInProgress = lastSession && lastSession.status === "IN_PROGRESS";

            return (
              <Card key={tryout.id} className="hover:border-slate-700 transition-all flex flex-col justify-between">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Badge variant="info">{tryout.subject.name}</Badge>
                    {isCompleted ? (
                      <Badge variant="success">Sudah Dikerjakan (Skor: {lastSession.totalScore})</Badge>
                    ) : isInProgress ? (
                      <Badge variant="warning">Sedang Berlangsung</Badge>
                    ) : (
                      <Badge variant="outline">Belum Dikerjakan</Badge>
                    )}
                  </div>
                  <CardTitle>{tryout.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{tryout.description}</CardDescription>
                </CardHeader>

                <div className="px-6 py-4 bg-slate-950/40 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {tryout.durationMinutes} Menit
                    </span>
                    <span>•</span>
                    <span>{tryout._count.tryoutQuestions} Soal</span>
                  </div>

                  <Link href={`/dashboard/student/tryouts/${tryout.id}`}>
                    <Button size="sm" variant={isInProgress ? "warning" : "primary"} className="gap-1.5">
                      <Play className="w-3 h-3" />
                      <span>{isInProgress ? "Lanjutkan" : isCompleted ? "Lihat Hasil" : "Mulai"}</span>
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
