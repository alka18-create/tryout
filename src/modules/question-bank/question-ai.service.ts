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

/**
 * Ekstraktor JSON yang tangguh dari teks respon AI
 */
function extractJsonFromAiText(text: string): any {
  const trimmed = text.trim();

  // 1. Coba parse langsung
  try {
    return JSON.parse(trimmed);
  } catch {}

  // 2. Ekstrak dari blok markdown ```json ... ```
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {}
  }

  // 3. Ekstrak substring dari kurung kurawal pertama sampai terakhir
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = trimmed.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {}
  }

  throw new Error("Gagal mengurai respon AI menjadi format JSON.");
}

/**
 * Normalisasi dan validasi data soal agar seragam
 */
function normalizeQuestions(
  rawQuestions: any[],
  optCount: number,
  optLabels: string[]
): GeneratedQuestionItem[] {
  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
    throw new Error("AI tidak menghasilkan butir soal dalam format array.");
  }

  return rawQuestions.map((q, idx) => {
    let rawOptions: any[] = Array.isArray(q.options) ? q.options : [];
    if (rawOptions.length < 2) {
      throw new Error(`Soal nomor ${idx + 1} tidak memiliki pilihan jawaban yang cukup.`);
    }

    rawOptions = rawOptions.slice(0, optCount);

    const mappedOptions = rawOptions.map((opt, oIdx) => {
      // Menangani format { label, content, isCorrect } atau string murni
      const content = typeof opt === "string" ? opt : String(opt.content || opt.text || "").trim();
      const isCorrect = typeof opt === "object" ? Boolean(opt.isCorrect) : false;
      return {
        label: optLabels[oIdx] || String.fromCharCode(65 + oIdx),
        content,
        isCorrect,
      };
    });

    // Validasi atau inferensi kunci jawaban jika kunci disimpan di q.correctAnswer
    if (q.correctAnswer && typeof q.correctAnswer === "string") {
      const targetLabel = q.correctAnswer.trim().toUpperCase();
      let matched = false;
      mappedOptions.forEach((o) => {
        if (o.label === targetLabel || o.content.trim() === q.correctAnswer.trim()) {
          o.isCorrect = true;
          matched = true;
        }
      });
      if (!matched && mappedOptions.length > 0) {
        mappedOptions[0].isCorrect = true;
      }
    }

    // Pastikan tepat ada 1 jawaban benar
    const correctCount = mappedOptions.filter((o) => o.isCorrect).length;
    if (correctCount === 0 && mappedOptions.length > 0) {
      mappedOptions[0].isCorrect = true;
    } else if (correctCount > 1) {
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
      content: String(q.content || q.question || "").trim(),
      difficulty: validDiff,
      type: QuestionType.SINGLE_CHOICE,
      options: mappedOptions,
      explanation: String(q.explanation || "").trim(),
      bloomLevel: q.bloomLevel ? String(q.bloomLevel).trim() : undefined,
    };
  });
}

export class QuestionAiService {
  /**
   * Menghasilkan butir-butir soal menggunakan Cloudflare Workers AI atau Google Gemini
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

    const programName = PROGRAM_LABELS[input.programType] || "Latihan Soal";
    const optCount = input.optionsCount || 5;
    const optLabels = optCount === 4 ? ["A", "B", "C", "D"] : ["A", "B", "C", "D", "E"];

    // Ekstraksi teks materi dari PDF jika dilampirkan
    let documentText = "";
    if (input.uploadedFile?.data && input.uploadedFile?.mimeType) {
      if (input.uploadedFile.mimeType.includes("pdf")) {
        try {
          const buffer = Buffer.from(input.uploadedFile.data, "base64");
          const { extractText } = await import("unpdf");
          const res = await extractText(new Uint8Array(buffer));
          documentText = Array.isArray(res.text) ? res.text.join("\n\n").trim() : String(res.text || "").trim();
        } catch (pdfErr) {
          console.warn("[QuestionAiService] Gagal ekstraksi teks PDF:", pdfErr);
        }
      }
    }

    const provider = input.provider || "CLOUDFLARE";

    if (provider === "CLOUDFLARE") {
      return this.generateWithCloudflare(topic, input, programName, optCount, optLabels, documentText);
    } else {
      return this.generateWithGemini(topic, input, programName, optCount, optLabels, documentText);
    }
  }

  /**
   * Pembuatan soal menggunakan Cloudflare Workers AI
   */
  private static async generateWithCloudflare(
    topic: any,
    input: GenerateQuestionsInput,
    programName: string,
    optCount: number,
    optLabels: string[],
    documentText: string
  ) {
    const accountId = input.cfAccountId?.trim() || process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = input.cfApiToken?.trim() || process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Cloudflare Account ID dan API Token belum diatur. Masukkan Account ID dan API Token Anda di formulir, atau atur di file .env.production server."
      );
    }

    const systemInstruction = `Anda adalah asisten ahli pembuat soal kurikulum dan asesmen pendidikan Indonesia berstandar nasional (Kurikulum Merdeka / K13).
Tugas Anda adalah membuat soal pilihan ganda berkualitas tinggi berdasarkan materi dan topik yang diberikan.

PANDUAN MUTU SOAL:
1. Soal harus relevan dengan Mata Pelajaran: "${topic.subject.name}" dan Topik/Materi: "${topic.name}".
2. Bahasa Indonesia baku, jelas, kontekstual, dan mendidik.
3. Setiap butir soal WAJIB memiliki tepat ${optCount} opsi jawaban (${optLabels.join(", ")}).
4. Tepat 1 opsi bernilai benar (isCorrect: true) dan opsi lain salah (isCorrect: false).
5. Pembahasan singkat, padat, dan jelas mengenai konsep dan alasan jawaban benar (1-3 kalimat).
6. Format output HARUS berupa JSON valid tanpa teks atau penjelasan lain di luar JSON.

Format JSON yang diwajibkan:
{
  "title": "Judul Latihan Soal",
  "questions": [
    {
      "number": 1,
      "content": "Teks pertanyaan soal...",
      "difficulty": "MEDIUM",
      "bloomLevel": "C3 Penerapan",
      "options": [
        { "label": "A", "content": "Teks opsi A...", "isCorrect": true },
        { "label": "B", "content": "Teks opsi B...", "isCorrect": false },
        { "label": "C", "content": "Teks opsi C...", "isCorrect": false },
        { "label": "D", "content": "Teks opsi D...", "isCorrect": false }${optCount === 5 ? ',\n        { "label": "E", "content": "Teks opsi E...", "isCorrect": false }' : ""}
      ],
      "explanation": "Pembahasan konsep ringkas..."
    }
  ]
}`;

    const userPrompt = `SPESIFIKASI SOAL:
- Mata Pelajaran: ${topic.subject.name}
- Topik / Bab: ${topic.name}
- Jenis Asesmen: ${programName}
- Tingkat Kesulitan: ${input.difficulty === "MIXED" ? "Kombinasi Mudah, Sedang, Sulit" : input.difficulty}
- Jumlah Soal: ${input.questionCount} butir
- Jumlah Pilihan Jawaban per Soal: ${optCount} opsi (${optLabels.join(", ")})
${input.customInstructions ? `- Instruksi Tambahan Guru: "${input.customInstructions}"` : ""}

${documentText ? `MATERI DARI DOKUMEN:\n"""\n${documentText.substring(0, 18000)}\n"""\n` : ""}
${input.materialText ? `MATERI PEMBELAJARAN ACUAN:\n"""\n${input.materialText.trim().substring(0, 18000)}\n"""\n` : ""}

INSTRUKSI:
Buatkan tepat ${input.questionCount} butir soal pilihan ganda bermutu tinggi sekarang juga sesuai struktur JSON di atas!`;

    // Model Cloudflare terkemuka yang siap pakai
    const candidateModels = Array.from(
      new Set(
        [
          input.model?.startsWith("@cf/") ? input.model : undefined,
          process.env.CLOUDFLARE_MODEL,
          "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
          "@cf/qwen/qwen2.5-72b-instruct",
          "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
          "@cf/meta/llama-3.1-8b-instruct",
        ].filter(Boolean) as string[]
      )
    );

    let lastError: any = null;
    let responseText = "";

    for (const modelName of candidateModels) {
      try {
        console.log(`[QuestionAiService] Memanggil Cloudflare Workers AI model: ${modelName}...`);
        const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`;

        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: modelName,
            messages: [
              { role: "system", content: systemInstruction },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.6,
            max_tokens: 3800,
          }),
          signal: AbortSignal.timeout(45000), // Batas 45 detik
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.errors?.[0]?.message || res.statusText || `HTTP ${res.status}`;
          console.warn(`[QuestionAiService] Cloudflare model ${modelName} gagal: ${errMsg}`);

          // Jika auth salah, jangan retry model lain
          if (res.status === 401 || res.status === 403) {
            throw new AppError(
              "FORBIDDEN",
              "Cloudflare API Token tidak valid atau tidak memiliki izin Workers AI. Pastikan token memiliki izin 'Workers AI: Read'."
            );
          }
          if (res.status === 404 && errMsg.toLowerCase().includes("account")) {
            throw new AppError(
              "VALIDATION_ERROR",
              "Cloudflare Account ID tidak ditemukan. Periksa kembali Account ID Anda di dashboard Cloudflare."
            );
          }

          lastError = new Error(errMsg);
          continue;
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content && content.trim().length > 0) {
          responseText = content;
          console.log(`[QuestionAiService] Berhasil menerima respon dari Cloudflare (${modelName})`);
          break;
        }
      } catch (err: any) {
        if (err instanceof AppError) throw err;
        lastError = err;
        console.warn(`[QuestionAiService] Error request Cloudflare model ${modelName}:`, err.message || err);
      }
    }

    if (!responseText) {
      throw (
        lastError ||
        new AppError(
          "INTERNAL_ERROR",
          "Gagal mendapatkan respon dari Cloudflare Workers AI. Pastikan Account ID & API Token benar."
        )
      );
    }

    const parsed = extractJsonFromAiText(responseText);
    const questions = normalizeQuestions(parsed.questions || [], optCount, optLabels);

    return {
      subjectName: topic.subject.name,
      topicName: topic.name,
      questions,
    };
  }

  /**
   * Pembuatan soal menggunakan Google Gemini
   */
  private static async generateWithGemini(
    topic: any,
    input: GenerateQuestionsInput,
    programName: string,
    optCount: number,
    optLabels: string[],
    documentText: string
  ) {
    const apiKey = input.apiKey?.trim() || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new AppError(
        "VALIDATION_ERROR",
        "API Key Google Gemini belum diatur. Silakan masukkan API Key Gemini Anda atau gunakan provider Cloudflare."
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `Anda adalah asisten ahli pembuat soal kurikulum dan asesmen pendidikan Indonesia berstandar nasional (Kurikulum Merdeka / K13).
Tugas Anda adalah membuat soal pilihan ganda berkualitas tinggi berdasarkan materi dan topik yang diberikan.

PANDUAN MUTU SOAL:
1. Soal harus relevan dengan Mata Pelajaran: "${topic.subject.name}" dan Topik/Materi: "${topic.name}".
2. Bahasa Indonesia baku, jelas, tidak ambigu, dan mendidik.
3. Setiap soal WAJIB memiliki tepat ${optCount} pilihan jawaban dengan label (${optLabels.join(", ")}).
4. Tepat 1 (satu) pilihan jawaban bernilai BENAR (isCorrect: true), dan pilihan lainnya SALAH (isCorrect: false).
5. Sertakan kunci jawaban dan pembahasan konsep ringkas (1-3 kalimat).
6. Output HARUS berupa JSON terstruktur sesuai skema yang ditentukan tanpa teks pengantar markdown di luar JSON.`;

    const userPrompt = `SPESIFIKASI SOAL:
- Mata Pelajaran: ${topic.subject.name}
- Topik / Bab: ${topic.name}
- Jenis Asesmen: ${programName}
- Target Tingkat Kesulitan: ${input.difficulty === "MIXED" ? "Kombinasi (Mudah, Sedang, Sulit secara proporsional)" : input.difficulty}
- Jumlah Soal: ${input.questionCount} butir
- Jumlah Pilihan Jawaban per Soal: ${optCount} opsi (${optLabels.join(", ")})
${input.customInstructions ? `- Instruksi Tambahan Guru: "${input.customInstructions}"` : ""}

INSTRUKSI:
Buatkan tepat ${input.questionCount} butir soal pilihan ganda bermutu tinggi berdasarkan materi di bawah ini (atau pengetahuan topik "${topic.name}").`;

    const contentParts: any[] = [];

    if (documentText && documentText.length > 50) {
      contentParts.push({
        text: `MATERI PEMBELAJARAN DARI DOKUMEN (${input.uploadedFile?.fileName || "PDF"}):\n"""\n${documentText.substring(0, 30000)}\n"""`,
      });
    } else if (input.uploadedFile?.data && input.uploadedFile?.mimeType) {
      contentParts.push({
        inlineData: {
          mimeType: input.uploadedFile.mimeType,
          data: input.uploadedFile.data,
        },
      });
    }

    if (input.materialText && input.materialText.trim().length > 0) {
      contentParts.push({
        text: `MATERI PEMBELAJARAN ACUAN:\n"""\n${input.materialText.trim().substring(0, 30000)}\n"""`,
      });
    }

    contentParts.push({ text: userPrompt });

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
                description: "Tingkat kognitif Bloom, misal: C1, C2, C3, C4",
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
                description: "Pembahasan ringkas 1-3 kalimat mengenai konsep dan alasan jawaban benar",
              },
            },
            required: ["number", "content", "difficulty", "options", "explanation"],
          },
        },
      },
      required: ["questions"],
    };

    try {
      const rawCandidateModels = [
        input.model?.startsWith("gemini-") ? input.model : undefined,
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
            console.log(`[QuestionAiService] Berhasil mendapatkan respon dari model Gemini: ${modelName}`);
            break;
          }
        } catch (err: any) {
          lastError = err;
          const errMsg = String(err?.message || err || "");
          console.warn(`[QuestionAiService] Gemini model ${modelName} gagal:`, errMsg);

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
            "Kuota gratis Google Gemini API Anda telah habis atau terkena Rate Limit. Silakan gunakan Cloudflare Workers AI atau tunggu beberapa saat."
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

      const parsed = extractJsonFromAiText(responseText);
      const questions = normalizeQuestions(parsed.questions || [], optCount, optLabels);

      return {
        subjectName: topic.subject.name,
        topicName: topic.name,
        questions,
      };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      console.error("[QuestionAiService] Error generating questions with Gemini:", err);
      throw new AppError(
        "VALIDATION_ERROR",
        `Gagal membuat soal dengan Gemini: ${err?.message || "Periksa API Key Gemini Anda."}`
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
      throw new AppError("NOT_FOUND", "Topik materi yang dipilih tidak ditemukan.");
    }

    if (!input.questions || input.questions.length === 0) {
      throw new AppError("VALIDATION_ERROR", "Tidak ada butir soal yang dipilih untuk disimpan.");
    }

    // Simpan semua butir soal dalam transaksi database atomik
    const createdQuestions = await prisma.$transaction(async (tx) => {
      const results = [];

      for (const item of input.questions) {
        const question = await tx.question.create({
          data: {
            topicId: topic.id,
            createdById: teacherId,
            type: item.type || QuestionType.SINGLE_CHOICE,
            content: item.content,
            difficulty: item.difficulty as DifficultyLevel,
            explanation: item.explanation || null,
            options: {
              create: item.options.map((opt, idx) => ({
                label: opt.label,
                content: opt.content,
                isCorrect: opt.isCorrect,
                order: idx + 1,
              })),
            },
          },
          include: {
            options: true,
          },
        });
        results.push(question);
      }

      return results;
    });

    return {
      count: createdQuestions.length,
      topicName: topic.name,
      subjectName: topic.subject.name,
    };
  }
}
