import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { AppError } from "@/lib/errors";

export const MAX_IMAGE_FILE_SIZE = 1 * 1024 * 1024; // 1 MB

/**
 * Format gambar yang diizinkan.
 * SVG sengaja TIDAK diizinkan karena dapat memuat <script> dan dieksekusi
 * sebagai same-origin content (stored XSS).
 */
export const ALLOWED_IMAGE_MIME_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/pjpeg": ".jpg",
  "image/png": ".png",
  "image/x-png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const EXTENSION_MIME_FALLBACK: Record<string, string> = {
  ".jpg": ".jpg",
  ".jpeg": ".jpg",
  ".png": ".png",
  ".webp": ".webp",
  ".gif": ".gif",
};

/**
 * Memeriksa signature (magic bytes) file agar tipe MIME dari client tidak bisa
 * dipalsukan (mis. file HTML diberi nama .png).
 */
function detectImageExtension(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return ".jpg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return ".png";
  }
  if (
    buffer.length >= 6 &&
    buffer.subarray(0, 4).toString("ascii") === "GIF8"
  ) {
    return ".gif";
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return ".webp";
  }
  return null;
}

export class QuestionUploadService {
  /**
   * Memvalidasi dan menyimpan file gambar ke direktori publik lokal.
   * Batas ukuran: 1 MB. Format: JPG, PNG, WebP, GIF (SVG tidak diizinkan).
   * Ekstensi akhir ditentukan dari magic bytes, bukan dari MIME/nama file client.
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

    // 2. Validasi tipe file & ekstensi (gate awal, bukan penentu akhir)
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
        "Format file tidak didukung. Harap unggah file gambar (JPG, PNG, WebP, atau GIF).",
      );
    }

    // 3. Baca isi file & validasi signature asli (cegah MIME spoofing)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const detectedExtension = detectImageExtension(buffer);
    if (!detectedExtension) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Isi file bukan gambar yang valid. Pastikan file benar-benar berformat JPG, PNG, WebP, atau GIF.",
      );
    }

    // 4. Nama file acak dan unik (ekstensi mengikuti isi file, bukan nama dari client)
    const uniqueId = crypto.randomUUID().slice(0, 12);
    const timestamp = Date.now();
    const filename = `img_${timestamp}_${uniqueId}${detectedExtension}`;

    // 5. Pastikan direktori tujuan tersedia
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

    // 6. Simpan file
    try {
      const filePath = path.join(uploadDir, filename);
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
      mimeType: `image/${detectedExtension === ".jpg" ? "jpeg" : detectedExtension.slice(1)}`,
    };
  }
}
