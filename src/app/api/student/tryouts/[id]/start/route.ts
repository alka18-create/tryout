import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { ok, created, fail, handleApiError } from "@/lib/api-response";
import { ExamService } from "@/modules/exam/exam.service";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return fail("UNAUTHENTICATED", "Silakan login terlebih dahulu.");
    }

    const { id: tryoutId } = await context.params;
    const result = await ExamService.startOrResumeExamSession(session.user.id, tryoutId);

    if (result.isResumed) {
      return ok(result, "Melanjutkan sesi tryout yang sedang berlangsung.");
    }
    return created(result, "Sesi ujian baru berhasil dimulai.");
  } catch (err: any) {
    return handleApiError(err);
  }
}
