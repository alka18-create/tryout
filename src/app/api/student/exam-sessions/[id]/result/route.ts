import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { ok, fail, handleApiError } from "@/lib/api-response";
import { ScoringService } from "@/modules/scoring/scoring.service";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return fail("UNAUTHENTICATED", "Silakan login terlebih dahulu.");
    }

    const { id: sessionId } = await context.params;
    const result = await ScoringService.getExamSessionResult(session.user.id, sessionId);

    return ok(result, "Hasil ujian berhasil dimuat.");
  } catch (err: any) {
    return handleApiError(err);
  }
}
