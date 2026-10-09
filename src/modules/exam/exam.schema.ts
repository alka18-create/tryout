import { z } from "zod";

export const startExamSchema = z.object({
  tryoutId: z.string().min(1, "ID Tryout wajib diisi"),
});

export const saveAnswerSchema = z.object({
  questionId: z.string().min(1, "ID Soal wajib diisi"),
  selectedOptionId: z.string().nullable().optional(),
  selectedOptionIds: z.array(z.string()).optional(),
  isFlagged: z.boolean().default(false),
});

export const submitExamSchema = z.object({
  sessionId: z.string().min(1, "ID Sesi wajib diisi"),
});

export type StartExamInput = z.infer<typeof startExamSchema>;
export type SaveAnswerInput = z.infer<typeof saveAnswerSchema>;
export type SubmitExamInput = z.infer<typeof submitExamSchema>;
