import { NextRequest } from "next/server";
import { requireRole } from "@/modules/auth/auth.guard";
import { UserRole } from "@/generated/prisma/client";
import { TryoutService } from "@/modules/tryout/tryout.service";
import { createTryoutSchema } from "@/modules/tryout/tryout.schema";
import { ok, handleApiError } from "@/lib/api-response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole([UserRole.TEACHER, UserRole.ADMIN]);
    const { id } = await params;
    const tryout = await TryoutService.getTryoutById(id);
    return ok(tryout);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireRole([UserRole.TEACHER, UserRole.ADMIN]);
    const { id } = await params;
    const json = await req.json();
    const validated = createTryoutSchema.partial().parse(json);
    const updated = await TryoutService.updateTryout(user.id, user.role, id, validated);
    return ok(updated, "Paket tryout berhasil diperbarui.");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireRole([UserRole.TEACHER, UserRole.ADMIN]);
    const { id } = await params;
    const result = await TryoutService.deleteTryout(user.id, user.role, id);
    return ok(result, result.message);
  } catch (error) {
    return handleApiError(error);
  }
}
