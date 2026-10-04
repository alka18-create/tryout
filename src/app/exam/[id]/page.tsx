import React from "react";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { ExamService } from "@/modules/exam/exam.service";
import { ExamRoom } from "@/components/exam/exam-room";

export const metadata = {
  title: "Lembar Pengerjaan Ujian - TryoutKu",
  description: "Lembar ujian daring fokus dan tersinkronisasi server.",
};

interface ExamPageProps {
  params: Promise<{ id: string }>;
}

export default async function ExamPage({ params }: ExamPageProps) {
  const session = await auth();
  if (!session || !session.user?.id) {
    redirect("/auth/login");
  }

  const { id: sessionId } = await params;

  let examData;
  try {
    examData = await ExamService.getSanitizedExamSession(session.user.id, sessionId);
  } catch {
    notFound();
  }

  return <ExamRoom initialData={examData} />;
}
