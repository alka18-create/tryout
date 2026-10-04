import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { fail, handleApiError } from "@/lib/api-response";
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
      return fail("FORBIDDEN", "Hanya Guru dan Admin yang dapat mengekspor laporan.");
    }

    const { id: tryoutId } = await context.params;
    const { csvContent, filename } = await AnalyticsService.generateTryoutCsv(
      tryoutId,
      session.user.id,
      session.user.role as UserRole
    );

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    return handleApiError(err);
  }
}
