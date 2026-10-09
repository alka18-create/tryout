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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Shield className="w-7 h-7 text-blue-600" />
            <span>Panel Administrator 🛡️</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pengawasan keseluruhan sistem TryoutKu, manajemen pengguna, sekolah, dan integritas data.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/dashboard/teacher/questions">
            <Button variant="outline" size="md" className="gap-2 text-xs border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 shadow-xs">
              <FileSpreadsheet className="w-4 h-4 text-amber-600" />
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
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
          Statistik Pengguna
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Siswa / Peserta</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{studentCount}</p>
            </div>
          </Card>

          <Card className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-xs">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Guru / Pembuat Soal</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{teacherCount}</p>
            </div>
          </Card>

          <Card className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-xs">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Administrator</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{adminCount}</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Statistik Master Data */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
          Master Data & Konten
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Sekolah Terdaftar</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{schoolCount}</p>
            </div>
          </Card>

          <Card className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shadow-xs">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Paket Tryout</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{tryoutCount}</p>
            </div>
          </Card>

          <Card className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 shadow-xs">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Soal di Bank Soal</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{questionCount}</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
