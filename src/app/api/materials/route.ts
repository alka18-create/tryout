import { NextRequest } from "next/server";
import { requireAuth, requireRole } from "@/modules/auth/auth.guard";
import { UserRole } from "@/generated/prisma/client";
import { LearningMaterialService } from "@/modules/learning-material/learning-material.service";
import { createMaterialSchema } from "@/modules/learning-material/learning-material.schema";
import { ok, created, handleApiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const searchParams = req.nextUrl.searchParams;

    const subjectId = searchParams.get("subjectId") || undefined;
    const topicId = searchParams.get("topicId") || undefined;
    const search = searchParams.get("search") || undefined;
    const type = searchParams.get("type") || undefined;
    const myOnly = searchParams.get("myOnly") === "true";

    const materials = await LearningMaterialService.listMaterials({
      subjectId,
      topicId,
      search,
      type,
      role: user.role,
      authorId: myOnly ? user.id : undefined,
    });

    return ok(materials);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole([UserRole.TEACHER, UserRole.ADMIN]);
    const json = await req.json();
    const validated = createMaterialSchema.parse(json);

    const material = await LearningMaterialService.createMaterial(
      user.id,
      validated
    );
    return created(material, "Link materi pembelajaran berhasil disimpan.");
  } catch (error) {
    return handleApiError(error);
  }
}
