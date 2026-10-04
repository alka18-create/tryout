import { NextRequest } from "next/server";
import { requireRole } from "@/modules/auth/auth.guard";
import { UserRole } from "@/generated/prisma/client";
import { TryoutService } from "@/modules/tryout/tryout.service";
import { createTryoutSchema } from "@/modules/tryout/tryout.schema";
import { ok, created, handleApiError } from "@/lib/api-response";

export async function GET() {
  try {
    const user = await requireRole([UserRole.TEACHER, UserRole.ADMIN]);
    const tryouts = await TryoutService.listTryouts(user.id, user.role);
    return ok(tryouts);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole([UserRole.TEACHER, UserRole.ADMIN]);
    const json = await req.json();
    const validated = createTryoutSchema.parse(json);
    const tryout = await TryoutService.createTryout(user.id, validated);
    return created(tryout, "Paket tryout berhasil dibuat.");
  } catch (error) {
    return handleApiError(error);
  }
}
