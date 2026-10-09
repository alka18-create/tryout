/**
 * =============================================================================
 * TEST: IMAGE UPLOAD FEATURE (1 MB LIMIT & FORMAT VALIDATION)
 * =============================================================================
 */

import { NextRequest } from "next/server";
import fs from "fs/promises";
import path from "path";
import { QuestionUploadService } from "../../src/modules/question-bank/upload.service";
import { POST as uploadHandler } from "../../src/app/api/teacher/upload/route";
import { AppError } from "../../src/lib/errors";

async function main() {
  console.log("\n==================================================");
  console.log("▶ [TEST] Fitur Upload Gambar (Batas 1 MB & Validasi)");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(name: string, ok: boolean, reason?: string) {
    if (ok) {
      console.log(`  ✓ ${name}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${name} ${reason ? `(${reason})` : ""}`);
      failed++;
    }
  }


  // 2. Uji file melebihi 1 MB (1.2 MB buffer)
  try {
    const largeBuffer = Buffer.alloc(1.2 * 1024 * 1024);
    const largeBlob = new Blob([largeBuffer], { type: "image/jpeg" }) as File;
    Object.defineProperty(largeBlob, "name", { value: "large-photo.jpg" });

    let threwError = false;
    try {
      await QuestionUploadService.uploadImage(largeBlob);
    } catch (err: any) {
      threwError = true;
      assert(
        "Service menolak file yang ukurannya > 1 MB",
        err instanceof AppError && err.code === "VALIDATION_ERROR" && err.message.includes("1 MB"),
        err.message,
      );
    }

    if (!threwError) {
      assert("Service menolak file yang ukurannya > 1 MB", false, "Tidak melempar error!");
    }
  } catch (err: any) {
    assert("Uji batas ukuran 1 MB", false, err.message);
  }

  // 3. Uji format file tidak valid (misal text/plain)
  try {
    const textBlob = new Blob(["not an image"], { type: "text/plain" }) as File;
    Object.defineProperty(textBlob, "name", { value: "document.txt" });

    let threwError = false;
    try {
      await QuestionUploadService.uploadImage(textBlob);
    } catch (err: any) {
      threwError = true;
      assert(
        "Service menolak file format non-gambar (text/plain)",
        err instanceof AppError && err.code === "VALIDATION_ERROR" && err.message.includes("Format file tidak didukung"),
        err.message,
      );
    }

    if (!threwError) {
      assert("Service menolak format non-gambar", false, "Tidak melempar error!");
    }
  } catch (err: any) {
    assert("Uji format file non-gambar", false, err.message);
  }

  // 4. Uji upload file gambar valid (< 1 MB, misal 50 KB PNG)
  let uploadedFilePath: string | null = null;
  try {
    const validBuffer = Buffer.alloc(50 * 1024); // 50 KB dummy image
    const validBlob = new Blob([validBuffer], { type: "image/png" }) as File;
    Object.defineProperty(validBlob, "name", { value: "diagram-soal.png" });

    const result = await QuestionUploadService.uploadImage(validBlob);

    const isSuccess = Boolean(result.url && result.filename && result.size === 50 * 1024);
    assert(
      "Service menerima file gambar PNG valid (< 1 MB) dan menghasilkan path publik",
      isSuccess,
      JSON.stringify(result),
    );

    if (result.url) {
      const publicPath = path.join(process.cwd(), "public", result.url);
      uploadedFilePath = publicPath;
      const fileExists = await fs
        .access(publicPath)
        .then(() => true)
        .catch(() => false);

      assert("File gambar tersimpan secara fisik di folder public/uploads/questions/", fileExists);
    }
  } catch (err: any) {
    assert("Upload file gambar valid", false, err.message);
  } finally {
    // Bersihkan file uji coba jika ada
    if (uploadedFilePath) {
      await fs.unlink(uploadedFilePath).catch(() => {});
    }
  }

  console.log("--------------------------------------------------");
  console.log(`Hasil: ${passed} lolos, ${failed} gagal.`);
  console.log("==================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Test error:", e);
  process.exit(1);
});
