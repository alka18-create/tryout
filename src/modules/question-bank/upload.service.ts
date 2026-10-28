import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { AppError } from "@/lib/errors";

export const MAX_IMAGE_FILE_SIZE = 1 * 1024 * 1024; // 1 MB

export const ALLOWED_IMAGE_MIME_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/pjpeg": ".jpg",
  "image/png": ".png",
  "image/x-png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
};

const EXTENSION_MIME_FALLBACK: Record<string, string> = {
  ".jpg": ".jpg",
  ".jpeg": ".jpg",
  ".png": ".png",
  ".webp": ".webp",
  ".gif": ".gif",
  ".svg": ".svg",
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
    if (!file || typeof file === "string" || !(file instanceof Blob)) {
      throw new AppError("VALIDATION_ERROR", "File gambar wajib dilampirkan.");
    }

    // 1. Validasi batas ukuran file (Maksimal 1 MB)
    if (file.size > MAX_IMAGE_FILE_SIZE) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Ukuran file (${(file.size / (1024 * 1024)).toFixed(2)} MB) melebihi batas maksimal 1 MB.`,
      );
    }

    // 2. Validasi tipe file & ekstensi
    const mimeType = (file.type || "").toLowerCase();
    let extension = ALLOWED_IMAGE_MIME_TYPES[mimeType];

    // Fallback ekstensi jika tipe MIME tidak dikenali browser
    if (!extension && file.name) {
      const ext = path.extname(file.name).toLowerCase();
      extension = EXTENSION_MIME_FALLBACK[ext];
    }

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
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (err) {
      console.error("[QuestionUploadService] Gagal membuat direktori upload:", err);
      throw new AppError(
        "INTERNAL_ERROR",
        "Gagal menyiapkan folder penyimpanan gambar di server. Periksa izin akses (permission) folder public/uploads.",
      );
    }

    // 5. Simpan file
    try {
      const filePath = path.join(uploadDir, filename);
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await fs.writeFile(filePath, buffer);
    } catch (err) {
      console.error("[QuestionUploadService] Gagal menulis file gambar:", err);
      throw new AppError(
        "INTERNAL_ERROR",
        "Gagal menyimpan file gambar ke disk server. Periksa kapasitas disk atau izin akses folder public/uploads.",
      );
    }

    return {
      url: `/uploads/questions/${filename}`,
      filename,
      size: file.size,
      mimeType: mimeType || "image/jpeg",
    };
  }
}
