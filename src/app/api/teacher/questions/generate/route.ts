import { NextRequest } from "next/server";
import { requireRole } from "@/modules/auth/auth.guard";
import { UserRole } from "@/generated/prisma/client";
import { QuestionAiService } from "@/modules/question-bank/question-ai.service";
import { GenerateQuestionsInputSchema } from "@/modules/question-bank/question-ai.schema";
import { ok, handleApiError } from "@/lib/api-response";

export const maxDuration = 180;
export const dynamic = "force-dynamic";

/**
 * GET /api/teacher/questions/generate
 * Memeriksa ketersediaan API key Gemini di server
 */
export async function GET() {
  try {
    const hasSystemGemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
    const hasSystemCloudflare = Boolean(
      process.env.CLOUDFLARE_ACCOUNT_ID &&
      process.env.CLOUDFLARE_ACCOUNT_ID.trim().length > 0 &&
      process.env.CLOUDFLARE_API_TOKEN &&
      process.env.CLOUDFLARE_API_TOKEN.trim().length > 0
    );

    const defaultProvider = hasSystemCloudflare ? "CLOUDFLARE" : hasSystemGemini ? "GEMINI" : "CLOUDFLARE";
    const cloudflareModel = process.env.CLOUDFLARE_MODEL || "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
    const geminiModel = process.env.GEMINI_MODEL || "gemini-2.0-flash";

    return ok({
      hasSystemGemini,
      hasSystemCloudflare,
      hasSystemApiKey: hasSystemCloudflare || hasSystemGemini,
      defaultProvider,
      cloudflareModel,
      geminiModel,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/teacher/questions/generate
 * Melakukan proses pembuatan butir soal dengan Gemini AI
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireRole([UserRole.TEACHER, UserRole.ADMIN]);
    const json = await req.json();
    const validated = GenerateQuestionsInputSchema.parse(json);

    console.log(
      `[AI-GENERATE] Memulai generate: user=${user.id}, mapelId=${validated.subjectId}, topikId=${validated.topicId}, count=${validated.questionCount}, model=${validated.model || "default"}, customKey=${Boolean(validated.apiKey)}, materialChars=${validated.materialText?.length || 0}`
    );

    const result = await QuestionAiService.generateQuestions(user.id, validated);
    console.log(`[AI-GENERATE] Sukses membuat ${result.questions.length} butir soal.`);
    return ok(result, "Berhasil men-generate butir soal.");
  } catch (error) {
    console.error("[AI-GENERATE] Gagal membuat soal:", error);
    return handleApiError(error);
  }
}
