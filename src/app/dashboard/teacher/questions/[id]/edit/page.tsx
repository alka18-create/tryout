import React from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { QuestionForm } from "@/components/teacher/question-form";

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const question = await prisma.question.findUnique({
    where: { id },
    include: {
      options: {
        orderBy: { label: "asc" },
      },
    },
  });

  if (!question || !question.isActive) {
    notFound();
  }

  const initialData = {
    id: question.id,
    topicId: question.topicId,
    difficulty: question.difficulty,
    content: question.content,
    imageUrl: question.imageUrl,
    explanation: question.explanation,
    explanationImageUrl: question.explanationImageUrl,
    options: question.options.map((opt) => ({
      label: opt.label as "A" | "B" | "C" | "D" | "E",
      content: opt.content,
      imageUrl: opt.imageUrl,
      isCorrect: opt.isCorrect,
    })),
  };

  return <QuestionForm initialData={initialData} isEditing={true} />;
}
