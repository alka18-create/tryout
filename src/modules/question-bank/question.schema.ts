import { z } from "zod";
import { DifficultyLevel, QuestionType } from "@/generated/prisma/client";

export const subjectSchema = z.object({
  name: z.string().min(2, "Nama mata pelajaran minimal 2 karakter"),
  code: z.string().min(2, "Kode mata pelajaran minimal 2 karakter").max(10),
  description: z.string().optional().or(z.literal("")),
});

export type SubjectInput = z.infer<typeof subjectSchema>;

export const topicSchema = z.object({
  subjectId: z.string().min(1, "Mata pelajaran wajib dipilih"),
  name: z.string().min(2, "Nama topik minimal 2 karakter"),
  description: z.string().optional().or(z.literal("")),
});

export type TopicInput = z.infer<typeof topicSchema>;

const optionItemSchema = z.object({
  label: z.string().min(1, "Label opsi tidak boleh kosong"),
  content: z.string().min(1, "Konten opsi jawaban tidak boleh kosong"),
  imageUrl: z.string().optional().or(z.literal("")),
  isCorrect: z.boolean().default(false),
});

export const questionSchema = z
  .object({
    topicId: z.string().min(1, "Topik materi wajib dipilih"),
    type: z.nativeEnum(QuestionType).default(QuestionType.SINGLE_CHOICE),
    difficulty: z.nativeEnum(DifficultyLevel).default(DifficultyLevel.MEDIUM),
    content: z.string().min(5, "Teks soal minimal 5 karakter"),
    imageUrl: z.string().optional().or(z.literal("")),
    explanation: z.string().optional().or(z.literal("")),
    explanationImageUrl: z.string().optional().or(z.literal("")),
    options: z.array(optionItemSchema).min(2, "Soal harus memiliki minimal 2 opsi jawaban"),
  })
  .superRefine((data, ctx) => {
    const correctOptions = data.options.filter((opt) => opt.isCorrect);

    if (data.type === QuestionType.SINGLE_CHOICE) {
      if (data.options.length !== 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Pilihan ganda biasa wajib memiliki tepat 5 opsi (A, B, C, D, E)",
          path: ["options"],
        });
      }
      if (correctOptions.length !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Pilihan ganda biasa harus memiliki tepat 1 kunci jawaban benar",
          path: ["options"],
        });
      }
    } else if (data.type === QuestionType.MULTIPLE_CHOICE) {
      if (data.options.length < 2 || data.options.length > 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Pilihan ganda kompleks harus memiliki 2 hingga 5 opsi jawaban",
          path: ["options"],
        });
      }
      if (correctOptions.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Pilihan ganda kompleks wajib memiliki minimal 2 kunci jawaban benar",
          path: ["options"],
        });
      }
    } else if (data.type === QuestionType.TRUE_FALSE) {
      if (data.options.length !== 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Soal Benar/Salah wajib memiliki tepat 2 opsi (Benar dan Salah)",
          path: ["options"],
        });
      }
      if (correctOptions.length !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Tepat satu opsi harus ditandai sebagai kunci yang benar (Benar atau Salah)",
          path: ["options"],
        });
      }
    }
  });

export type QuestionInput = z.infer<typeof questionSchema>;

export const questionFilterSchema = z.object({
  search: z.string().optional(),
  subjectId: z.string().optional(),
  topicId: z.string().optional(),
  type: z.nativeEnum(QuestionType).optional(),
  difficulty: z.nativeEnum(DifficultyLevel).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(20),
});

export type QuestionFilter = z.infer<typeof questionFilterSchema>;
