import { NextRequest } from "next/server";
import { requireRole } from "@/modules/auth/auth.guard";
import { UserRole } from "@/generated/prisma/client";
import { ok, handleApiError } from "@/lib/api-response";
import { AppError } from "@/lib/errors";
import { QuestionUploadService } from "@/modules/question-bank/upload.service";

export async function POST(req: NextRequest) {
  try {
    // 1. Otorisasi: Hanya Guru dan Admin
    await requireRole([UserRole.TEACHER, UserRole.ADMIN]);

    // 2. Parse form-data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      throw new AppError("VALIDATION_ERROR", "File gambar wajib dilampirkan.");
    }

    // 3. Simpan dan validasi file gambar
    const result = await QuestionUploadService.uploadImage(file);

    return ok(result, "Gambar berhasil diunggah.", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
