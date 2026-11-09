/**
 * =============================================================================
 * END-TO-END TESTS: SKD CASN (SKOR MENTAH + OPSI BERBOBOT/TKP)
 * =============================================================================
 * Cakupan:
 *  - Penyimpanan soal WEIGHTED_CHOICE (TKP) dengan skor opsi 1-5
 *  - Sanitasi payload ujian (skor opsi & kunci tidak bocor ke client)
 *  - Penilaian mode RAW (skor mentah, bukan normalisasi 0-100)
 *  - Agregasi skor per subtes (TWK/TIU/TKP)
 *  - Kelulusan berdasarkan ambang batas per subtes
 *  - Pembahasan TKP menampilkan skor tiap opsi & status parsial
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
  ScoringMode,
  SkdSection,
} from "../../src/generated/prisma/client";

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

export async function runSkdE2ETests(): Promise<boolean> {
  console.log("\n==================================================");
  console.log("▶ [E2E SKD] Alur SKD: Soal TKP → Ujian → Skor Mentah → Ambang Subtes");
  console.log("==================================================");

  const topic = await prisma.topic.findFirst({ include: { subject: true } });
  if (!topic) {
    throw new Error("Fixture topik harus ada di database untuk pengujian SKD!");
  }

  const teacher = await prisma.user.findFirst({
    where: { role: "TEACHER" },
    select: { id: true },
  });
  if (!teacher) {
    throw new Error("Fixture user TEACHER harus ada di database!");
  }

  const existingStudent = await prisma.user.findFirst({
    where: { role: "STUDENT", NOT: { email: { endsWith: "@tryoutku.com" } } },
    select: { id: true },
  });

  let tempStudentId: string | null = null;
  const student =
    existingStudent ??
    (await prisma.user.create({
      data: {
        name: "Siswa Uji SKD",
        email: `skd-e2e-${Date.now()}@example.test`,
        role: "STUDENT",
      },
      select: { id: true },
    }));
  if (!existingStudent) tempStudentId = student.id;

  const questionIds: string[] = [];
  const tryoutIds: string[] = [];

  try {
    // 1. Soal TWK (pilihan ganda, kunci A)
    const twkQuestion = await QuestionBankService.createQuestion(teacher.id, {
      topicId: topic.id,
      type: QuestionType.SINGLE_CHOICE,
      difficulty: DifficultyLevel.MEDIUM,
      content: "Soal TWK uji: pilih jawaban A.",
      imageUrl: null,
      explanation: "Pembahasan TWK.",
      explanationImageUrl: null,
      options: [
        { label: "A", content: "Jawaban benar TWK", isCorrect: true, imageUrl: null },
        { label: "B", content: "Jawaban salah TWK", isCorrect: false, imageUrl: null },
        { label: "C", content: "Pengecoh C", isCorrect: false, imageUrl: null },
        { label: "D", content: "Pengecoh D", isCorrect: false, imageUrl: null },
        { label: "E", content: "Pengecoh E", isCorrect: false, imageUrl: null },
      ],
    });
    questionIds.push(twkQuestion.id);

    // 2. Soal TIU (pilihan ganda, kunci A)
    const tiuQuestion = await QuestionBankService.createQuestion(teacher.id, {
      topicId: topic.id,
      type: QuestionType.SINGLE_CHOICE,
      difficulty: DifficultyLevel.MEDIUM,
      content: "Soal TIU uji: pilih jawaban A.",
      imageUrl: null,
      explanation: "Pembahasan TIU.",
      explanationImageUrl: null,
      options: [
        { label: "A", content: "Jawaban benar TIU", isCorrect: true, imageUrl: null },
        { label: "B", content: "Jawaban salah TIU", isCorrect: false, imageUrl: null },
        { label: "C", content: "Pengecoh C", isCorrect: false, imageUrl: null },
        { label: "D", content: "Pengecoh D", isCorrect: false, imageUrl: null },
        { label: "E", content: "Pengecoh E", isCorrect: false, imageUrl: null },
      ],
    });
    questionIds.push(tiuQuestion.id);

    // 3. Soal TKP (opsi berbobot, skor 1-5)
    const tkpQuestion = await QuestionBankService.createQuestion(teacher.id, {
      topicId: topic.id,
      type: QuestionType.WEIGHTED_CHOICE,
      difficulty: DifficultyLevel.MEDIUM,
      content: "Soal TKP uji: pilih opsi dengan skor terbaik.",
      imageUrl: null,
      explanation: "Pembahasan TKP.",
      explanationImageUrl: null,
      options: [
        { label: "A", content: "Opsi skor 1", isCorrect: false, score: 1, imageUrl: null },
        { label: "B", content: "Opsi skor 2", isCorrect: false, score: 2, imageUrl: null },
        { label: "C", content: "Opsi skor 3", isCorrect: false, score: 3, imageUrl: null },
        { label: "D", content: "Opsi skor 4", isCorrect: false, score: 4, imageUrl: null },
        { label: "E", content: "Opsi skor 5", isCorrect: false, score: 5, imageUrl: null },
      ],
    });
    questionIds.push(tkpQuestion.id);

    const storedScores = tkpQuestion.options
      .map((o) => o.score)
      .sort((a, b) => (a ?? 0) - (b ?? 0));
    assert(
      "Soal TKP tersimpan dengan skor opsi unik 1-5",
      storedScores.join(",") === "1,2,3,4,5",
      storedScores.join(","),
    );

    // 4. Tryout SKD mode RAW dengan ambang batas resmi
    const tryout = await TryoutService.createTryout(teacher.id, {
      title: "[TEMP] Tryout SKD E2E",
      description: null,
      subjectId: topic.subjectId,
      durationMinutes: 100,
      passingScore: 75,
      scoringMode: ScoringMode.RAW,
      passingTwk: 65,
      passingTiu: 80,
      passingTkp: 166,
      maxAttempts: 1,
      questionCount: null,
      status: TryoutStatus.DRAFT,
      discussionVisibility: DiscussionVisibility.AFTER_SUBMIT,
      startDate: null,
      endDate: null,
    });
    tryoutIds.push(tryout.id);

    await TryoutService.setTryoutQuestions(teacher.id, UserRole.TEACHER, tryout.id, {
      questions: [
        { questionId: twkQuestion.id, orderNumber: 1, weight: 5, section: SkdSection.TWK },
        { questionId: tiuQuestion.id, orderNumber: 2, weight: 5, section: SkdSection.TIU },
        { questionId: tkpQuestion.id, orderNumber: 3, weight: 1, section: SkdSection.TKP },
      ],
    });
    await TryoutService.updateTryout(teacher.id, UserRole.TEACHER, tryout.id, {
      status: TryoutStatus.PUBLISHED,
    });

    // 5. Mulai sesi & verifikasi sanitasi payload
    const start = await ExamService.startOrResumeExamSession(student.id, tryout.id);
    const sheet = await ExamService.getSanitizedExamSession(student.id, start.sessionId);

    assert(
      "Lembar ujian tidak membocorkan kunci/skor opsi",
      sheet.questions.every((q) =>
        q.options.every((o) => !("isCorrect" in o) && !("score" in o)),
      ),
    );

    const twkExam = sheet.questions.find((q) => q.questionId === twkQuestion.id)!;
    const tiuExam = sheet.questions.find((q) => q.questionId === tiuQuestion.id)!;
    const tkpExam = sheet.questions.find((q) => q.questionId === tkpQuestion.id)!;

    // 6. Jawab: TWK benar (5), TIU salah (0), TKP skor 3 (3)
    const twkCorrectId = twkExam.options.find((o) => o.content === "Jawaban benar TWK")!.id;
    const tiuWrongId = tiuExam.options.find((o) => o.content === "Jawaban salah TIU")!.id;
    const tkpScore3Id = tkpExam.options.find((o) => o.content === "Opsi skor 3")!.id;

    await ExamService.saveAnswer(student.id, start.sessionId, {
      questionId: twkExam.questionId,
      selectedOptionId: twkCorrectId,
      isFlagged: false,
    });
    await ExamService.saveAnswer(student.id, start.sessionId, {
      questionId: tiuExam.questionId,
      selectedOptionId: tiuWrongId,
      isFlagged: false,
    });
    await ExamService.saveAnswer(student.id, start.sessionId, {
      questionId: tkpExam.questionId,
      selectedOptionId: tkpScore3Id,
      isFlagged: false,
    });

    // 7. Submit & verifikasi skor mentah
    const result = await ExamService.submitExamSession(student.id, start.sessionId, false);

    assert(
      "Skor total mode RAW = 5 + 0 + 3 = 8 (bukan 0-100)",
      result.totalScore === 8,
      String(result.totalScore),
    );
    assert(
      "Kelulusan dihitung dari ambang per subtes (belum memenuhi)",
      result.isPassed === false,
    );

    const sectionScores = await prisma.examSectionScore.findMany({
      where: { examSessionId: start.sessionId },
    });
    const bySection = new Map(sectionScores.map((s) => [s.section, s]));

    assert(
      "Skor subtes TWK tersimpan = 5 / 5",
      bySection.get(SkdSection.TWK)?.score === 5 &&
        bySection.get(SkdSection.TWK)?.maxScore === 5,
      JSON.stringify(bySection.get(SkdSection.TWK)),
    );
    assert(
      "Skor subtes TIU tersimpan = 0 / 5",
      bySection.get(SkdSection.TIU)?.score === 0 &&
        bySection.get(SkdSection.TIU)?.maxScore === 5,
      JSON.stringify(bySection.get(SkdSection.TIU)),
    );
    assert(
      "Skor subtes TKP tersimpan = 3 / 5",
      bySection.get(SkdSection.TKP)?.score === 3 &&
        bySection.get(SkdSection.TKP)?.maxScore === 5,
      JSON.stringify(bySection.get(SkdSection.TKP)),
    );
    assert(
      "Status kelulusan per subtes tercatat (semua belum lulus)",
      sectionScores.every((s) => s.isPassed === false),
      JSON.stringify(sectionScores.map((s) => ({ section: s.section, isPassed: s.isPassed }))),
    );

    // 8. Pembahasan TKP: skor opsi & status parsial
    const discussion = await ScoringService.getExamSessionDiscussion(student.id, start.sessionId);
    const tkpDiscussion = discussion.questions.find((q) => q.questionId === tkpQuestion.id)!;

    assert(
      "Pembahasan TKP memuat skor tiap opsi",
      tkpDiscussion.options.every((o) => typeof o.score === "number"),
    );
    assert(
      "Jawaban TKP skor 3 berstatus PARTIAL",
      tkpDiscussion.answerStatus === "PARTIAL",
      tkpDiscussion.answerStatus,
    );
    assert(
      "Label kunci TKP menampilkan skor opsi",
      tkpDiscussion.correctLabel.includes("Skor opsi") &&
        tkpDiscussion.correctLabel.includes("=5"),
      tkpDiscussion.correctLabel,
    );

    // 9. Tryout kedua dengan ambang rendah: semua terpenuhi => LULUS
    const passingTryout = await TryoutService.createTryout(teacher.id, {
      title: "[TEMP] Tryout SKD Lulus E2E",
      description: null,
      subjectId: topic.subjectId,
      durationMinutes: 100,
      passingScore: 75,
      scoringMode: ScoringMode.RAW,
      passingTwk: 5,
      passingTiu: 0,
      passingTkp: 3,
      maxAttempts: 1,
      questionCount: null,
      status: TryoutStatus.DRAFT,
      discussionVisibility: DiscussionVisibility.AFTER_SUBMIT,
      startDate: null,
      endDate: null,
    });
    tryoutIds.push(passingTryout.id);

    await TryoutService.setTryoutQuestions(teacher.id, UserRole.TEACHER, passingTryout.id, {
      questions: [
        { questionId: twkQuestion.id, orderNumber: 1, weight: 5, section: SkdSection.TWK },
        { questionId: tiuQuestion.id, orderNumber: 2, weight: 5, section: SkdSection.TIU },
        { questionId: tkpQuestion.id, orderNumber: 3, weight: 1, section: SkdSection.TKP },
      ],
    });
    await TryoutService.updateTryout(teacher.id, UserRole.TEACHER, passingTryout.id, {
      status: TryoutStatus.PUBLISHED,
    });

    const start2 = await ExamService.startOrResumeExamSession(student.id, passingTryout.id);
    const sheet2 = await ExamService.getSanitizedExamSession(student.id, start2.sessionId);

    const twk2 = sheet2.questions.find((q) => q.questionId === twkQuestion.id)!;
    const tiu2 = sheet2.questions.find((q) => q.questionId === tiuQuestion.id)!;
    const tkp2 = sheet2.questions.find((q) => q.questionId === tkpQuestion.id)!;

    await ExamService.saveAnswer(student.id, start2.sessionId, {
      questionId: twk2.questionId,
      selectedOptionId: twk2.options.find((o) => o.content === "Jawaban benar TWK")!.id,
      isFlagged: false,
    });
    await ExamService.saveAnswer(student.id, start2.sessionId, {
      questionId: tiu2.questionId,
      selectedOptionId: tiu2.options.find((o) => o.content === "Jawaban benar TIU")!.id,
      isFlagged: false,
    });
    await ExamService.saveAnswer(student.id, start2.sessionId, {
      questionId: tkp2.questionId,
      selectedOptionId: tkp2.options.find((o) => o.content === "Opsi skor 5")!.id,
      isFlagged: false,
    });

    const result2 = await ExamService.submitExamSession(student.id, start2.sessionId, false);
    assert(
      "Skor total percobaan kedua = 15 (5 + 5 + 5)",
      result2.totalScore === 15,
      String(result2.totalScore),
    );
    assert(
      "Tryout lulus saat seluruh ambang subtes terpenuhi",
      result2.isPassed === true,
    );

    const session = await prisma.examSession.findUnique({
      where: { id: start.sessionId },
      select: { status: true },
    });
    assert("Status sesi akhir SUBMITTED", session?.status === ExamSessionStatus.SUBMITTED);
  } finally {
    // Bersihkan seluruh data uji (urutan: tryout → soal → siswa sementara)
    for (const id of tryoutIds) {
      await prisma.tryout.delete({ where: { id } }).catch(() => {});
    }
    for (const id of questionIds) {
      await prisma.question.delete({ where: { id } }).catch(() => {});
    }
    if (tempStudentId) {
      await prisma.user.delete({ where: { id: tempStudentId } }).catch(() => {});
    }
  }

  const allPassed = results.every((r) => r.pass);
  console.log(
    `\n=> Hasil E2E SKD Tests: ${results.filter((r) => r.pass).length}/${results.length} Pengujian Berhasil.`,
  );
  return allPassed;
}

// Eksekusi langsung jika dipanggil via node/tsx
if (require.main === module || process.argv[1]?.endsWith("test-skd-e2e.ts")) {
  runSkdE2ETests()
    .then((success) => process.exit(success ? 0 : 1))
    .catch((err) => {
      console.error("Terjadi error tak terduga:", err);
      process.exit(1);
    });
}
