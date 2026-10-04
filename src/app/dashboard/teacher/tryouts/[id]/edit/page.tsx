import React from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TryoutForm } from "@/components/teacher/tryout-form";

export const metadata = {
  title: "Edit Paket Tryout - TryoutKu",
  description: "Formulir edit pengaturan paket tryout untuk guru.",
};

interface EditTryoutPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTryoutPage({ params }: EditTryoutPageProps) {
  const { id } = await params;

  const tryout = await prisma.tryout.findUnique({
    where: { id },
    include: {
      subject: true,
    },
  });

  if (!tryout) {
    notFound();
  }

  const initialData = {
    id: tryout.id,
    title: tryout.title,
    description: tryout.description,
    subjectId: tryout.subjectId,
    durationMinutes: tryout.durationMinutes,
    passingScore: tryout.passingScore,
    status: tryout.status as "DRAFT" | "PUBLISHED" | "ARCHIVED",
    discussionVisibility: tryout.discussionVisibility as "ALWAYS" | "AFTER_SUBMIT" | "AFTER_TRYOUT_CLOSED" | "NEVER",
    startDate: tryout.startDate ? tryout.startDate.toISOString() : null,
    endDate: tryout.endDate ? tryout.endDate.toISOString() : null,
  };

  return <TryoutForm initialData={initialData} isEditing={true} />;
}
