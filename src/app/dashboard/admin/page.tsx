import React from "react";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Users, GraduationCap, Building2, BookOpen, Shield, Settings, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function AdminDashboardPage() {
  const session = await auth();

  const [studentCount, teacherCount, adminCount, schoolCount, tryoutCount, questionCount] =
    await Promise.all([
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.user.count({ where: { role: "TEACHER" } }),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.school.count(),
      prisma.tryout.count(),
      prisma.question.count(),
    ]);

  return (
    <div className="space-y-8">
      {/* Header Admin */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Shield className="w-7 h-7 text-indigo-400" />
            <span>Panel Administrator 🛡️</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Pengawasan keseluruhan sistem TryoutKu, manajemen pengguna, sekolah, dan integritas data.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/dashboard/teacher/questions">
            <Button variant="outline" size="md" className="gap-2 text-xs border-amber-500/30 text-amber-300 hover:bg-amber-500/10">
              <FileSpreadsheet className="w-4 h-4 text-amber-400" />
              <span>Bank Soal & Import</span>
            </Button>
          </Link>
          <Link href="/dashboard/admin/users">
            <Button variant="secondary" size="md" className="gap-2 text-xs">
              <Users className="w-4 h-4" />
              <span>Kelola Pengguna</span>
            </Button>
          </Link>
          <Link href="/dashboard/admin/schools">
            <Button variant="primary" size="md" className="gap-2 text-xs">
              <Building2 className="w-4 h-4" />
              <span>Kelola Sekolah</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistik Pengguna */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Statistik Pengguna
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-5 flex items-center gap-4 bg-slate-900/60">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Siswa / Peserta</p>
              <p className="text-2xl font-black text-white mt-0.5">{studentCount}</p>
            </div>
          </Card>

          <Card className="p-5 flex items-center gap-4 bg-slate-900/60">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Guru / Pembuat Soal</p>
              <p className="text-2xl font-black text-white mt-0.5">{teacherCount}</p>
            </div>
          </Card>

          <Card className="p-5 flex items-center gap-4 bg-slate-900/60">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Administrator</p>
              <p className="text-2xl font-black text-white mt-0.5">{adminCount}</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Statistik Master Data */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Master Data & Konten
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-5 flex items-center gap-4 bg-slate-900/60">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Sekolah Terdaftar</p>
              <p className="text-2xl font-black text-white mt-0.5">{schoolCount}</p>
            </div>
          </Card>

          <Card className="p-5 flex items-center gap-4 bg-slate-900/60">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/25 flex items-center justify-center text-violet-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Paket Tryout</p>
              <p className="text-2xl font-black text-white mt-0.5">{tryoutCount}</p>
            </div>
          </Card>

          <Card className="p-5 flex items-center gap-4 bg-slate-900/60">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Soal di Bank Soal</p>
              <p className="text-2xl font-black text-white mt-0.5">{questionCount}</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
