import React from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TryoutQuestionManager } from "@/components/teacher/tryout-question-manager";

export const metadata = {
  title: "Kelola Susunan Soal Tryout - TryoutKu",
  description: "Pengaturan susunan butir soal, urutan nomor, dan bobot penilaian paket tryout.",
};

interface TryoutQuestionsPageProps {
  params: Promise<{ id: string }>;
}

export default async function TryoutQuestionsPage({ params }: TryoutQuestionsPageProps) {
  const { id } = await params;

  const tryout = await prisma.tryout.findUnique({
    where: { id },
    include: {
      subject: true,
      tryoutQuestions: {
        orderBy: { orderNumber: "asc" },
        include: {
          question: {
            include: {
              topic: true,
              options: {
                orderBy: { label: "asc" },
              },
            },
          },
        },
      },
      _count: {
        select: {
          examSessions: true,
        },
      },
    },
  });

  if (!tryout) {
    notFound();
  }

  const initialTryout = {
    id: tryout.id,
    title: tryout.title,
    durationMinutes: tryout.durationMinutes,
    passingScore: tryout.passingScore,
    status: tryout.status as "DRAFT" | "PUBLISHED" | "ARCHIVED",
    subjectId: tryout.subjectId,
    subject: {
      id: tryout.subject.id,
      name: tryout.subject.name,
    },
    isLocked: tryout._count.examSessions > 0,
    tryoutQuestions: tryout.tryoutQuestions.map((tq) => ({
      questionId: tq.questionId,
      orderNumber: tq.orderNumber,
      weight: tq.weight,
      question: {
        id: tq.question.id,
        content: tq.question.content,
        imageUrl: tq.question.imageUrl,
        difficulty: tq.question.difficulty as "EASY" | "MEDIUM" | "HARD",
        topicId: tq.question.topicId,
        topic: {
          id: tq.question.topic.id,
          name: tq.question.topic.name,
        },
        explanation: tq.question.explanation,
        options: tq.question.options.map((opt) => ({
          id: opt.id,
          label: opt.label,
          content: opt.content,
          isCorrect: opt.isCorrect,
          imageUrl: opt.imageUrl,
        })),
      },
    })),
  };

  return <TryoutQuestionManager initialTryout={initialTryout} />;
}
