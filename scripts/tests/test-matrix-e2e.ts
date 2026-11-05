/**
 * =============================================================================
 * END-TO-END TESTS: SOAL MATRIX (TABEL PERNYATAAN)
 * =============================================================================
 * Cakupan:
 *  - Penyimpanan soal matriks (label baris:kolom, satu kunci per baris)
 *  - Sanitasi opsi pada lembar ujian & urutan baris/kolom
 *  - Penyimpanan jawaban (satu pilihan per baris, penolakan pilihan ganda)
 *  - Penilaian proporsional per baris
 *  - Payload pembahasan (status parsial & kunci per baris)
 *
 * Seluruh data uji dibuat sementara dan dihapus kembali di blok finally.
 */

import { prisma } from "../../src/lib/prisma";
import { QuestionBankService } from "../../src/modules/question-bank/question.service";
import { TryoutService } from "../../src/modules/tryout/tryout.service";
import { ExamService } from "../../src/modules/exam/exam.service";
import { ScoringService } from "../../src/modules/scoring/scoring.service";
import {
  QuestionType,
  DifficultyLevel,
  TryoutStatus,
  DiscussionVisibility,
  ExamSessionStatus,
  UserRole,
} from "../../src/generated/prisma/client";
import { buildMatrixOptions } from "../../src/lib/matrix-question";

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

export async function runMatrixE2ETests(): Promise<boolean> {
  console.log("\n==================================================");
  console.log("▶ [E2E MATRIX] Alur Soal Matriks: Buat → Kerjakan → Nilai → Pembahasan");
  console.log("==================================================");

  const topic = await prisma.topic.findFirst({ include: { subject: true } });
  if (!topic) {
    throw new Error("Fixture topik harus ada di database untuk pengujian matriks!");
  }

  const teacher = await prisma.user.findFirst({
    where: { role: "TEACHER" },
    select: { id: true },
  });
  if (!teacher) {
    throw new Error("Fixture user TEACHER harus ada di database!");
  }

  // Gunakan siswa non-demo bila tersedia; jika tidak, buat sementara.
  const existingStudent = await prisma.user.findFirst({
    where: { role: "STUDENT", NOT: { email: { endsWith: "@tryoutku.com" } } },
    select: { id: true },
  });

  let tempStudentId: string | null = null;
  const student =
    existingStudent ??
    (await prisma.user.create({
      data: {
        name: "Siswa Uji Matriks",
        email: `matrix-e2e-${Date.now()}@example.test`,
        role: "STUDENT",
      },
      select: { id: true },
    }));
  if (!existingStudent) tempStudentId = student.id;

  let questionId: string | null = null;
  let tryoutId: string | null = null;

  try {
    // 1. Simpan soal matriks 3 baris x 2 kolom
    const question = await QuestionBankService.createQuestion(teacher.id, {
      topicId: topic.id,
      type: QuestionType.MATRIX,
      difficulty: DifficultyLevel.MEDIUM,
      content: "Tentukan kesesuaian setiap pernyataan berikut.",
      imageUrl: null,
      explanation: "Pembahasan matriks uji.",
      explanationImageUrl: null,
      options: buildMatrixOptions(
        [
          { statement: "Pernyataan A", correctColumn: "Sesuai" },
          { statement: "Pernyataan B", correctColumn: "Tidak Sesuai" },
          { statement: "Pernyataan C", correctColumn: "Sesuai" },
        ],
        ["Sesuai", "Tidak Sesuai"],
      ),
    });
    questionId = question.id;

    assert("Soal matriks tersimpan dengan 6 opsi (3 baris x 2 kolom)", question.options.length === 6);
    assert(
      "Label opsi tersimpan berurutan sesuai baris & kolom",
      question.options.map((o) => o.label).join("|") ===
        "1:1:Sesuai|1:2:Tidak Sesuai|2:1:Sesuai|2:2:Tidak Sesuai|3:1:Sesuai|3:2:Tidak Sesuai",
      question.options.map((o) => o.label).join("|"),
    );
    assert(
      "Setiap baris matriks memiliki tepat satu kunci benar",
      ["1", "2", "3"].every(
        (row) =>
          question.options.filter((o) => o.label.startsWith(`${row}:`) && o.isCorrect).length === 1,
      ),
    );

    // 2. Tryout yang hanya berisi soal matriks tersebut
    const tryout = await TryoutService.createTryout(teacher.id, {
      title: "[TEMP] Tryout Matriks E2E",
      description: null,
      subjectId: topic.subjectId,
      durationMinutes: 30,
      passingScore: 70,
      maxAttempts: 1,
      questionCount: null,
      status: TryoutStatus.DRAFT,
      discussionVisibility: DiscussionVisibility.AFTER_SUBMIT,
      startDate: null,
      endDate: null,
    });
    tryoutId = tryout.id;

    await TryoutService.setTryoutQuestions(teacher.id, UserRole.TEACHER, tryout.id, {
      questions: [{ questionId: question.id, orderNumber: 1, weight: 1 }],
    });
    await TryoutService.updateTryout(teacher.id, UserRole.TEACHER, tryout.id, {
      status: TryoutStatus.PUBLISHED,
    });

    // 3. Mulai sesi ujian
    const start = await ExamService.startOrResumeExamSession(student.id, tryout.id);
    assert("Sesi ujian berhasil dimulai", Boolean(start.sessionId));
    assert("Sesi merupakan sesi baru (bukan resume)", start.isResumed === false);

    // 4. Lembar ujian: tipe, sanitasi kunci, dan urutan label
    const sheet = await ExamService.getSanitizedExamSession(student.id, start.sessionId);
    const examQuestion = sheet.questions[0];

    assert("Tipe soal pada lembar ujian adalah MATRIX", examQuestion.type === QuestionType.MATRIX);
    assert(
      "Opsi matriks tidak membocorkan kunci jawaban",
      examQuestion.options.every((o) => !("isCorrect" in o)),
    );
    assert(
      "Label opsi matriks sampai ke client apa adanya",
      examQuestion.options[0].label === "1:1:Sesuai",
      examQuestion.options[0].label,
    );

    const byLabel = new Map(examQuestion.options.map((o) => [o.label, o.id]));

    // 5. Jawab: baris 1 benar, baris 2 salah, baris 3 kosong
    await ExamService.saveAnswer(student.id, start.sessionId, {
      questionId: examQuestion.questionId,
      selectedOptionId: byLabel.get("1:1:Sesuai")!,
      selectedOptionIds: [byLabel.get("1:1:Sesuai")!],
      isFlagged: false,
    });
    await ExamService.saveAnswer(student.id, start.sessionId, {
      questionId: examQuestion.questionId,
      selectedOptionId: byLabel.get("2:1:Sesuai")!, // salah: seharusnya "2:2:Tidak Sesuai"
      selectedOptionIds: [byLabel.get("2:1:Sesuai")!, byLabel.get("1:1:Sesuai")!],
      isFlagged: false,
    });

    const savedAnswer = await prisma.examAnswer.findFirst({
      where: { examSessionId: start.sessionId },
      select: { selectedOptionIds: true },
    });
    assert(
      "Satu baris hanya menyimpan satu pilihan (duplikat baris 1 diganti)",
      savedAnswer?.selectedOptionIds.length === 2,
      JSON.stringify(savedAnswer?.selectedOptionIds),
    );

    // 6. Server menolak dua pilihan dalam satu baris
    let rejected = false;
    try {
      await ExamService.saveAnswer(student.id, start.sessionId, {
        questionId: examQuestion.questionId,
        selectedOptionId: byLabel.get("3:1:Sesuai")!,
        selectedOptionIds: [byLabel.get("3:1:Sesuai")!, byLabel.get("3:2:Tidak Sesuai")!],
        isFlagged: false,
      });
    } catch {
      rejected = true;
    }
    assert("Dua pilihan pada satu baris ditolak server", rejected);

    // 7. Submit & nilai: 1 dari 3 baris benar => 33.3
    const result = await ExamService.submitExamSession(student.id, start.sessionId, false);
    assert(
      "Skor matriks proporsional per baris = 33.3",
      result.totalScore === 33.3,
      String(result.totalScore),
    );
    assert("Baris salah dihitung sebagai jawaban salah", result.wrongCount === 1, String(result.wrongCount));

    // 8. Pembahasan: status parsial & kunci per baris
    const discussion = await ScoringService.getExamSessionDiscussion(student.id, start.sessionId);
    const discussionQuestion = discussion.questions[0];

    assert(
      "Status pembahasan soal matriks parsial = PARTIAL",
      discussionQuestion.answerStatus === "PARTIAL",
      discussionQuestion.answerStatus,
    );
    assert(
      "Kunci per baris ditampilkan berurutan",
      discussionQuestion.correctLabel === "1. Sesuai; 2. Tidak Sesuai; 3. Sesuai",
      discussionQuestion.correctLabel,
    );
    assert(
      "Payload pembahasan memuat 6 sel matriks",
      discussionQuestion.options.length === 6,
      String(discussionQuestion.options.length),
    );

    const session = await prisma.examSession.findUnique({
      where: { id: start.sessionId },
      select: { status: true },
    });
    assert("Status sesi akhir SUBMITTED", session?.status === ExamSessionStatus.SUBMITTED);
  } finally {
    // Bersihkan seluruh data uji (urutan: tryout → soal → siswa sementara)
    if (tryoutId) await prisma.tryout.delete({ where: { id: tryoutId } }).catch(() => {});
    if (questionId) await prisma.question.delete({ where: { id: questionId } }).catch(() => {});
    if (tempStudentId) await prisma.user.delete({ where: { id: tempStudentId } }).catch(() => {});
  }

  const allPassed = results.every((r) => r.pass);
  console.log(
    `\n=> Hasil E2E Matrix Tests: ${results.filter((r) => r.pass).length}/${results.length} Pengujian Berhasil.`,
  );
  return allPassed;
}

// Eksekusi langsung jika dipanggil via node/tsx
if (require.main === module || process.argv[1]?.endsWith("test-matrix-e2e.ts")) {
  runMatrixE2ETests()
    .then((success) => process.exit(success ? 0 : 1))
    .catch((err) => {
      console.error("Terjadi error tak terduga:", err);
      process.exit(1);
    });
}
