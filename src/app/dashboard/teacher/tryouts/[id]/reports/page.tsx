import React from "react";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { AnalyticsService } from "@/modules/analytics/analytics.service";
import { UserRole } from "@/generated/prisma/client";
import { TryoutReportView } from "@/components/teacher/tryout-report-view";

export const metadata = {
  title: "Laporan Hasil Ujian & Analisis - Guru TryoutKu",
  description: "Laporan nilai peserta, analisis butir soal, dan pemetaan materi terlemah tryout.",
};

interface ReportPageProps {
  params: Promise<{ id: string }>;
}

export default async function TryoutReportPage({ params }: ReportPageProps) {
  const session = await auth();
  if (!session || !session.user?.id) {
    redirect("/auth/login");
  }

  if (session.user.role !== UserRole.TEACHER && session.user.role !== UserRole.ADMIN) {
    redirect("/dashboard/student");
  }

  const { id: tryoutId } = await params;

  let reportData;
  try {
    reportData = await AnalyticsService.getTryoutReport(
      tryoutId,
      session.user.id,
      session.user.role as UserRole
    );
  } catch (err: any) {
    notFound();
  }

  return <TryoutReportView data={reportData} />;
}
