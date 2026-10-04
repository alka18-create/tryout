import { z } from "zod";
import { DifficultyLevel } from "@/generated/prisma/client";

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
  label: z.enum(["A", "B", "C", "D", "E"]),
  content: z.string().min(1, "Konten opsi jawaban tidak boleh kosong"),
  imageUrl: z.string().optional().or(z.literal("")),
  isCorrect: z.boolean().default(false),
});

export const questionSchema = z
  .object({
    topicId: z.string().min(1, "Topik materi wajib dipilih"),
    difficulty: z.nativeEnum(DifficultyLevel).default(DifficultyLevel.MEDIUM),
    content: z.string().min(5, "Teks soal minimal 5 karakter"),
    imageUrl: z.string().optional().or(z.literal("")),
    explanation: z.string().optional().or(z.literal("")),
    explanationImageUrl: z.string().optional().or(z.literal("")),
    options: z
      .array(optionItemSchema)
      .length(5, "Soal pilihan ganda wajib memiliki tepat 5 opsi (A, B, C, D, E)"),
  })
  .refine(
    (data) => {
      const correctOptions = data.options.filter((opt) => opt.isCorrect);
      return correctOptions.length === 1;
    },
    {
      message: "Tepat satu opsi harus ditandai sebagai kunci jawaban benar",
      path: ["options"],
    },
  );

export type QuestionInput = z.infer<typeof questionSchema>;

export const questionFilterSchema = z.object({
  search: z.string().optional(),
  subjectId: z.string().optional(),
  topicId: z.string().optional(),
  difficulty: z.nativeEnum(DifficultyLevel).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type QuestionFilter = z.infer<typeof questionFilterSchema>;
