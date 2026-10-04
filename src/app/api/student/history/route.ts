import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { ok, fail, handleApiError } from "@/lib/api-response";
import { ScoringService } from "@/modules/scoring/scoring.service";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return fail("UNAUTHENTICATED", "Silakan login terlebih dahulu.");
    }

    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId") || undefined;

    const historyData = await ScoringService.getStudentExamHistory(session.user.id, subjectId);

    return ok(historyData, "Riwayat tryout peserta berhasil dimuat.");
  } catch (err: any) {
    return handleApiError(err);
  }
}
