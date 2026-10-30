import { NextRequest } from "next/server";
import { requireRole } from "@/modules/auth/auth.guard";
import { UserRole } from "@/generated/prisma/client";
import { QuestionAiService } from "@/modules/question-bank/question-ai.service";
import { GenerateQuestionsInputSchema } from "@/modules/question-bank/question-ai.schema";
import { ok, handleApiError } from "@/lib/api-response";

/**
 * GET /api/teacher/questions/generate
 * Memeriksa ketersediaan API key Gemini di server
 */
export async function GET() {
  try {
    await requireRole([UserRole.TEACHER, UserRole.ADMIN]);
    const hasSystemApiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    return ok({
      hasSystemApiKey,
      model,
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

    const result = await QuestionAiService.generateQuestions(user.id, validated);
    return ok(result, "Berhasil men-generate butir soal.");
  } catch (error) {
    return handleApiError(error);
  }
}
