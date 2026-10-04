import { NextRequest } from "next/server";
import { requireRole } from "@/modules/auth/auth.guard";
import { UserRole } from "@/generated/prisma/client";
import { QuestionBankService } from "@/modules/question-bank/question.service";
import { questionSchema } from "@/modules/question-bank/question.schema";
import { ok, handleApiError } from "@/lib/api-response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole([UserRole.TEACHER, UserRole.ADMIN]);
    const { id } = await params;
    const question = await QuestionBankService.getQuestionById(id);
    return ok(question);
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
    const validated = questionSchema.parse(json);

    const updated = await QuestionBankService.updateQuestion(
      user.id,
      user.role,
      id,
      validated,
    );
    return ok(updated, "Soal berhasil diperbarui.");
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
    const result = await QuestionBankService.deleteQuestion(user.id, user.role, id);
    return ok(result, result.message);
  } catch (error) {
    return handleApiError(error);
  }
}
