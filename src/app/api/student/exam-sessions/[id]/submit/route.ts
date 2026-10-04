import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { ok, fail, handleApiError } from "@/lib/api-response";
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

    const { id: sessionId } = await context.params;
    const result = await ExamService.submitExamSession(session.user.id, sessionId, false);

    return ok(result, "Ujian berhasil diselesaikan dan dinilai.");
  } catch (err: any) {
    return handleApiError(err);
  }
}
