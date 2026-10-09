import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { AppError } from "@/lib/errors";

export const MAX_IMAGE_FILE_SIZE = 1 * 1024 * 1024; // 1 MB

export const ALLOWED_IMAGE_MIME_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
};

export class QuestionUploadService {
  /**
   * Memvalidasi dan menyimpan file gambar ke direktori publik lokal.
   * Batas ukuran: 1 MB. Format: JPG, PNG, WebP, GIF, SVG.
   */
  static async uploadImage(file: File): Promise<{
    url: string;
    filename: string;
    size: number;
    mimeType: string;
  }> {
    if (!file) {
      throw new AppError("VALIDATION_ERROR", "File gambar wajib dilampirkan.");
    }

    // 1. Validasi batas ukuran file (Maksimal 1 MB)
    if (file.size > MAX_IMAGE_FILE_SIZE) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Ukuran file (${(file.size / (1024 * 1024)).toFixed(2)} MB) melebihi batas maksimal 1 MB.`,
      );
    }

    // 2. Validasi tipe file
    const mimeType = file.type.toLowerCase();
    const extension = ALLOWED_IMAGE_MIME_TYPES[mimeType];

    if (!extension) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Format file tidak didukung. Harap unggah file gambar (JPG, PNG, WebP, GIF, atau SVG).",
      );
    }

    // 3. Nama file acak dan unik
    const uniqueId = crypto.randomUUID().slice(0, 12);
    const timestamp = Date.now();
    const filename = `img_${timestamp}_${uniqueId}${extension}`;

    // 4. Pastikan direktori tujuan tersedia
    const uploadDir = path.join(process.cwd(), "public", "uploads", "questions");
    await fs.mkdir(uploadDir, { recursive: true });

    // 5. Simpan file
    const filePath = path.join(uploadDir, filename);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(filePath, buffer);

    return {
      url: `/uploads/questions/${filename}`,
      filename,
      size: file.size,
      mimeType,
    };
  }
}
