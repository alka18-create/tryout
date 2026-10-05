import { NextRequest } from "next/server";
import { requireRole } from "@/modules/auth/auth.guard";
import { UserRole } from "@/generated/prisma/client";
import { QuestionImportService } from "@/modules/question-bank/question-import.service";
import { ok, fail, handleApiError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole([UserRole.TEACHER, UserRole.ADMIN]);

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return fail(
        "VALIDATION_ERROR",
        "File Excel (.xlsx / .xls / .csv) tidak ditemukan dalam form upload.",
        undefined,
        400,
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      return fail("VALIDATION_ERROR", "File yang diunggah kosong.", undefined, 400);
    }

    const result = await QuestionImportService.importQuestionsFromExcel(user.id, buffer);

    const message =
      result.failedCount === 0
        ? `Sukses! Berhasil mengimpor ${result.successCount} butir soal ke bank soal.`
        : `Proses selesai: ${result.successCount} soal berhasil diimpor, ${result.failedCount} baris memiliki kesalahan.`;

    return ok(result, message);
  } catch (error) {
    return handleApiError(error);
  }
}
