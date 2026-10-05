import { NextResponse } from "next/server";
import { requireRole } from "@/modules/auth/auth.guard";
import { UserRole } from "@/generated/prisma/client";
import { QuestionImportService } from "@/modules/question-bank/question-import.service";
import { handleApiError } from "@/lib/api-response";

export async function GET() {
  try {
    await requireRole([UserRole.TEACHER, UserRole.ADMIN]);

    const buffer = await QuestionImportService.generateQuestionExcelTemplate();

    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="Template_Import_Soal_TryoutKu.xlsx"',
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
