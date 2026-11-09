import { z } from "zod";
import {
  TryoutStatus,
  DiscussionVisibility,
  ScoringMode,
  SkdSection,
} from "@/generated/prisma/client";

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
    .max(1000, "Nilai ambang batas maksimal 1000")
    .default(75),
  // Mode penilaian: NORMALIZED (0-100) atau RAW (skor mentah, mis. SKD)
  scoringMode: z.nativeEnum(ScoringMode).default(ScoringMode.NORMALIZED),
  // Ambang batas per subtes (dipakai mode RAW)
  passingTwk: z.number().min(0).max(1000).nullable().optional(),
  passingTiu: z.number().min(0).max(1000).nullable().optional(),
  passingTkp: z.number().min(0).max(1000).nullable().optional(),
  maxAttempts: z.coerce
    .number()
    .int()
    .min(1, "Minimal 1 kali percobaan")
    .max(10, "Maksimal 10 kali percobaan")
    .optional(),
  questionCount: z
    .union([
      z.coerce.number().int().min(1, "Jumlah butir soal ditampilkan minimal 1"),
      z.literal(""),
    ])
    .nullish()
    .transform((val) => (val === "" || val === undefined || val === null ? null : Number(val))),
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
  section: z.nativeEnum(SkdSection).nullable().optional(),
});

export const setTryoutQuestionsSchema = z.object({
  questions: z
    .array(tryoutQuestionItemSchema)
    .min(1, "Paket tryout wajib memiliki minimal 1 butir soal"),
});

export type SetTryoutQuestionsInput = z.infer<typeof setTryoutQuestionsSchema>;
