/**
 * =============================================================================
 * TEST SUITE: EXCEL QUESTION TEMPLATE & IMPORT FUNCTIONALITY
 * =============================================================================
 */

import * as XLSX from "xlsx";
import { prisma } from "../src/lib/prisma";
import { QuestionImportService } from "../src/modules/question-bank/question-import.service";

async function main() {
  console.log("=================================================================");
  console.log("   TESTING: EXCEL QUESTION TEMPLATE & IMPORT SERVICE");
  console.log("=================================================================");

  // 1. Dapatkan user fixture Guru/Admin
  const teacher = await prisma.user.findFirst({
    where: { role: { in: ["TEACHER", "ADMIN"] } },
  });

  if (!teacher) {
    throw new Error("Fixture Guru atau Admin tidak ditemukan di database!");
  }

  console.log(`[Info] Menggunakan Penguji: ${teacher.name} (${teacher.role})`);

  // 2. Test generateQuestionExcelTemplate
  console.log("\n[1] Menguji Generate Template Excel...");
  const templateBytes = await QuestionImportService.generateQuestionExcelTemplate();
  const templateBuffer = Buffer.from(templateBytes);

  if (templateBuffer.length === 0) {
    throw new Error("Buffer template Excel kosong!");
  }
  console.log(`  ✓ Template Excel berhasil dibuat (${templateBuffer.length} bytes).`);

  // Parse kembali untuk memastikan integritas workbook SheetJS
  const parsedWb = XLSX.read(templateBuffer, { type: "buffer" });
  const sheetNames = parsedWb.SheetNames;
  console.log(`  ✓ Lembar kerja dalam file: ${sheetNames.join(", ")}`);

  if (!sheetNames.includes("Template Soal") || !sheetNames.includes("Daftar Topik & Referensi")) {
    throw new Error("Sheet yang diperlukan ('Template Soal' dan 'Daftar Topik & Referensi') tidak lengkap!");
  }

  const sampleData: any[] = XLSX.utils.sheet_to_json(parsedWb.Sheets["Template Soal"]);
  console.log(`  ✓ Data contoh pada template: ${sampleData.length} baris.`);
  if (sampleData.length === 0) {
    throw new Error("Data contoh pada Template Soal tidak boleh kosong!");
  }

  // 3. Test importQuestionsFromExcel dengan Template yang Berisi Soal Contoh
  console.log("\n[2] Menguji Import Soal dari Template Valid...");
  const initialCount = await prisma.question.count();

  const importResult = await QuestionImportService.importQuestionsFromExcel(
    teacher.id,
    templateBuffer,
  );

  console.log("  Hasil Import:", {
    totalRows: importResult.totalRows,
    successCount: importResult.successCount,
    failedCount: importResult.failedCount,
  });

  if (importResult.failedCount > 0) {
    console.error("  Error detail:", importResult.errors);
    throw new Error(`Import template mengalami kegagalan pada ${importResult.failedCount} baris!`);
  }

  const finalCount = await prisma.question.count();
  const added = finalCount - initialCount;
  console.log(`  ✓ Soal berhasil ditambahkan ke database: ${added} butir baru.`);

  if (added !== importResult.successCount) {
    throw new Error(`Jumlah soal di DB (${added}) tidak sesuai dengan successCount (${importResult.successCount})`);
  }

  // 4. Test Validasi Error Handling pada Baris Tidak Valid
  console.log("\n[3] Menguji Penanganan Error (Baris Tidak Lengkap / Topik Fiktif)...");
  const invalidRows = [
    {
      "No": 1,
      "Mata Pelajaran": "Sosiologi",
      "Topik Materi": "Topik Yang Tidak Pernah Ada Di Dunia",
      "Tingkat Kesulitan": "SEDANG",
      "Teks Soal": "Soal uji coba topik tidak valid?",
      "Opsi A": "Opsi 1",
      "Opsi B": "Opsi 2",
      "Opsi C": "Opsi 3",
      "Opsi D": "Opsi 4",
      "Opsi E": "Opsi 5",
      "Kunci Jawaban": "A",
    },
    {
      "No": 2,
      "Mata Pelajaran": "Sosiologi",
      "Topik Materi": sampleData[0]["Topik Materi"],
      "Tingkat Kesulitan": "SEDANG",
      "Teks Soal": "", // Teks kosong
      "Opsi A": "Opsi 1",
      "Opsi B": "Opsi 2",
      "Opsi C": "Opsi 3",
      "Opsi D": "Opsi 4",
      "Opsi E": "Opsi 5",
      "Kunci Jawaban": "A",
    },
    {
      "No": 3,
      "Mata Pelajaran": "Sosiologi",
      "Topik Materi": sampleData[0]["Topik Materi"],
      "Tingkat Kesulitan": "SEDANG",
      "Teks Soal": "Soal dengan kunci jawaban tidak valid?",
      "Opsi A": "Opsi 1",
      "Opsi B": "Opsi 2",
      "Opsi C": "Opsi 3",
      "Opsi D": "Opsi 4",
      "Opsi E": "Opsi 5",
      "Kunci Jawaban": "Z", // Kunci salah
    },
  ];

  const wbInvalid = XLSX.utils.book_new();
  const wsInvalid = XLSX.utils.json_to_sheet(invalidRows);
  XLSX.utils.book_append_sheet(wbInvalid, wsInvalid, "Template Soal");
  const invalidBuffer = XLSX.write(wbInvalid, { type: "buffer", bookType: "xlsx" });

  const invalidResult = await QuestionImportService.importQuestionsFromExcel(
    teacher.id,
    invalidBuffer,
  );

  console.log("  Hasil Uji Data Tidak Valid:", {
    totalRows: invalidResult.totalRows,
    successCount: invalidResult.successCount,
    failedCount: invalidResult.failedCount,
    errorsCount: invalidResult.errors.length,
  });

  if (invalidResult.failedCount !== 3 || invalidResult.successCount !== 0) {
    throw new Error("Semua 3 baris tidak valid seharusnya ditolak!");
  }

  console.log("  ✓ Seluruh baris cacat berhasil dideteksi dan dilaporkan per nomor baris:");
  invalidResult.errors.forEach((err) => {
    console.log(`    - Baris ${err.row}: ${err.error}`);
  });

  console.log("\n=================================================================");
  console.log("   ✅ SEMUA PENGUJIAN TEMPLATE & IMPORT EXCEL SUKSES 100%");
  console.log("=================================================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test gagal:", err);
    process.exit(1);
  });
