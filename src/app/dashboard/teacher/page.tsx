import React from "react";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  FileQuestion,
  FileSpreadsheet,
  Users,
  PlusCircle,
  ArrowRight,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function TeacherDashboardPage() {
  const session = await auth();

  const [questionCount, tryoutCount, studentCount, myTryouts] = await Promise.all([
    prisma.question.count(),
    prisma.tryout.count(),
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.tryout.findMany({
      include: {
        subject: true,
        _count: {
          select: {
            tryoutQuestions: true,
            examSessions: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div className="space-y-8">
      {/* Header Guru */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Dashboard Guru 👨‍🏫
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Selamat datang, <strong className="text-slate-900">{session?.user?.name}</strong>. Kelola bank
            soal dan pantau evaluasi tryout siswa Anda.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/dashboard/teacher/questions">
            <Button variant="secondary" size="md" className="gap-2 shadow-xs">
              <FileQuestion className="w-4 h-4 text-blue-600" />
              <span>Bank Soal</span>
            </Button>
          </Link>
          <Link href="/dashboard/teacher/tryouts">
            <Button variant="primary" size="md" className="gap-2 shadow-xs">
              <PlusCircle className="w-4 h-4" />
              <span>Kelola Tryout</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistik Ringkas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 flex items-center gap-4 bg-white border-slate-200/90 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <FileQuestion className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Soal di Bank Soal</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{questionCount}</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4 bg-white border-slate-200/90 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Paket Tryout Dibuat</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{tryoutCount}</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4 bg-white border-slate-200/90 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Peserta Terdaftar</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{studentCount}</p>
          </div>
        </Card>
      </div>

      {/* Paket Tryout Aktif */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Paket Tryout Guru</h2>
            <p className="text-xs text-slate-500">Daftar paket tryout yang telah dipublikasikan</p>
          </div>
          <Link
            href="/dashboard/teacher/tryouts"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            Buka Manajemen Tryout <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-3">
          {myTryouts.map((t) => (
            <Card key={t.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border-slate-200/90 shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="info">{t.subject.name}</Badge>
                  <Badge variant={t.status === "PUBLISHED" ? "success" : "default"}>
                    {t.status}
                  </Badge>
                </div>
                <h3 className="text-base font-bold text-slate-900">{t.title}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {t.durationMinutes} Menit
                  </span>
                  <span>•</span>
                  <span>{t._count.tryoutQuestions} Soal Terpilih</span>
                  <span>•</span>
                  <span>{t._count.examSessions} Pengerjaan Peserta</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link href={`/dashboard/teacher/tryouts`}>
                  <Button size="sm" variant="outline">
                    Edit Soal
                  </Button>
                </Link>
                <Link href={`/dashboard/teacher/reports`}>
                  <Button size="sm" variant="secondary">
                    Laporan Nilai
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
