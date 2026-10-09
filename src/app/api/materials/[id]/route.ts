import { NextRequest } from "next/server";
import { requireAuth, requireRole } from "@/modules/auth/auth.guard";
import { UserRole } from "@/generated/prisma/client";
import { LearningMaterialService } from "@/modules/learning-material/learning-material.service";
import { updateMaterialSchema } from "@/modules/learning-material/learning-material.schema";
import { ok, handleApiError } from "@/lib/api-response";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAuth();
    const { id } = await params;
    const material = await LearningMaterialService.getMaterialById(id);
    return ok(material);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = await requireRole([UserRole.TEACHER, UserRole.ADMIN]);
    const { id } = await params;
    const json = await req.json();
    const validated = updateMaterialSchema.parse(json);

    const updated = await LearningMaterialService.updateMaterial(
      id,
      user.id,
      user.role,
      validated
    );
    return ok(updated, "Link materi pembelajaran berhasil diperbarui.");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireRole([UserRole.TEACHER, UserRole.ADMIN]);
    const { id } = await params;

    await LearningMaterialService.deleteMaterial(id, user.id, user.role);
    return ok(null, "Link materi pembelajaran berhasil dihapus.");
  } catch (error) {
    return handleApiError(error);
  }
}
