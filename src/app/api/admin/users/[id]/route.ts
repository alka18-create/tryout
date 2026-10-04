import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { ok, fail, handleApiError } from "@/lib/api-response";
import { AdminService } from "@/modules/user/admin.service";
import { UserRole } from "@/generated/prisma/client";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return fail("UNAUTHENTICATED", "Silakan login terlebih dahulu.");
    }

    if (session.user.role !== UserRole.ADMIN) {
      return fail("FORBIDDEN", "Hanya Administrator yang dapat mengubah data pengguna.");
    }

    const { id: userId } = await context.params;
    const body = await req.json();

    const updated = await AdminService.updateUser(userId, body);
    return ok(updated, "Data pengguna berhasil diperbarui.");
  } catch (err: any) {
    return handleApiError(err);
  }
}
