import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AnalyticsService } from "@/modules/analytics/analytics.service";
import { UserRole } from "@/generated/prisma/client";
import {
  BarChart3,
  BookOpen,
  Users,
  Award,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = {
  title: "Laporan & Analisis Tryout - Guru TryoutKu",
  description: "Daftar laporan hasil ujian dan diagnostik peserta didik.",
};

export default async function TeacherReportsPage() {
  const session = await auth();
  if (!session || !session.user?.id) {
    redirect("/auth/login");
  }

  const tryouts = await AnalyticsService.listTeacherTryoutsWithMetrics(
    session.user.id,
    session.user.role as UserRole
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-400" />
            Laporan & Analisis Tryout
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Pantau hasil pengerjaan peserta, analisis butir soal, dan pemetaan materi yang memerlukan penguatan.
          </p>
        </div>
      </div>

      {/* Grid Tryout Cards */}
      {tryouts.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-10 h-10 text-slate-500" />}
          title="Belum Ada Paket Tryout"
          description="Anda belum memiliki paket tryout untuk dianalisis. Buat paket tryout dan publikasikan ke peserta terlebih dahulu."
          action={
            <Link href="/dashboard/teacher/tryouts/new">
              <Button variant="primary">Buat Tryout Baru</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tryouts.map((tryout) => (
            <Card
              key={tryout.id}
              className="flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="info">{tryout.subjectName}</Badge>
                  <Badge variant={tryout.status === "PUBLISHED" ? "success" : "default"}>
                    {tryout.status}
                  </Badge>
                </div>

                <div>
                  <h3 className="font-bold text-lg text-white line-clamp-2">{tryout.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {tryout.questionCount} Butir Soal • Durasi {tryout.durationMinutes} Menit • KKM {tryout.passingScore}
                  </p>
                </div>

                {/* 3 Metrik Kunci */}
                <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-800/80 text-center">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Peserta</span>
                    <span className="text-xs font-bold text-white mt-0.5 block">
                      {tryout.completedCount} Sesi
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 block">Rata-rata</span>
                    <span className="text-xs font-bold text-indigo-400 mt-0.5 block">
                      {tryout.completedCount > 0 ? tryout.averageScore : "—"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 block">Kelulusan</span>
                    <span className="text-xs font-bold text-emerald-400 mt-0.5 block">
                      {tryout.completedCount > 0 ? `${tryout.passingRate}%` : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="p-4 bg-slate-950/40 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500">
                  {tryout.completedCount === 0 ? "Belum ada pengerjaan" : "Data pengerjaan aktif"}
                </span>

                <Link href={`/dashboard/teacher/tryouts/${tryout.id}/reports`}>
                  <Button variant="secondary" size="sm" className="gap-1.5 text-xs">
                    <span>Lihat Laporan Lengkap</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
