import { NextRequest } from "next/server";
import { requireRole } from "@/modules/auth/auth.guard";
import { UserRole } from "@/generated/prisma/client";
import { QuestionAiService } from "@/modules/question-bank/question-ai.service";
import { SaveGeneratedQuestionsInputSchema } from "@/modules/question-bank/question-ai.schema";
import { created, handleApiError } from "@/lib/api-response";

/**
 * POST /api/teacher/questions/generate/save
 * Menyimpan soal-soal hasil generate AI yang dipilih guru ke Bank Soal
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireRole([UserRole.TEACHER, UserRole.ADMIN]);
    const json = await req.json();
    console.log(
      `[AI-SAVE] Menerima request simpan soal: user=${user.id}, topicId=${json?.topicId}, jumlahSoal=${json?.questions?.length}`
    );
    const validated = SaveGeneratedQuestionsInputSchema.parse(json);

    const result = await QuestionAiService.saveGeneratedQuestions(user.id, validated);
    console.log(`[AI-SAVE] Berhasil menyimpan ${result.count} soal ke Bank Soal.`);
    return created(
      result,
      `Berhasil menyimpan ${result.count} soal ke Bank Soal (${result.subjectName} - ${result.topicName}).`
    );
  } catch (error) {
    console.error("[AI-SAVE] Gagal menyimpan soal hasil generate:", error);
    return handleApiError(error);
  }
}
