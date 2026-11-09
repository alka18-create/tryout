import { z } from "zod";
import { DifficultyLevel, QuestionType } from "@/generated/prisma/client";
import { parseMatrixQuestion } from "@/lib/matrix-question";

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

const optionItemSchema = z
  .object({
    label: z.string().min(1, "Label opsi tidak boleh kosong"),
    content: z.string().nullable().optional().default(""),
    imageUrl: z.string().nullable().optional().or(z.literal("")),
    isCorrect: z.boolean().default(false),
    // Skor opsi untuk soal WEIGHTED_CHOICE (TKP): 1-5
    score: z.number().int().min(1, "Skor opsi minimal 1").max(5, "Skor opsi maksimal 5").nullable().optional(),
  })
  .refine(
    (opt) =>
      Boolean((opt.content && opt.content.trim().length > 0) || (opt.imageUrl && opt.imageUrl.trim().length > 0)),
    {
      message: "Opsi jawaban harus memiliki teks atau lampiran gambar",
      path: ["content"],
    },
  );

export const questionSchema = z
  .object({
    topicId: z.string().min(1, "Topik materi wajib dipilih"),
    type: z.nativeEnum(QuestionType).default(QuestionType.SINGLE_CHOICE),
    difficulty: z.nativeEnum(DifficultyLevel).default(DifficultyLevel.MEDIUM),
    content: z.string().min(1, "Teks soal tidak boleh kosong"),
    imageUrl: z.string().nullable().optional().or(z.literal("")),
    explanation: z.string().nullable().optional().or(z.literal("")),
    explanationImageUrl: z.string().nullable().optional().or(z.literal("")),
    options: z.array(optionItemSchema).min(2, "Soal harus memiliki minimal 2 opsi jawaban"),
  })
  .superRefine((data, ctx) => {
    const correctOptions = data.options.filter((opt) => opt.isCorrect);

    if (data.type === QuestionType.SINGLE_CHOICE) {
      if (data.options.length < 2 || data.options.length > 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Pilihan ganda biasa harus memiliki 2 hingga 5 opsi jawaban",
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
    } else if (data.type === QuestionType.MATRIX) {
      const parsed = parseMatrixQuestion(
        data.options.map((opt, index) => ({
          id: String(index),
          label: opt.label,
          content: opt.content ?? "",
          imageUrl: opt.imageUrl,
          isCorrect: opt.isCorrect,
        })),
      );
      const totalRows = parsed.rows.length;
      const totalColumns = parsed.columnNames.length;

      if (totalRows < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Soal matriks wajib memiliki minimal 1 baris pernyataan",
          path: ["options"],
        });
      }
      if (totalColumns < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Soal matriks wajib memiliki minimal 2 kolom jawaban",
          path: ["options"],
        });
      }

      const uniqueLabels = new Set(data.options.map((opt) => opt.label.trim()));
      if (uniqueLabels.size !== data.options.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Label opsi matriks tidak boleh duplikat",
          path: ["options"],
        });
      }

      if (totalRows > 0 && totalColumns > 0 && data.options.length !== totalRows * totalColumns) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Setiap baris matriks harus memiliki opsi untuk seluruh kolom jawaban",
          path: ["options"],
        });
      }

      parsed.rows.forEach((row, rowIndex) => {
        const correctInRow = row.columns.filter((column) => column.isCorrect).length;
        if (correctInRow !== 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Baris ${rowIndex + 1} matriks wajib memiliki tepat 1 kolom kunci jawaban`,
            path: ["options"],
          });
        }
      });
    } else if (data.type === QuestionType.WEIGHTED_CHOICE) {
      // Opsi berbobot (TKP): tepat 5 opsi dengan skor unik 1-5.
      if (data.options.length !== 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Soal opsi berbobot (TKP) wajib memiliki tepat 5 opsi jawaban (A-E)",
          path: ["options"],
        });
      }

      const scores = data.options.map((opt) => opt.score);
      if (scores.some((s) => typeof s !== "number" || !Number.isInteger(s) || s < 1 || s > 5)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Setiap opsi wajib memiliki skor bilangan bulat 1 sampai 5",
          path: ["options"],
        });
      } else if (new Set(scores).size !== data.options.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Skor antar opsi tidak boleh sama (harus unik 1-5)",
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
