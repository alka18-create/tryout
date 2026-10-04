import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { ok, created, fail, handleApiError } from "@/lib/api-response";
import { AdminService } from "@/modules/user/admin.service";
import { UserRole } from "@/generated/prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return fail("UNAUTHENTICATED", "Silakan login terlebih dahulu.");
    }

    if (session.user.role !== UserRole.ADMIN) {
      return fail("FORBIDDEN", "Hanya Administrator yang memiliki akses ke data pengguna.");
    }

    const { searchParams } = new URL(req.url);
    const role = (searchParams.get("role") as UserRole) || undefined;
    const search = searchParams.get("search") || undefined;
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 20;

    const data = await AdminService.listUsers({ role, search, page, limit });
    return ok(data, "Daftar pengguna berhasil dimuat.");
  } catch (err: any) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return fail("UNAUTHENTICATED", "Silakan login terlebih dahulu.");
    }

    if (session.user.role !== UserRole.ADMIN) {
      return fail("FORBIDDEN", "Hanya Administrator yang dapat membuat akun ini.");
    }

    const body = await req.json();
    if (!body.name || !body.email || !body.role) {
      return fail("VALIDATION_ERROR", "Nama, email, dan role wajib diisi.");
    }

    const newUser = await AdminService.createUser(body);
    return created(newUser, "Pengguna berhasil dibuat.");
  } catch (err: any) {
    return handleApiError(err);
  }
}
