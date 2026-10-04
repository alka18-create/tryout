import { NextRequest } from "next/server";
import { requireRole } from "@/modules/auth/auth.guard";
import { UserRole } from "@/generated/prisma/client";
import { QuestionBankService } from "@/modules/question-bank/question.service";
import { questionSchema, questionFilterSchema } from "@/modules/question-bank/question.schema";
import { ok, created, handleApiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    await requireRole([UserRole.TEACHER, UserRole.ADMIN]);
    const { searchParams } = new URL(req.url);

    const filter = questionFilterSchema.parse({
      search: searchParams.get("search") || undefined,
      subjectId: searchParams.get("subjectId") || undefined,
      topicId: searchParams.get("topicId") || undefined,
      difficulty: searchParams.get("difficulty") || undefined,
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 20,
    });

    const result = await QuestionBankService.listQuestions(filter);
    return ok(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole([UserRole.TEACHER, UserRole.ADMIN]);
    const json = await req.json();
    const validated = questionSchema.parse(json);
    const question = await QuestionBankService.createQuestion(user.id, validated);
    return created(question, "Soal berhasil disimpan ke bank soal.");
  } catch (error) {
    return handleApiError(error);
  }
}
