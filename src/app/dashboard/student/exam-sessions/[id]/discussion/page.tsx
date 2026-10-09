import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { ScoringService } from "@/modules/scoring/scoring.service";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileText,
  Bookmark,
  Award,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DiscussionViewer } from "@/components/student/discussion-viewer";

export const metadata = {
  title: "Pembahasan Soal Tryout - TryoutKu",
  description: "Kunci jawaban dan pembahasan komprehensif paket tryout.",
};

interface DiscussionPageProps {
  params: Promise<{ id: string }>;
}

export default async function ExamDiscussionPage({ params }: DiscussionPageProps) {
  const session = await auth();
  if (!session || !session.user?.id) {
    redirect("/auth/login");
  }

  const { id: sessionId } = await params;

  let discussion;
  try {
    discussion = await ScoringService.getExamSessionDiscussion(session.user.id, sessionId);
  } catch (err: any) {
    notFound();
  }

  return (
    <div className="max-w-4xl space-y-6 mx-auto">
      {/* Back Link */}
      <Link
        href={`/dashboard/student/exam-sessions/${sessionId}/result`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Kembali ke Ringkasan Nilai</span>
      </Link>

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="info">{discussion.subjectName}</Badge>
            <Badge variant={discussion.isPassed ? "success" : "danger"}>
              Skor: {discussion.totalScore}
            </Badge>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Pembahasan: {discussion.tryoutTitle}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pelajari konsep dan alasan jawaban yang benar pada {discussion.totalQuestions} butir soal berikut.
          </p>
        </div>
      </div>

      {/* Client Interactive Viewer with Filtering & Number Jump */}
      <DiscussionViewer initialQuestions={discussion.questions} />
    </div>
  );
}
