import { NextRequest } from "next/server";
import { requireRole } from "@/modules/auth/auth.guard";
import { UserRole } from "@/generated/prisma/client";
import { QuestionAiService } from "@/modules/question-bank/question-ai.service";
import { GenerateQuestionsInputSchema } from "@/modules/question-bank/question-ai.schema";
import { startAiJob } from "@/modules/question-bank/question-ai.jobs";
import { ok, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/**
 * GET /api/teacher/questions/generate
 * Memeriksa ketersediaan kredensial AI (Cloudflare / Gemini) di server
 */
export async function GET() {
  try {
    await requireRole([UserRole.TEACHER, UserRole.ADMIN]);

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
 * Memulai job pembuatan soal AI di latar belakang dan langsung mengembalikan jobId.
 * Status & hasil diambil lewat GET /api/teacher/questions/generate/jobs/[jobId].
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireRole([UserRole.TEACHER, UserRole.ADMIN]);
    const json = await req.json();
    const validated = GenerateQuestionsInputSchema.parse(json);

    console.log(
      `[AI-GENERATE] Memulai job: user=${user.id}, provider=${validated.provider}, model=${validated.model || "default"}, count=${validated.questionCount}, materialChars=${validated.materialText?.length || 0}`
    );

    const job = startAiJob(user.id, () => QuestionAiService.generateQuestions(user.id, validated));

    return ok({ jobId: job.id, status: job.status }, "Proses pembuatan soal dimulai.", 202);
  } catch (error) {
    console.error("[AI-GENERATE] Gagal memulai job:", error);
    return handleApiError(error);
  }
}
