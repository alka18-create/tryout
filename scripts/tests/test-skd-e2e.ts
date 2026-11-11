/**
 * =============================================================================
 * END-TO-END TESTS: SKD CASN (SKOR MENTAH + OPSI BERBOBOT/TKP)
 * =============================================================================
 * Cakupan:
 *  - Penyimpanan soal WEIGHTED_CHOICE (TKP) dengan skor opsi 1-5
 *  - Susunan SKD otomatis: TWK 30 (1-30) → TIU 35 (31-65) → TKP 45 (66-110)
 *  - Urutan soal ujian SKD tidak diacak per siswa
 *  - Publikasi SKD wajib tepat 30/35/45 (aturan CASN)
 *  - Sanitasi payload ujian (skor opsi & kunci tidak bocor ke client)
 *  - Penilaian mode RAW (skor mentah, bukan normalisasi 0-100)
 *  - Agregasi skor per subtes (TWK/TIU/TKP) & kelulusan ambang subtes
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

const SKD_TARGET = { TWK: 30, TIU: 35, TKP: 45 } as const;

type CreatedQuestion = Awaited<ReturnType<typeof QuestionBankService.createQuestion>>;

async function createSkdQuestion(
  teacherId: string,
  topicId: string,
  section: SkdSection,
  index: number,
): Promise<CreatedQuestion> {
  if (section === SkdSection.TKP) {
    return QuestionBankService.createQuestion(teacherId, {
      topicId,
      type: QuestionType.WEIGHTED_CHOICE,
      difficulty: DifficultyLevel.MEDIUM,
      content: `[TEMP SKD] Soal TKP #${index}: pilih opsi dengan skor terbaik.`,
      imageUrl: null,
      explanation: `Pembahasan TKP #${index}.`,
      explanationImageUrl: null,
      options: [
        { label: "A", content: `Opsi skor 1 (#${index})`, isCorrect: false, score: 1, imageUrl: null },
        { label: "B", content: `Opsi skor 2 (#${index})`, isCorrect: false, score: 2, imageUrl: null },
        { label: "C", content: `Opsi skor 3 (#${index})`, isCorrect: false, score: 3, imageUrl: null },
        { label: "D", content: `Opsi skor 4 (#${index})`, isCorrect: false, score: 4, imageUrl: null },
        { label: "E", content: `Opsi skor 5 (#${index})`, isCorrect: false, score: 5, imageUrl: null },
      ],
    });
  }

  return QuestionBankService.createQuestion(teacherId, {
    topicId,
    type: QuestionType.SINGLE_CHOICE,
    difficulty: DifficultyLevel.MEDIUM,
    content: `[TEMP SKD] Soal ${section} #${index}: pilih jawaban A.`,
    imageUrl: null,
    explanation: `Pembahasan ${section} #${index}.`,
    explanationImageUrl: null,
    options: [
      { label: "A", content: `Jawaban benar ${section} #${index}`, isCorrect: true, imageUrl: null },
      { label: "B", content: `Pengecoh B ${section} #${index}`, isCorrect: false, imageUrl: null },
      { label: "C", content: `Pengecoh C ${section} #${index}`, isCorrect: false, imageUrl: null },
      { label: "D", content: `Pengecoh D ${section} #${index}`, isCorrect: false, imageUrl: null },
      { label: "E", content: `Pengecoh E ${section} #${index}`, isCorrect: false, imageUrl: null },
    ],
  });
}

export async function runSkdE2ETests(): Promise<boolean> {
  console.log("\n==================================================");
  console.log("▶ [E2E SKD] Alur SKD: Susunan 30/35/45 → Ujian → Skor Mentah → Ambang Subtes");
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
    // 1. Siapkan bank soal SKD lengkap: TWK 30, TIU 35, TKP 45
    console.log("  … menyiapkan 110 soal SKD (30 TWK / 35 TIU / 45 TKP)");
    const twkQuestions: CreatedQuestion[] = [];
    const tiuQuestions: CreatedQuestion[] = [];
    const tkpQuestions: CreatedQuestion[] = [];

    for (let i = 1; i <= SKD_TARGET.TWK; i++) {
      twkQuestions.push(await createSkdQuestion(teacher.id, topic.id, SkdSection.TWK, i));
    }
    for (let i = 1; i <= SKD_TARGET.TIU; i++) {
      tiuQuestions.push(await createSkdQuestion(teacher.id, topic.id, SkdSection.TIU, i));
    }
    for (let i = 1; i <= SKD_TARGET.TKP; i++) {
      tkpQuestions.push(await createSkdQuestion(teacher.id, topic.id, SkdSection.TKP, i));
    }
    questionIds.push(...twkQuestions.map((q) => q.id), ...tiuQuestions.map((q) => q.id), ...tkpQuestions.map((q) => q.id));

    const storedScores = tkpQuestions[0].options
      .map((o) => o.score)
      .sort((a, b) => (a ?? 0) - (b ?? 0));
    assert(
      "Soal TKP tersimpan dengan skor opsi unik 1-5",
      storedScores.join(",") === "1,2,3,4,5",
      storedScores.join(","),
    );

    // Susunan input sengaja diacak (TKP → TIU → TWK) untuk membuktikan server menata ulang.
    const scrambled = [
      ...tkpQuestions.map((q) => ({ q, section: SkdSection.TKP, weight: 1 })),
      ...tiuQuestions.map((q) => ({ q, section: SkdSection.TIU, weight: 5 })),
      ...twkQuestions.map((q) => ({ q, section: SkdSection.TWK, weight: 5 })),
    ].map((item, idx) => ({
      questionId: item.q.id,
      orderNumber: idx + 1,
      weight: item.weight,
      section: item.section,
    }));

    // 2. Tryout SKD mode RAW dengan ambang batas resmi
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
      questions: scrambled,
    });

    // 3. Verifikasi penataan otomatis: TWK 1-30, TIU 31-65, TKP 66-110
    const stored = await prisma.tryoutQuestion.findMany({
      where: { tryoutId: tryout.id },
      orderBy: { orderNumber: "asc" },
      select: { questionId: true, section: true, orderNumber: true },
    });
    const expectedSections = [
      ...Array.from({ length: SKD_TARGET.TWK }, () => SkdSection.TWK),
      ...Array.from({ length: SKD_TARGET.TIU }, () => SkdSection.TIU),
      ...Array.from({ length: SKD_TARGET.TKP }, () => SkdSection.TKP),
    ];
    assert(
      "Susunan soal otomatis: TWK (1-30) → TIU (31-65) → TKP (66-110)",
      stored.map((s) => s.section).join(",") === expectedSections.join(","),
      `${stored.slice(0, 1)[0]?.section} … ${stored.slice(-1)[0]?.section}`,
    );
    assert(
      "Nomor urut soal berurutan 1..110",
      stored.length === 110 && stored.every((s, idx) => s.orderNumber === idx + 1),
      `total=${stored.length}`,
    );
    assert(
      "Urutan relatif dalam satu subtes dipertahankan",
      stored[0].questionId === twkQuestions[0].id &&
        stored[30].questionId === tiuQuestions[0].id &&
        stored[65].questionId === tkpQuestions[0].id,
    );

    await TryoutService.updateTryout(teacher.id, UserRole.TEACHER, tryout.id, {
      status: TryoutStatus.PUBLISHED,
    });
    assert("Paket SKD lengkap 30/35/45 berhasil dipublikasikan", true);

    // 4. Mulai sesi & verifikasi sanitasi payload
    const start = await ExamService.startOrResumeExamSession(student.id, tryout.id);
    const sheet = await ExamService.getSanitizedExamSession(student.id, start.sessionId);

    assert(
      "Lembar ujian tidak membocorkan kunci/skor opsi",
      sheet.questions.every((q) => q.options.every((o) => !("isCorrect" in o) && !("score" in o))),
    );
    assert(
      "Lembar ujian memuat seluruh 110 soal",
      sheet.questions.length === 110,
      String(sheet.questions.length),
    );
    assert(
      "Urutan soal ujian SKD tidak diacak (sesuai paket)",
      sheet.questions.map((q) => q.questionId).join(",") === stored.map((s) => s.questionId).join(","),
    );

    // 4b. Data paket lama: nomor urut tersimpan bercampur antar subtes tetap dinormalkan saat dibaca
    const legacyTryout = await TryoutService.createTryout(teacher.id, {
      title: "[TEMP] Tryout SKD Urutan Lama E2E",
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
    tryoutIds.push(legacyTryout.id);

    const legacyRows = [
      ...tkpQuestions.map((q) => ({ questionId: q.id, section: SkdSection.TKP, weight: 1 })),
      ...tiuQuestions.map((q) => ({ questionId: q.id, section: SkdSection.TIU, weight: 5 })),
      ...twkQuestions.map((q) => ({ questionId: q.id, section: SkdSection.TWK, weight: 5 })),
    ].map((row, idx) => ({
      tryoutId: legacyTryout.id,
      questionId: row.questionId,
      orderNumber: idx + 1,
      weight: row.weight,
      section: row.section,
    }));
    await prisma.tryoutQuestion.createMany({ data: legacyRows });

    const legacyStoredFirst = await prisma.tryoutQuestion.findFirst({
      where: { tryoutId: legacyTryout.id },
      orderBy: { orderNumber: "asc" },
      select: { section: true },
    });
    assert(
      "Data uji lama tersimpan mulai dari TKP (urutan bercampur)",
      legacyStoredFirst?.section === SkdSection.TKP,
    );

    await TryoutService.updateTryout(teacher.id, UserRole.TEACHER, legacyTryout.id, {
      status: TryoutStatus.PUBLISHED,
    });
    const legacyStart = await ExamService.startOrResumeExamSession(student.id, legacyTryout.id);
    const legacySheet = await ExamService.getSanitizedExamSession(student.id, legacyStart.sessionId);
    assert(
      "Paket lama dengan nomor bercampur tetap tampil TWK (1-30) → TIU → TKP",
      legacySheet.questions[0].questionId === twkQuestions[0].id &&
        legacySheet.questions[30].questionId === tiuQuestions[0].id &&
        legacySheet.questions[65].questionId === tkpQuestions[0].id &&
        legacySheet.questions[109].questionId === tkpQuestions[44].id,
      `${legacySheet.questions[0]?.questionId} / ${legacySheet.questions[30]?.questionId}`,
    );

    const twkExam = sheet.questions.find((q) => q.questionId === twkQuestions[0].id)!;
    const tiuExam = sheet.questions.find((q) => q.questionId === tiuQuestions[0].id)!;
    const tkpExam = sheet.questions.find((q) => q.questionId === tkpQuestions[0].id)!;

    // 5. Jawab: TWK benar (5), TIU salah (0), TKP skor 3 (3); sisanya kosong (0)
    await ExamService.saveAnswer(student.id, start.sessionId, {
      questionId: twkExam.questionId,
      selectedOptionId: twkExam.options.find((o) => o.content.startsWith("Jawaban benar"))!.id,
      isFlagged: false,
    });
    await ExamService.saveAnswer(student.id, start.sessionId, {
      questionId: tiuExam.questionId,
      selectedOptionId: tiuExam.options.find((o) => o.content.startsWith("Pengecoh B"))!.id,
      isFlagged: false,
    });
    await ExamService.saveAnswer(student.id, start.sessionId, {
      questionId: tkpExam.questionId,
      selectedOptionId: tkpExam.options.find((o) => o.content === "Opsi skor 3 (#1)")!.id,
      isFlagged: false,
    });

    // 6. Submit & verifikasi skor mentah
    const result = await ExamService.submitExamSession(student.id, start.sessionId, false);

    assert(
      "Skor total mode RAW = 5 + 0 + 3 = 8 (bukan 0-100)",
      result.totalScore === 8,
      String(result.totalScore),
    );
    assert("Kelulusan dihitung dari ambang per subtes (belum memenuhi)", result.isPassed === false);

    const sectionScores = await prisma.examSectionScore.findMany({
      where: { examSessionId: start.sessionId },
    });
    const bySection = new Map(sectionScores.map((s) => [s.section, s]));

    assert(
      "Skor subtes TWK = 5 / 150",
      bySection.get(SkdSection.TWK)?.score === 5 &&
        bySection.get(SkdSection.TWK)?.maxScore === 150,
      JSON.stringify(bySection.get(SkdSection.TWK)),
    );
    assert(
      "Skor subtes TIU = 0 / 175",
      bySection.get(SkdSection.TIU)?.score === 0 &&
        bySection.get(SkdSection.TIU)?.maxScore === 175,
      JSON.stringify(bySection.get(SkdSection.TIU)),
    );
    assert(
      "Skor subtes TKP = 3 / 225",
      bySection.get(SkdSection.TKP)?.score === 3 &&
        bySection.get(SkdSection.TKP)?.maxScore === 225,
      JSON.stringify(bySection.get(SkdSection.TKP)),
    );
    assert(
      "Status kelulusan per subtes tercatat (semua belum lulus)",
      sectionScores.every((s) => s.isPassed === false),
      JSON.stringify(sectionScores.map((s) => ({ section: s.section, isPassed: s.isPassed }))),
    );

    // 7. Pembahasan TKP: skor opsi & status parsial
    const discussion = await ScoringService.getExamSessionDiscussion(student.id, start.sessionId);
    const tkpDiscussion = discussion.questions.find((q) => q.questionId === tkpQuestions[0].id)!;

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
      tkpDiscussion.correctLabel.includes("Skor opsi") && tkpDiscussion.correctLabel.includes("=5"),
      tkpDiscussion.correctLabel,
    );
    assert(
      "Pembahasan SKD memakai urutan yang sama: TWK (1-30) → TIU → TKP",
      discussion.questions[0].questionId === twkQuestions[0].id &&
        discussion.questions[30].questionId === tiuQuestions[0].id &&
        discussion.questions[65].questionId === tkpQuestions[0].id,
    );

    // 8. Tryout kedua: semua jawaban benar => skor maksimum 550 dan LULUS
    const passingTryout = await TryoutService.createTryout(teacher.id, {
      title: "[TEMP] Tryout SKD Lulus E2E",
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
    tryoutIds.push(passingTryout.id);

    await TryoutService.setTryoutQuestions(teacher.id, UserRole.TEACHER, passingTryout.id, {
      questions: [
        ...twkQuestions.map((q, idx) => ({
          questionId: q.id,
          orderNumber: idx + 1,
          weight: 5,
          section: SkdSection.TWK,
        })),
        ...tiuQuestions.map((q, idx) => ({
          questionId: q.id,
          orderNumber: SKD_TARGET.TWK + idx + 1,
          weight: 5,
          section: SkdSection.TIU,
        })),
        ...tkpQuestions.map((q, idx) => ({
          questionId: q.id,
          orderNumber: SKD_TARGET.TWK + SKD_TARGET.TIU + idx + 1,
          weight: 1,
          section: SkdSection.TKP,
        })),
      ],
    });
    await TryoutService.updateTryout(teacher.id, UserRole.TEACHER, passingTryout.id, {
      status: TryoutStatus.PUBLISHED,
    });

    const start2 = await ExamService.startOrResumeExamSession(student.id, passingTryout.id);
    const sheet2 = await ExamService.getSanitizedExamSession(student.id, start2.sessionId);

    const sectionByQuestion = new Map(stored.map((s) => [s.questionId, s.section]));
    for (const examQuestion of sheet2.questions) {
      const section = sectionByQuestion.get(examQuestion.questionId);
      const correctOption =
        section === SkdSection.TKP
          ? examQuestion.options.find((o) => o.content.startsWith("Opsi skor 5"))
          : examQuestion.options.find((o) => o.content.startsWith("Jawaban benar"));
      if (!correctOption) {
        throw new Error(`Opsi jawaban benar tidak ditemukan untuk soal ${examQuestion.questionId}`);
      }
      await ExamService.saveAnswer(student.id, start2.sessionId, {
        questionId: examQuestion.questionId,
        selectedOptionId: correctOption.id,
        isFlagged: false,
      });
    }

    const result2 = await ExamService.submitExamSession(student.id, start2.sessionId, false);
    assert(
      "Skor total semua benar = 550 (TWK 150 + TIU 175 + TKP 225)",
      result2.totalScore === 550,
      String(result2.totalScore),
    );
    assert("Tryout lulus saat seluruh ambang subtes terpenuhi", result2.isPassed === true);

    const sectionScores2 = await prisma.examSectionScore.findMany({
      where: { examSessionId: start2.sessionId },
    });
    const bySection2 = new Map(sectionScores2.map((s) => [s.section, s]));
    assert(
      "Skor maksimum per subtes tercatat 150/175/225",
      bySection2.get(SkdSection.TWK)?.maxScore === 150 &&
        bySection2.get(SkdSection.TIU)?.maxScore === 175 &&
        bySection2.get(SkdSection.TKP)?.maxScore === 225,
    );

    // 9. Publikasi diblokir bila komposisi tidak 30/35/45
    const incompleteTryout = await TryoutService.createTryout(teacher.id, {
      title: "[TEMP] Tryout SKD Tidak Lengkap E2E",
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
    tryoutIds.push(incompleteTryout.id);

    await TryoutService.setTryoutQuestions(teacher.id, UserRole.TEACHER, incompleteTryout.id, {
      questions: [
        { questionId: twkQuestions[0].id, orderNumber: 1, weight: 5, section: SkdSection.TWK },
        { questionId: tiuQuestions[0].id, orderNumber: 2, weight: 5, section: SkdSection.TIU },
        { questionId: tkpQuestions[0].id, orderNumber: 3, weight: 1, section: SkdSection.TKP },
      ],
    });

    let publishError: { code?: string; message?: string } | null = null;
    try {
      await TryoutService.updateTryout(teacher.id, UserRole.TEACHER, incompleteTryout.id, {
        status: TryoutStatus.PUBLISHED,
      });
    } catch (err) {
      publishError = err as { code?: string; message?: string };
    }
    assert(
      "Publikasi SKD diblokir bila komposisi bukan 30/35/45",
      publishError?.code === "VALIDATION_ERROR" &&
        (publishError?.message ?? "").includes("TWK"),
      JSON.stringify(publishError),
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
