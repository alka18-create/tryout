import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { ok, fail, handleApiError } from "@/lib/api-response";
import { AnalyticsService } from "@/modules/analytics/analytics.service";
import { UserRole } from "@/generated/prisma/client";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return fail("UNAUTHENTICATED", "Silakan login terlebih dahulu.");
    }

    if (session.user.role !== UserRole.TEACHER && session.user.role !== UserRole.ADMIN) {
      return fail("FORBIDDEN", "Hanya Guru dan Admin yang dapat mengakses laporan ini.");
    }

    const { id: tryoutId } = await context.params;
    const report = await AnalyticsService.getTryoutReport(
      tryoutId,
      session.user.id,
      session.user.role as UserRole
    );

    return ok(report, "Laporan hasil tryout berhasil dimuat.");
  } catch (err: any) {
    return handleApiError(err);
  }
}
