import { NextRequest } from "next/server";
import { requireRole } from "@/modules/auth/auth.guard";
import { UserRole } from "@/generated/prisma/client";
import { QuestionBankService } from "@/modules/question-bank/question.service";
import { subjectSchema } from "@/modules/question-bank/question.schema";
import { ok, created, handleApiError } from "@/lib/api-response";

export async function GET() {
  try {
    await requireRole([UserRole.TEACHER, UserRole.ADMIN]);
    const subjects = await QuestionBankService.listSubjects();
    return ok(subjects);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole([UserRole.TEACHER, UserRole.ADMIN]);
    const json = await req.json();
    const validated = subjectSchema.parse(json);
    const subject = await QuestionBankService.createSubject(validated);
    return created(subject, "Mata pelajaran berhasil ditambahkan.");
  } catch (error) {
    return handleApiError(error);
  }
}
