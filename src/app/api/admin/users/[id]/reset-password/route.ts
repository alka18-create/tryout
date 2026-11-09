import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { ok, fail, handleApiError } from "@/lib/api-response";
import { AdminService } from "@/modules/user/admin.service";
import { UserRole } from "@/generated/prisma/client";

/**
 * POST /api/admin/users/[id]/reset-password
 * Reset password akun STUDENT/TEACHER oleh Administrator.
 * Body opsional: { password?: string } — bila kosong, server membuat
 * password sementara yang dikembalikan satu kali di response.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return fail("UNAUTHENTICATED", "Silakan login terlebih dahulu.");
    }

    if (session.user.role !== UserRole.ADMIN) {
      return fail("FORBIDDEN", "Hanya Administrator yang dapat mereset password pengguna.");
    }

    const { id: userId } = await context.params;
    const body = await req.json().catch(() => ({} as { password?: string }));

    const result = await AdminService.resetUserPassword(userId, session.user.id, {
      password: body.password,
    });
    return ok(result, "Password pengguna berhasil direset.");
  } catch (error: unknown) {
    return handleApiError(error);
  }
}