/**
 * =============================================================================
 * INTEGRASI: IMPORT EXCEL SEMUA TIPE SOAL (TERMASUK TKP)
 * =============================================================================
 * Cakupan:
 *  - Generate template Excel resmi
 *  - Import Pilihan Ganda, PG Kompleks, Benar/Salah, dan TKP (opsi berbobot)
 *  - Verifikasi tipe soal, jumlah opsi, kunci jawaban, dan skor TKP 1-5
 *
 * Seluruh data uji dibuat sementara dan dihapus kembali di blok finally.
 */

import { prisma } from "../../src/lib/prisma";
import { UserRole, QuestionType } from "../../src/generated/prisma/client";
import { QuestionImportService } from "../../src/modules/question-bank/question-import.service";

interface Assertion {
  description: string;
  pass: boolean;
  details?: string;
}

const results: Assertion[] = [];

function assert(description: string, condition: boolean, details?: string) {
  results.push({
    description,
    pass: condition,
    details: condition ? undefined : details,
  });
  if (condition) {
    console.log(`  ✓ ${description}`);
  } else {
    console.error(`  ✗ FAIL: ${description} ${details ? `(${details})` : ""}`);
  }
}

export async function runExcelImportTests(): Promise<boolean> {
  console.log("\n==================================================");
  console.log("▶ [IMPORT EXCEL] PG, PG Kompleks, Benar/Salah, TKP");
  console.log("==================================================");

  const createdQuestionIds: string[] = [];
  let tempTeacherId: string | null = null;
  let tempSubjectId: string | null = null;

  try {
    // 1. Siapkan guru (pakai yang ada, atau buat sementara)
    let teacher = await prisma.user.findFirst({ where: { role: UserRole.TEACHER } });
    if (!teacher) {
      teacher = await prisma.user.create({
        data: {
          name: "Test Guru Excel",
          email: `guru_excel_${Date.now()}@tryoutku.com`,
          passwordHash: "dummy",
          role: UserRole.TEACHER,
        },
      });
      tempTeacherId = teacher.id;
    }

    // 2. Buat mapel + topik sementara agar template deterministik.
    //    Nama diawali "000" supaya menjadi mapel pertama (template memilih
    //    mapel dengan urutan nama ascending).
    const suffix = Date.now();
    const tempSubject = await prisma.subject.create({
      data: {
        name: `000 Test Import ${suffix}`,
        code: `TST${suffix}`,
        description: "Mata Pelajaran uji coba impor Excel",
        topics: {
          create: {
            name: "Topik Uji Impor",
            description: "Topik uji coba impor Excel",
          },
        },
      },
      include: { topics: true },
    });
    tempSubjectId = tempSubject.id;

    const topic = tempSubject.topics[0];
    assert("Fixture mapel & topik sementara tersedia", Boolean(topic));

    // 3. Generate template Excel
    console.log("\n1. Generate template Excel...");
    const templateBuffer = await QuestionImportService.generateQuestionExcelTemplate();
    assert(
      "Template Excel berhasil digenerate",
      templateBuffer.length > 0,
      `${templateBuffer.length} byte`,
    );

    // Catat soal yang sudah ada agar verifikasi hanya menyasar hasil impor
    const existingQuestions = await prisma.question.findMany({
      where: { createdById: teacher.id },
      select: { id: true },
    });
    const existingIds = existingQuestions.map((q) => q.id);

    // 4. Import template (berisi 4 contoh: PG, PG Kompleks, Benar/Salah, TKP)
    console.log("\n2. Import template (4 contoh soal)...");
    const importResult = await QuestionImportService.importQuestionsFromExcel(
      teacher.id,
      templateBuffer,
    );

    assert(
      "Semua baris berhasil diimpor tanpa error",
      importResult.failedCount === 0,
      JSON.stringify(importResult.errors),
    );
    assert(
      "Jumlah soal berhasil diimpor = 4",
      importResult.successCount === 4,
      `didapat ${importResult.successCount}`,
    );

    // 5. Verifikasi integritas soal di database
    console.log("\n3. Verifikasi tipe & opsi soal di database...");
    const importedQuestions = await prisma.question.findMany({
      where: {
        createdById: teacher.id,
        ...(existingIds.length > 0 ? { id: { notIn: existingIds } } : {}),
      },
      include: { options: true },
      orderBy: { createdAt: "desc" },
    });
    createdQuestionIds.push(...importedQuestions.map((q) => q.id));

    assert(
      "4 soal baru tersimpan di database",
      importedQuestions.length === 4,
      `didapat ${importedQuestions.length}`,
    );

    const singleChoice = importedQuestions.find((q) => q.type === QuestionType.SINGLE_CHOICE);
    const multipleChoice = importedQuestions.find((q) => q.type === QuestionType.MULTIPLE_CHOICE);
    const trueFalse = importedQuestions.find((q) => q.type === QuestionType.TRUE_FALSE);
    const weightedChoice = importedQuestions.find((q) => q.type === QuestionType.WEIGHTED_CHOICE);

    assert("Soal SINGLE_CHOICE ditemukan", Boolean(singleChoice));
    assert("Soal MULTIPLE_CHOICE ditemukan", Boolean(multipleChoice));
    assert("Soal TRUE_FALSE ditemukan", Boolean(trueFalse));
    assert("Soal WEIGHTED_CHOICE (TKP) ditemukan", Boolean(weightedChoice));

    if (singleChoice) {
      assert(
        "PG memiliki 5 opsi",
        singleChoice.options.length === 5,
        `didapat ${singleChoice.options.length}`,
      );
      assert(
        "PG memiliki tepat 1 kunci benar",
        singleChoice.options.filter((o) => o.isCorrect).length === 1,
      );
    }

    if (multipleChoice) {
      const keys = multipleChoice.options
        .filter((o) => o.isCorrect)
        .map((o) => o.label)
        .sort()
        .join(",");
      assert(
        "PG Kompleks memiliki 4 opsi",
        multipleChoice.options.length === 4,
        `didapat ${multipleChoice.options.length}`,
      );
      assert("Kunci PG Kompleks = A,B,D", keys === "A,B,D", `didapat ${keys}`);
    }

    if (trueFalse) {
      assert(
        "Benar/Salah memiliki 2 opsi",
        trueFalse.options.length === 2,
        `didapat ${trueFalse.options.length}`,
      );
      assert(
        "Kunci Benar/Salah = B",
        trueFalse.options.find((o) => o.isCorrect)?.label === "B",
      );
    }

    if (weightedChoice) {
      const scores = weightedChoice.options
        .map((o) => o.score)
        .sort((a, b) => (a ?? 0) - (b ?? 0));

      assert(
        "TKP memiliki 5 opsi",
        weightedChoice.options.length === 5,
        `didapat ${weightedChoice.options.length}`,
      );
      assert(
        "TKP memiliki skor unik 1-5",
        JSON.stringify(scores) === JSON.stringify([1, 2, 3, 4, 5]),
        `didapat ${JSON.stringify(scores)}`,
      );
      assert(
        "TKP tidak memakai kunci isCorrect",
        weightedChoice.options.every((o) => !o.isCorrect),
      );

      console.log(
        `    Skor TKP per opsi: ${weightedChoice.options
          .map((o) => `${o.label}=${o.score}`)
          .join(", ")}`,
      );
    }
  } catch (err) {
    console.error("Test Error:", err);
    assert(
      "Test berjalan tanpa exception",
      false,
      err instanceof Error ? err.message : String(err),
    );
  } finally {
    // 6. Bersihkan data uji
    console.log("\n4. Membersihkan data uji coba...");
    if (createdQuestionIds.length > 0) {
      await prisma.questionOption
        .deleteMany({ where: { questionId: { in: createdQuestionIds } } })
        .catch(() => {});
      await prisma.question
        .deleteMany({ where: { id: { in: createdQuestionIds } } })
        .catch(() => {});
    }
    if (tempTeacherId) {
      await prisma.user.delete({ where: { id: tempTeacherId } }).catch(() => {});
    }
    if (tempSubjectId) {
      // Topik ikut terhapus karena relasi onDelete: Cascade
      await prisma.subject.delete({ where: { id: tempSubjectId } }).catch(() => {});
    }
  }

  const allPassed = results.every((r) => r.pass);
  console.log(
    `\n=> Hasil Import Excel Tests: ${results.filter((r) => r.pass).length}/${results.length} Pengujian Berhasil.`,
  );
  return allPassed;
}

// Eksekusi langsung jika dipanggil via node/tsx
if (require.main === module || process.argv[1]?.endsWith("test-excel-import-complex.ts")) {
  runExcelImportTests()
    .then((success) => process.exit(success ? 0 : 1))
    .catch((err) => {
      console.error("Terjadi error tak terduga:", err);
      process.exit(1);
    });
}
