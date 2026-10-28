import React from "react";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BookOpen, Clock, Award, ArrowRight, Play, CheckCircle2, Lock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isDemoStudentEmail, getDemoAllowedTryoutId } from "@/lib/demo";

export default async function StudentDashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const isDemo = isDemoStudentEmail(session?.user?.email);

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
          (recentSessions.reduce((acc, s) => acc + (s.totalScore ?? 0), 0) / completedCount) * 10,
        ) / 10
      : 0;

  const demoAllowedTryoutId = isDemo ? getDemoAllowedTryoutId(availableTryouts) : null;

  return (
    <div className="space-y-8">
      {/* Sapaan Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Halo, {session?.user?.name || "Peserta"} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1">
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

      {/* Banner Khusus Akun Demo */}
      {isDemo && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <span className="text-xl">🔒</span>
            <div>
              <h4 className="text-sm font-bold text-amber-950">Mode Uji Coba Akun Demo</h4>
              <p className="text-xs text-amber-800 mt-0.5">
                Akun demo siswa dibatasi hanya untuk 1 paket tryout uji coba. Untuk membuka seluruh paket tryout lainnya dan menyimpan rekor belajar Anda, silakan mendaftar secara gratis.
              </p>
            </div>
          </div>
          <Link href="/auth/register" className="shrink-0 w-full sm:w-auto">
            <Button size="sm" variant="primary" className="w-full text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs">
              Daftar Akun Sekarang
            </Button>
          </Link>
        </div>
      )}

      {/* Ringkasan Skor & Aktivitas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 flex items-center gap-4 bg-white border-slate-200/90 shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Tryout Diselesaikan</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{completedCount}</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4 bg-white border-slate-200/90 shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Rata-rata Skor Anda</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">
              {completedCount > 0 ? averageScore : "—"}
            </p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4 bg-white border-slate-200/90 shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Status Akun</p>
            <p className="text-base font-bold text-emerald-700 mt-1">Aktif & Siap</p>
          </div>
        </Card>
      </div>

      {/* Tryout Tersedia */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Tryout Tersedia</h2>
            <p className="text-xs text-slate-500">Pilih paket tryout yang ingin Anda kerjakan</p>
          </div>
          <Link
            href="/dashboard/student/tryouts"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
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
            const isLockedForDemo =
              isDemo && demoAllowedTryoutId !== null && tryout.id !== demoAllowedTryoutId;

            return (
              <Card
                key={tryout.id}
                className={`hover:border-blue-400 hover:shadow-sm transition-all flex flex-col justify-between ${
                  isLockedForDemo ? "border-amber-200/80 bg-slate-50/30" : ""
                }`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Badge variant="info">{tryout.subject.name}</Badge>
                    {isLockedForDemo ? (
                      <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 gap-1 flex items-center text-[10px] font-semibold">
                        <Lock className="w-2.5 h-2.5" />
                        <span>Terkunci</span>
                      </Badge>
                    ) : isCompleted ? (
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

                <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {tryout.durationMinutes} Menit
                    </span>
                    <span>•</span>
                    <span>{tryout._count.tryoutQuestions} Soal</span>
                  </div>

                  <Link href={`/dashboard/student/tryouts/${tryout.id}`}>
                    <Button
                      size="sm"
                      variant={isLockedForDemo ? "outline" : isInProgress ? "warning" : "primary"}
                      className={`gap-1.5 text-xs ${
                        isLockedForDemo ? "text-amber-800 border-amber-300 hover:bg-amber-50 font-bold" : ""
                      }`}
                    >
                      {isLockedForDemo ? (
                        <>
                          <Lock className="w-3 h-3 text-amber-600" />
                          <span>Terkunci</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3" />
                          <span>{isInProgress ? "Lanjutkan" : isCompleted ? "Lihat Hasil" : "Mulai"}</span>
                        </>
                      )}
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
