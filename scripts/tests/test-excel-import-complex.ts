import { prisma } from "../../src/lib/prisma";
import { UserRole, QuestionType } from "../../src/generated/prisma/client";
import { QuestionImportService } from "../../src/modules/question-bank/question-import.service";

async function runTest() {
  console.log("=== MEMULAI TEST INTEGRASI IMPORT EXCEL SEMUA TIPE SOAL ===");

  // 1. Setup Guru untuk testing
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
  }

  // 2. Setup Topik
  let subject = await prisma.subject.findFirst({ include: { topics: true } });
  if (!subject) {
    subject = await prisma.subject.create({
      data: {
        name: "Sosiologi",
        code: "SOS",
        description: "Mata pelajaran uji coba",
      },
      include: { topics: true },
    });
  }

  let topic = subject.topics[0];
  if (!topic) {
    topic = await prisma.topic.create({
      data: {
        name: "Identitas Diri & Sosial",
        subjectId: subject.id,
      },
    });
  }

  // 3. Test Generate Excel Template
  console.log("\n1. Menguji Generate Excel Template...");
  const templateBuffer = await QuestionImportService.generateQuestionExcelTemplate();
  console.log(`✓ Template berhasil digenerate (Ukuran byte: ${templateBuffer.length})`);

  // 4. Test Import Soal Menggunakan Buffer Template Bawaan
  // Template bawaan sudah berisi 3 contoh: Pilihan Ganda, PG Kompleks, dan Benar/Salah
  console.log("\n2. Menguji Import Soal dari Template Excel...");
  const importResult = await QuestionImportService.importQuestionsFromExcel(teacher.id, templateBuffer);

  console.log(`Hasil Import:
  - Total Baris: ${importResult.totalRows}
  - Berhasil: ${importResult.successCount}
  - Gagal: ${importResult.failedCount}`);

  if (importResult.errors.length > 0) {
    console.error("Daftar Error:", importResult.errors);
    throw new Error("Import Excel menghasilkan error!");
  }

  if (importResult.successCount !== 3) {
    throw new Error(`Diharapkan 3 soal berhasil diimpor, didapat: ${importResult.successCount}`);
  }

  // 5. Verifikasi Integritas Soal di Database
  console.log("\n3. Memverifikasi Tipe & Opsi Soal di Database...");
  const importedQuestions = await prisma.question.findMany({
    where: { createdById: teacher.id },
    include: { options: true },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  const singleChoice = importedQuestions.find((q) => q.type === QuestionType.SINGLE_CHOICE);
  const multipleChoice = importedQuestions.find((q) => q.type === QuestionType.MULTIPLE_CHOICE);
  const trueFalse = importedQuestions.find((q) => q.type === QuestionType.TRUE_FALSE);

  if (!singleChoice) throw new Error("Soal SINGLE_CHOICE tidak ditemukan!");
  if (!multipleChoice) throw new Error("Soal MULTIPLE_CHOICE tidak ditemukan!");
  if (!trueFalse) throw new Error("Soal TRUE_FALSE tidak ditemukan!");

  console.log(`✓ SINGLE_CHOICE: ${singleChoice.options.length} opsi, Kunci benar: ${singleChoice.options.filter(o => o.isCorrect).map(o => o.label).join(", ")}`);
  console.log(`✓ MULTIPLE_CHOICE: ${multipleChoice.options.length} opsi, Kunci benar: ${multipleChoice.options.filter(o => o.isCorrect).map(o => o.label).join(", ")}`);
  console.log(`✓ TRUE_FALSE: ${trueFalse.options.length} opsi, Kunci benar: ${trueFalse.options.filter(o => o.isCorrect).map(o => o.label).join(", ")}`);

  // Assertions
  if (singleChoice.options.length !== 5 || singleChoice.options.filter(o => o.isCorrect).length !== 1) {
    throw new Error("Opsi Single Choice tidak sesuai spesifikasi!");
  }

  const mcCorrectKeys = multipleChoice.options.filter(o => o.isCorrect).map(o => o.label).sort().join(",");
  if (multipleChoice.options.length !== 4 || mcCorrectKeys !== "A,B,D") {
    throw new Error(`Opsi PG Kompleks tidak sesuai spesifikasi! Didapat kunci: ${mcCorrectKeys}`);
  }

  const tfCorrectKey = trueFalse.options.find(o => o.isCorrect)?.label;
  if (trueFalse.options.length !== 2 || tfCorrectKey !== "B") {
    throw new Error("Opsi Benar/Salah tidak sesuai spesifikasi!");
  }

  // 6. Cleanup Data Test
  console.log("\n4. Membersihkan data uji coba...");
  const questionIds = importedQuestions.map((q) => q.id);
  await prisma.questionOption.deleteMany({ where: { questionId: { in: questionIds } } });
  await prisma.question.deleteMany({ where: { id: { in: questionIds } } });

  console.log("=== SEMUA TEST IMPORT EXCEL BERHASIL DILALUI DENGAN SUKSES! ===\n");
}

runTest()
  .catch((e) => {
    console.error("Test Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
