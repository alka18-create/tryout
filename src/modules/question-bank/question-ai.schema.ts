import { z } from "zod";
import { DifficultyLevel, QuestionType } from "@/generated/prisma/client";

export const AssessmentProgramTypeEnum = z.enum([
  "GENERAL",
  "DIAGNOSTIC",
  "DAILY",
  "MID_TERM",
  "FINAL",
  "AKM",
]);

export type AssessmentProgramType = z.infer<typeof AssessmentProgramTypeEnum>;

export const GenerateQuestionsInputSchema = z.object({
  subjectId: z.string().min(1, "Mata pelajaran wajib dipilih"),
  topicId: z.string().min(1, "Topik wajib dipilih"),
  materialText: z.string().optional(),
  uploadedFile: z
    .object({
      mimeType: z.string(),
      data: z.string(), // Base64 encoded
      fileName: z.string().optional(),
    })
    .optional(),
  programType: AssessmentProgramTypeEnum.default("DAILY"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD", "MIXED"]).default("MEDIUM"),
  questionCount: z.coerce.number().min(1).max(20).default(5),
  optionsCount: z.coerce.number().min(4).max(5).default(5), // 4 atau 5 opsi (A-D atau A-E)
  customInstructions: z.string().optional(),
  model: z.string().optional(), // Contoh: "gemini-2.0-flash", "gemini-1.5-flash"
  apiKey: z.string().optional(), // Opsional jika user membawa API key sendiri
});

export type GenerateQuestionsInput = z.infer<typeof GenerateQuestionsInputSchema>;

export const GeneratedOptionSchema = z.object({
  label: z.string(), // "A", "B", "C", "D", "E"
  content: z.string(),
  isCorrect: z.boolean(),
});

export const GeneratedQuestionItemSchema = z.object({
  number: z.number(),
  content: z.string().min(1, "Teks soal tidak boleh kosong"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  type: z.nativeEnum(QuestionType).default(QuestionType.SINGLE_CHOICE),
  options: z.array(GeneratedOptionSchema).min(2),
  explanation: z.string().optional(),
  bloomLevel: z.string().optional(),
});

export type GeneratedQuestionItem = z.infer<typeof GeneratedQuestionItemSchema>;

export const SaveGeneratedQuestionsInputSchema = z.object({
  topicId: z.string().min(1, "Topik wajib dipilih"),
  questions: z.array(
    z.object({
      content: z.string().min(1),
      difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
      type: z.nativeEnum(QuestionType).default(QuestionType.SINGLE_CHOICE),
      explanation: z.string().optional().nullable(),
      options: z
        .array(
          z.object({
            label: z.string(),
            content: z.string(),
            isCorrect: z.boolean(),
          })
        )
        .min(2),
    })
  ).min(1, "Pilih minimal 1 soal untuk disimpan"),
});

export type SaveGeneratedQuestionsInput = z.infer<typeof SaveGeneratedQuestionsInputSchema>;
