import { GoogleGenAI, Type } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { DifficultyLevel, QuestionType } from "@/generated/prisma/client";
import type {
  GenerateQuestionsInput,
  GeneratedQuestionItem,
  SaveGeneratedQuestionsInput,
} from "./question-ai.schema";

const PROGRAM_LABELS: Record<string, string> = {
  GENERAL: "Latihan Umum / Bank Soal",
  DIAGNOSTIC: "Asesmen Diagnostik Awal",
  DAILY: "Ulangan Harian (UH) / Kuis",
  MID_TERM: "Asesmen Tengah Semester (ATS / UTS)",
  FINAL: "Asesmen Akhir Semester (AAS / UAS)",
  AKM: "AKM (Asesmen Kompetensi Minimum) Literasi & Numerasi",
};

export class QuestionAiService {
  /**
   * Menghasilkan butir-butir soal menggunakan Google Gemini AI
   */
  static async generateQuestions(
    teacherId: string,
    input: GenerateQuestionsInput
  ): Promise<{
    subjectName: string;
    topicName: string;
    questions: GeneratedQuestionItem[];
  }> {
    // 1. Ambil info Mata Pelajaran & Topik dari database
    const topic = await prisma.topic.findUnique({
      where: { id: input.topicId },
      include: { subject: true },
    });

    if (!topic) {
      throw new AppError("NOT_FOUND", "Topik materi yang dipilih tidak ditemukan.");
    }

    // 2. Tentukan API Key Gemini
    const apiKey = input.apiKey?.trim() || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new AppError(
        "VALIDATION_ERROR",
        "API Key Google Gemini belum diatur. Silakan masukkan API Key Gemini Anda atau hubungi Administrator untuk mengatur GEMINI_API_KEY di server."
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // 3. Susun instruksi prompt
    const programName = PROGRAM_LABELS[input.programType] || "Latihan Soal";
    const optCount = input.optionsCount || 5;
    const optLabels = optCount === 4 ? ["A", "B", "C", "D"] : ["A", "B", "C", "D", "E"];

    const systemInstruction = `
Anda adalah asisten ahli pembuat soal kurikulum dan asesmen pendidikan Indonesia berstandar nasional (Kurikulum Merdeka / K13).
Tugas Anda adalah membuat soal pilihan ganda berkualitas tinggi berdasarkan materi dan topik yang diberikan.

PANDUAN MUTU SOAL:
1. Soal harus relevan dengan Mata Pelajaran: "${topic.subject.name}" dan Topik/Materi: "${topic.name}".
2. Bahasa Indonesia baku, jelas, tidak ambigu, dan mendidik.
3. Setiap soal WAJIB memiliki tepat ${optCount} pilihan jawaban dengan label (${optLabels.join(", ")}).
4. Tepat 1 (satu) pilihan jawaban bernilai BENAR (isCorrect: true), dan pilihan lainnya SALAH (isCorrect: false).
5. Pengecoh (distraktor) harus masuk akal, homogen, dan tidak memberikan petunjuk langsung ke jawaban benar.
6. Hindari opsi klise seperti "Semua jawaban benar" atau "Tidak ada yang benar".
7. Sertakan kunci jawaban dan PEMBAHASAN LENGKAP yang mendalam serta mendidik.
8. Output HARUS berupa JSON terstruktur sesuai skema yang ditentukan tanpa teks pengantar markdown di luar JSON.
`;

    const userPrompt = `
SPESIFIKASI SOAL YANG DIMINTA:
- Mata Pelajaran: ${topic.subject.name}
- Topik / Bab: ${topic.name}
- Jenis Asesmen: ${programName}
- Target Tingkat Kesulitan: ${input.difficulty === "MIXED" ? "Kombinasi (Mudah, Sedang, Sulit secara proporsional)" : input.difficulty}
- Jumlah Soal: ${input.questionCount} butir
- Jumlah Pilihan Jawaban per Soal: ${optCount} opsi (${optLabels.join(", ")})
${input.customInstructions ? `- Instruksi Tambahan Guru: "${input.customInstructions}"` : ""}

INSTRUKSI:
Buatkan tepat ${input.questionCount} butir soal pilihan ganda bermutu tinggi berdasarkan materi di bawah ini (atau berdasarkan pengetahuan mendalam tentang topik "${topic.name}" jika materi tidak dilampirkan).
Pastikan setiap soal memiliki teks soal jelas, ${optCount} pilihan jawaban (${optLabels.join(", ")}), penanda jawaban benar, serta penjelasan/pembahasan konsep yang benar.
`;

    // 4. Bangun content parts untuk Gemini (mendukung file PDF inline)
    const contentParts: any[] = [];

    // Jika ada file lampiran dokumen (PDF/TXT)
    if (input.uploadedFile?.data && input.uploadedFile?.mimeType) {
      let extractedPdfText = "";
      if (input.uploadedFile.mimeType.includes("pdf")) {
        try {
          const buffer = Buffer.from(input.uploadedFile.data, "base64");
          const { extractText } = await import("unpdf");
          const res = await extractText(new Uint8Array(buffer));
          extractedPdfText = Array.isArray(res.text) ? res.text.join("\n\n").trim() : String(res.text || "").trim();
        } catch (pdfErr) {
          console.warn("[QuestionAiService] Gagal ekstraksi teks PDF lokal, akan menggunakan inlineData:", pdfErr);
        }
      }

      if (extractedPdfText && extractedPdfText.length > 50) {
        contentParts.push({
          text: `MATERI PEMBELAJARAN DARI DOKUMEN (${input.uploadedFile.fileName || "PDF"}):\n"""\n${extractedPdfText.substring(0, 35000)}\n"""`,
        });
      } else {
        contentParts.push({
          inlineData: {
            mimeType: input.uploadedFile.mimeType,
            data: input.uploadedFile.data,
          },
        });
      }
    }

    // Jika ada teks materi bacaan yang ditempelkan
    if (input.materialText && input.materialText.trim().length > 0) {
      contentParts.push({
        text: `MATERI PEMBELAJARAN ACUAN:\n"""\n${input.materialText.trim().substring(0, 30000)}\n"""`,
      });
    }

    contentParts.push({
      text: userPrompt,
    });

    // 5. Schema JSON Response untuk Google Gen AI SDK
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        questions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              number: { type: Type.INTEGER },
              content: { type: Type.STRING, description: "Teks butir pertanyaan" },
              difficulty: {
                type: Type.STRING,
                enum: ["EASY", "MEDIUM", "HARD"],
                description: "Tingkat kesulitan soal",
              },
              bloomLevel: {
                type: Type.STRING,
                description: "Tingkat kognitif Bloom, misal: C1, C2, C3, C4 Analisis",
              },
              options: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING, description: "Huruf opsi: A, B, C, D, atau E" },
                    content: { type: Type.STRING, description: "Teks pilihan jawaban" },
                    isCorrect: { type: Type.BOOLEAN, description: "True jika ini kunci jawaban yang benar" },
                  },
                  required: ["label", "content", "isCorrect"],
                },
              },
              explanation: {
                type: Type.STRING,
                description: "Pembahasan lengkap dan langkah penyelesaian/konsep soal",
              },
            },
            required: ["number", "content", "difficulty", "options", "explanation"],
          },
        },
      },
      required: ["questions"],
    };

    try {
      // Model yang aktif dan stabil (hindari gemini-2.5-flash karena restricted oleh Google)
      const rawCandidateModels = [
        input.model,
        process.env.GEMINI_MODEL,
        "gemini-2.0-flash",
        "gemini-1.5-flash",
      ].filter(Boolean) as string[];

      const candidateModels = Array.from(
        new Set(rawCandidateModels.filter((m) => m !== "gemini-2.5-flash"))
      );

      let response: any = null;
      let lastError: any = null;

      for (const modelName of candidateModels) {
        try {
          console.log(`[QuestionAiService] Memanggil Gemini API dengan model: ${modelName}...`);
          response = await ai.models.generateContent({
            model: modelName,
            contents: { parts: contentParts },
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              responseSchema: responseSchema as any,
              temperature: 0.7,
            },
          });
          if (response?.text) {
            console.log(`[QuestionAiService] Berhasil mendapatkan respon dari model: ${modelName}`);
            break;
          }
        } catch (err: any) {
          lastError = err;
          const errMsg = String(err?.message || err || "");
          console.warn(`[QuestionAiService] Model ${modelName} gagal:`, errMsg);

          // Jika masalah adalah API key invalid atau kuota habis, tidak ada gunanya mencoba model lain
          if (
            errMsg.includes("API_KEY_INVALID") ||
            errMsg.includes("API key not valid") ||
            errMsg.includes("INVALID_ARGUMENT") ||
            errMsg.includes("RESOURCE_EXHAUSTED") ||
            errMsg.includes("quota") ||
            err?.status === 400 ||
            err?.status === 401 ||
            err?.status === 429
          ) {
            console.warn("[QuestionAiService] Masalah autentikasi atau kuota API terdeteksi, menghentikan percobaan model lain.");
            break;
          }
        }
      }

      const responseText = response?.text;
      if (!responseText) {
        const errMsg = String(lastError?.message || lastError || "");
        if (
          errMsg.includes("API_KEY_INVALID") ||
          errMsg.includes("API key not valid") ||
          errMsg.includes("INVALID_ARGUMENT") ||
          lastError?.status === 400
        ) {
          throw new AppError(
            "VALIDATION_ERROR",
            "Google Gemini API Key tidak valid. Silakan periksa kembali API Key Anda dari Google AI Studio."
          );
        }
        if (
          errMsg.includes("RESOURCE_EXHAUSTED") ||
          errMsg.includes("quota") ||
          lastError?.status === 429
        ) {
          throw new AppError(
            "VALIDATION_ERROR",
            "Kuota gratis Google Gemini API Anda telah habis atau terkena Rate Limit. Silakan tunggu beberapa saat atau gunakan API Key akun Google lainnya."
          );
        }
        if (lastError?.status === 403 || errMsg.includes("PERMISSION_DENIED")) {
          throw new AppError(
            "FORBIDDEN",
            "Akses Google Gemini API ditolak. Pastikan API Key Anda memiliki izin untuk menggunakan model Gemini."
          );
        }
        throw new AppError(
          "INTERNAL_ERROR",
          `Gagal membuat soal dengan Gemini AI: ${errMsg.substring(0, 250) || "Respon AI kosong"}`
        );
      }

      const parsed = JSON.parse(responseText);
      const rawQuestions: any[] = parsed.questions || [];

      if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
        throw new Error("Format hasil generasi soal dari AI kosong.");
      }

      // Normalisasi dan validasi data soal
      const questions: GeneratedQuestionItem[] = rawQuestions.map((q, idx) => {
        // Pastikan opsi memiliki label dan ada 1 yang benar
        let rawOptions: any[] = Array.isArray(q.options) ? q.options : [];
        if (rawOptions.length < 2) {
          throw new Error(`Soal nomor ${idx + 1} tidak memiliki pilihan jawaban yang cukup.`);
        }

        // Batasi opsi sesuai optCount
        rawOptions = rawOptions.slice(0, optCount);

        // Pastikan label sesuai A, B, C, D, E
        const mappedOptions = rawOptions.map((opt, oIdx) => ({
          label: optLabels[oIdx] || String.fromCharCode(65 + oIdx),
          content: String(opt.content || "").trim(),
          isCorrect: Boolean(opt.isCorrect),
        }));

        // Validasi harus ada tepat 1 kunci jawaban
        const correctCount = mappedOptions.filter((o) => o.isCorrect).length;
        if (correctCount === 0 && mappedOptions.length > 0) {
          mappedOptions[0].isCorrect = true; // Fallback jika AI lupa menandai kunci
        } else if (correctCount > 1) {
          // Jika ada lebih dari satu kunci jawaban, pertahankan yang pertama
          let foundFirst = false;
          mappedOptions.forEach((o) => {
            if (o.isCorrect) {
              if (foundFirst) o.isCorrect = false;
              else foundFirst = true;
            }
          });
        }

        const validDiff = ["EASY", "MEDIUM", "HARD"].includes(q.difficulty)
          ? q.difficulty
          : "MEDIUM";

        return {
          number: Number(q.number) || idx + 1,
          content: String(q.content || "").trim(),
          difficulty: validDiff,
          type: QuestionType.SINGLE_CHOICE,
          options: mappedOptions,
          explanation: String(q.explanation || "").trim(),
          bloomLevel: q.bloomLevel ? String(q.bloomLevel).trim() : undefined,
        };
      });

      return {
        subjectName: topic.subject.name,
        topicName: topic.name,
        questions,
      };
    } catch (err: any) {
      if (err instanceof AppError) {
        throw err;
      }
      console.error("[QuestionAiService] Error generating questions:", err);
      throw new AppError(
        "VALIDATION_ERROR",
        `Gagal membuat soal dengan AI: ${err?.message || "Pastikan materi dapat dibaca atau periksa API Key Gemini Anda."}`
      );
    }
  }

  /**
   * Menyimpan butir-butir soal yang dipilih ke dalam Bank Soal database
   */
  static async saveGeneratedQuestions(
    teacherId: string,
    input: SaveGeneratedQuestionsInput
  ) {
    // Verifikasi keberadaan topik
    const topic = await prisma.topic.findUnique({
      where: { id: input.topicId },
      include: { subject: true },
    });

    if (!topic) {
      throw new AppError("NOT_FOUND", "Topik materi tidak ditemukan.");
    }

    // Simpan semua soal terpilih dalam satu transaksi database
    const createdQuestions = await prisma.$transaction(
      input.questions.map((q) => {
        const diffLevel: DifficultyLevel =
          q.difficulty === "EASY"
            ? DifficultyLevel.EASY
            : q.difficulty === "HARD"
            ? DifficultyLevel.HARD
            : DifficultyLevel.MEDIUM;

        return prisma.question.create({
          data: {
            topicId: input.topicId,
            createdById: teacherId,
            content: q.content.trim(),
            difficulty: diffLevel,
            type: q.type || QuestionType.SINGLE_CHOICE,
            explanation: q.explanation?.trim() || null,
            isActive: true,
            options: {
              create: q.options.map((opt) => ({
                label: opt.label.toUpperCase(),
                content: opt.content.trim(),
                isCorrect: Boolean(opt.isCorrect),
              })),
            },
          },
          include: {
            options: {
              orderBy: { label: "asc" },
            },
          },
        });
      })
    );

    return {
      count: createdQuestions.length,
      topicName: topic.name,
      subjectName: topic.subject.name,
      subjectId: topic.subject.id,
      questions: createdQuestions,
    };
  }
}
