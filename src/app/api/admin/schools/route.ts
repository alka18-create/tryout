import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { ok, created, fail, handleApiError } from "@/lib/api-response";
import { AdminService } from "@/modules/user/admin.service";
import { UserRole } from "@/generated/prisma/client";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return fail("UNAUTHENTICATED", "Silakan login terlebih dahulu.");
    }

    if (session.user.role !== UserRole.ADMIN) {
      return fail("FORBIDDEN", "Hanya Administrator yang memiliki akses ke data sekolah.");
    }

    const schools = await AdminService.listSchools();
    return ok(schools, "Daftar sekolah berhasil dimuat.");
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
      return fail("FORBIDDEN", "Hanya Administrator yang dapat menambahkan sekolah.");
    }

    const body = await req.json();
    if (!body.name) {
      return fail("VALIDATION_ERROR", "Nama sekolah wajib diisi.");
    }

    const school = await AdminService.createSchool(body);
    return created(school, "Sekolah berhasil ditambahkan.");
  } catch (err: any) {
    return handleApiError(err);
  }
}
