import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { ok, fail, handleApiError } from "@/lib/api-response";
import { ExamService } from "@/modules/exam/exam.service";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return fail("UNAUTHENTICATED", "Silakan login terlebih dahulu.");
    }

    const { id } = await context.params;
    const tryout = await ExamService.getTryoutDetailForStudent(session.user.id, id);

    return ok(tryout, "Detail paket tryout berhasil dimuat.");
  } catch (err: any) {
    return handleApiError(err);
  }
}
