import { NextRequest } from "next/server";
import { requireRole } from "@/modules/auth/auth.guard";
import { UserRole } from "@/generated/prisma/client";
import { getAiJob } from "@/modules/question-bank/question-ai.jobs";
import { ok, fail, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/**
 * GET /api/teacher/questions/generate/jobs/[jobId]
 * Mengambil status & hasil job pembuatan soal AI.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const user = await requireRole([UserRole.TEACHER, UserRole.ADMIN]);
    const { jobId } = await params;
    const job = getAiJob(jobId);

    if (!job || job.ownerId !== user.id) {
      return fail(
        "NOT_FOUND",
        "Proses pembuatan soal tidak ditemukan atau sudah kedaluwarsa (mungkin server baru saja di-restart). Silakan coba generate ulang.",
      );
    }

    if (job.status === "FAILED") {
      return ok({ status: job.status, error: job.error });
    }

    if (job.status === "DONE") {
      return ok({ status: job.status, result: job.result });
    }

    return ok({
      status: job.status,
      elapsedSeconds: Math.round((Date.now() - job.createdAt) / 1000),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
