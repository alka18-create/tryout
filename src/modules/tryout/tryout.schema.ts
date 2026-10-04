import { z } from "zod";
import { TryoutStatus, DiscussionVisibility } from "@/generated/prisma/client";

export const createTryoutSchema = z.object({
  title: z.string().min(3, "Judul tryout minimal 3 karakter"),
  description: z.string().optional().or(z.literal("")),
  subjectId: z.string().min(1, "Mata pelajaran wajib dipilih"),
  durationMinutes: z.coerce
    .number()
    .min(5, "Durasi minimal 5 menit")
    .max(300, "Durasi maksimal 300 menit"),
  passingScore: z.coerce
    .number()
    .min(0, "Nilai KKM minimal 0")
    .max(100, "Nilai KKM maksimal 100")
    .default(75),
  status: z.nativeEnum(TryoutStatus).default(TryoutStatus.DRAFT),
  discussionVisibility: z
    .nativeEnum(DiscussionVisibility)
    .default(DiscussionVisibility.AFTER_SUBMIT),
  startDate: z.string().optional().or(z.literal("")),
  endDate: z.string().optional().or(z.literal("")),
});

export type CreateTryoutInput = z.infer<typeof createTryoutSchema>;

export const tryoutQuestionItemSchema = z.object({
  questionId: z.string().min(1),
  orderNumber: z.number().min(1),
  weight: z.number().min(0.1).default(1.0),
});

export const setTryoutQuestionsSchema = z.object({
  questions: z
    .array(tryoutQuestionItemSchema)
    .min(1, "Paket tryout wajib memiliki minimal 1 butir soal"),
});

export type SetTryoutQuestionsInput = z.infer<typeof setTryoutQuestionsSchema>;
