import { NextRequest } from "next/server";
import { requireRole } from "@/modules/auth/auth.guard";
import { UserRole } from "@/generated/prisma/client";
import { TryoutService } from "@/modules/tryout/tryout.service";
import { setTryoutQuestionsSchema } from "@/modules/tryout/tryout.schema";
import { ok, handleApiError } from "@/lib/api-response";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireRole([UserRole.TEACHER, UserRole.ADMIN]);
    const { id } = await params;
    const json = await req.json();
    const validated = setTryoutQuestionsSchema.parse(json);

    const result = await TryoutService.setTryoutQuestions(
      user.id,
      user.role,
      id,
      validated,
    );

    return ok(result, "Susunan butir soal tryout berhasil disimpan.");
  } catch (error) {
    return handleApiError(error);
  }
}
