/**
 * =============================================================================
 * INTEGRATION & RBAC TESTS: COMPLETE LIFECYCLE, ROLE GUARDS & EDGE CASES
 * =============================================================================
 */

import { prisma } from "../../src/lib/prisma";
import { ExamService } from "../../src/modules/exam/exam.service";
import { ScoringService } from "../../src/modules/scoring/scoring.service";
import { AnalyticsService } from "../../src/modules/analytics/analytics.service";
import { AppError } from "../../src/lib/errors";

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

export async function runIntegrationRbacTests(): Promise<boolean> {
  console.log("\n==================================================");
  console.log("▶ [INTEGRATION & RBAC] Alur Ujian, Role Guards & Edge Cases");
  console.log("==================================================");

  // 1. Dapatkan user fixture dari database
  const student = await prisma.user.findFirst({ where: { role: "STUDENT" } });
  const teacher = await prisma.user.findFirst({ where: { role: "TEACHER" } });
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });

  if (!student || !teacher || !admin) {
    throw new Error("Fixture user (STUDENT, TEACHER, ADMIN) harus ada di database!");
  }

  // Buat siswa pengujian kedua untuk uji isolasi kepemilikan sesi
  let studentB = await prisma.user.findUnique({ where: { email: "student_b_test@tryoutku.com" } });
  if (!studentB) {
    studentB = await prisma.user.create({
      data: {
        name: "Siswa Pengujian B",
        email: "student_b_test@tryoutku.com",
        role: "STUDENT",
      },
    });
  }

  // Ambil tryout yang sudah published
  let tryout = await prisma.tryout.findFirst({
    where: {
      status: "PUBLISHED",
      tryoutQuestions: { some: {} },
    },
    include: {
      tryoutQuestions: {
        include: {
          question: {
            include: { options: true },
          },
        },
        orderBy: { orderNumber: "asc" },
      },
    },
  });

  if (!tryout) {
    throw new Error("Tidak ada tryout berstatus PUBLISHED dengan soal di database!");
  }

  console.log(`\n[Info] Menggunakan Tryout: "${tryout.title}" (ID: ${tryout.id}, ${tryout.tryoutQuestions.length} Soal)`);

  // Bersihkan sesi lama dari studentB pada tryout ini agar test reproducible
  await prisma.examSession.deleteMany({
    where: {
      userId: studentB.id,
      tryoutId: tryout.id,
    },
  });

  // ---------------------------------------------------------------------------
  // 1. INTEGRATION: Alur Lengkap Start -> Autosave -> Submit -> Result
  // ---------------------------------------------------------------------------
  console.log("\n[1] Menguji Alur Lengkap Pengerjaan Ujian (Siswa B)...");

  // Step 1: Start Sesi Baru
  const session = await ExamService.startOrResumeExamSession(studentB.id, tryout.id);
  assert("Memulai sesi baru mengembalikan sessionId valid", Boolean(session.sessionId));
  assert("Sisa durasi terhitung positif", session.remainingSeconds > 0);
  assert("Sesi baru bukan hasil resume (isResumed = false)", session.isResumed === false);

  // Step 2: Idempotent Resume (memulai lagi saat masih IN_PROGRESS)
  const resumedSession = await ExamService.startOrResumeExamSession(studentB.id, tryout.id);
  assert("Start ulang mengembalikan sesi aktif yang sama (Idempotent Resume)", resumedSession.sessionId === session.sessionId);
  assert("Sesi resume terdeteksi isResumed = true", resumedSession.isResumed === true);

  // Step 3: Sanitasi Payload saat Sesi Aktif
  const sanitized = await ExamService.getSanitizedExamSession(studentB.id, session.sessionId);
  assert(
    "Sanitasi lembar ujian: tidak membocorkan isCorrect di opsi jawaban",
    sanitized.questions.every((q) => q.options.every((opt) => !("isCorrect" in opt))),
  );
  assert(
    "Sanitasi lembar ujian: tidak menyertakan explanation",
    sanitized.questions.every((q) => !("explanation" in q)),
  );

  // Step 4: Menjawab Soal & Autosave
  const firstQuestion = tryout.tryoutQuestions[0].question;
  const correctOption = firstQuestion.options.find((o) => o.isCorrect);
  if (correctOption) {
    const saveResult = await ExamService.saveAnswer(studentB.id, session.sessionId, {
      questionId: firstQuestion.id,
      selectedOptionId: correctOption.id,
      isFlagged: false,
    });
    assert("Autosave jawaban berhasil disimpan", Boolean(saveResult.savedAt));
  }

  // Tandai ragu-ragu pada soal kedua jika ada
  if (tryout.tryoutQuestions.length > 1) {
    const secondQuestion = tryout.tryoutQuestions[1].question;
    const anyOption = secondQuestion.options[0];
    await ExamService.saveAnswer(studentB.id, session.sessionId, {
      questionId: secondQuestion.id,
      selectedOptionId: anyOption?.id,
      isFlagged: true,
    });
    const checkAnswers = await prisma.examAnswer.findFirst({
      where: { examSessionId: session.sessionId, questionId: secondQuestion.id },
    });
    assert("Tanda ragu-ragu (isFlagged) tersimpan dengan benar", checkAnswers?.isFlagged === true);
  }

  // Step 5: Submit Ujian
  const submitResult = await ExamService.submitExamSession(studentB.id, session.sessionId);
  assert("Submit ujian mengubah status menjadi SUBMITTED", submitResult.status === "SUBMITTED");
  assert("Skor akhir terhitung non-negatif", submitResult.totalScore >= 0);

  // Step 6: Idempotent Submit (mencegah submit ganda / duplikasi perhitungan)
  const doubleSubmit = await ExamService.submitExamSession(studentB.id, session.sessionId);
  assert("Submit ganda aman (idempotent) tanpa melempar error", doubleSubmit.sessionId === session.sessionId);

  // Step 7: Topic Mastery & Result Verification
  const examResult = await ScoringService.getExamSessionResult(studentB.id, session.sessionId);
  assert("Hasil ujian memuat ringkasan benar/salah/kosong", typeof examResult.correctCount === "number");
  assert("Hasil ujian memuat analisis penguasaan materi (Topic Mastery)", Array.isArray(examResult.topicMastery));

  // ---------------------------------------------------------------------------
  // 2. EDGE CASES: Multi-Attempts (Maks 3x), Seleksi Nilai Tertinggi & Expired Guard
  // ---------------------------------------------------------------------------
  console.log("\n[2] Menguji Batas 3x Percobaan Tryout & Pemilihan Nilai Tertinggi...");

  // Siswa B telah menyelesaikan attempt 1.
  // Uji Percobaan ke-2
  const session2 = await ExamService.startOrResumeExamSession(studentB.id, tryout.id);
  assert("Siswa dapat memulai percobaan ke-2", Boolean(session2.sessionId));
  assert("Percobaan ke-2 memiliki attemptNumber = 2", session2.attemptNumber === 2);
  const submitResult2 = await ExamService.submitExamSession(studentB.id, session2.sessionId);
  assert("Percobaan ke-2 berhasil disubmit", submitResult2.status === "SUBMITTED");

  // Uji Percobaan ke-3
  const session3 = await ExamService.startOrResumeExamSession(studentB.id, tryout.id);
  assert("Siswa dapat memulai percobaan ke-3", Boolean(session3.sessionId));
  assert("Percobaan ke-3 memiliki attemptNumber = 3", session3.attemptNumber === 3);
  const submitResult3 = await ExamService.submitExamSession(studentB.id, session3.sessionId);
  assert("Percobaan ke-3 berhasil disubmit", submitResult3.status === "SUBMITTED");

  // Uji Percobaan ke-4 (Harus diblokir karena batas 3x tercapai)
  try {
    await ExamService.startOrResumeExamSession(studentB.id, tryout.id);
    assert("Percobaan ke-4 diblokir", false, "Harusnya melempar EXAM_ALREADY_SUBMITTED");
  } catch (err: any) {
    assert(
      "Mencoba retake ke-4 ditolak dengan EXAM_ALREADY_SUBMITTED",
      err.code === "EXAM_ALREADY_SUBMITTED",
    );
  }

  // Verifikasi evaluasi nilai tertinggi pada detail siswa
  const detail = await ExamService.getTryoutDetailForStudent(studentB.id, tryout.id);
  assert("Detail tryout mencatat total 3x percobaan", detail.attemptsUsed === 3);
  assert("Detail tryout mencatat sisa 0 percobaan", detail.attemptsRemaining === 0);
  assert("Detail tryout mencatat canRetake = false", detail.canRetake === false);
  const maxScore = Math.max(submitResult.totalScore, submitResult2.totalScore, submitResult3.totalScore);
  assert("Detail tryout mengambil skor tertinggi dari seluruh percobaan", detail.highestScore === maxScore);

  // Verifikasi Laporan Guru: mencatat siswa dengan skor tertinggi & total 3x percobaan
  const report = await AnalyticsService.getTryoutReport(tryout.id, teacher.id, teacher.role);
  const participantB = report.participants.find((p: any) => p.userId === studentB.id);
  assert("Laporan guru menampilkan skor tertinggi siswa", participantB?.totalScore === maxScore);
  assert("Laporan guru mencatat total percobaan = 3", participantB?.totalAttempts === 3);

  // Edge Case B: Sesi yang telah lewat batas waktu (Expired) ditolak saat menjawab
  // Buat sesi uji expired buatan
  const expiredSession = await prisma.examSession.create({
    data: {
      userId: studentB.id,
      tryoutId: tryout.id,
      status: "IN_PROGRESS",
      startedAt: new Date(Date.now() - 4000 * 1000),
      expiresAt: new Date(Date.now() - 3600 * 1000), // Kedaluwarsa 1 jam lalu
    },
  });

  try {
    await ExamService.saveAnswer(studentB.id, expiredSession.id, {
      questionId: firstQuestion.id,
      selectedOptionId: null,
      isFlagged: false,
    });
    assert("Menjawab setelah waktu habis ditolak", false, "Harusnya melempar EXAM_SESSION_EXPIRED");
  } catch (err: any) {
    assert(
      "Menjawab setelah waktu habis + grace period ditolak dengan EXAM_SESSION_EXPIRED",
      err.code === "EXAM_SESSION_EXPIRED",
    );
  } finally {
    // Bersihkan sesi expired uji
    await prisma.examAnswer.deleteMany({ where: { examSessionId: expiredSession.id } });
    await prisma.examSession.delete({ where: { id: expiredSession.id } });
  }

  // ---------------------------------------------------------------------------
  // 3. RBAC & DATA ISOLATION: Hak Akses Antar-User & Kepemilikan Sesi
  // ---------------------------------------------------------------------------
  console.log("\n[3] Menguji Isolasi Data & Kepemilikan Sesi Antar-Peserta...");

  // Siswa A mencoba mengambil data lembar ujian milik Siswa B
  try {
    await ExamService.getSanitizedExamSession(student.id, session.sessionId);
    assert("Siswa A tidak boleh mengakses sesi ujian milik Siswa B", false, "Harusnya melempar FORBIDDEN / NOT_FOUND");
  } catch (err: any) {
    assert(
      "Akses sesi siswa lain diblokir dengan FORBIDDEN",
      err.code === "FORBIDDEN" || err.code === "NOT_FOUND",
    );
  }

  // Siswa A mencoba meng-autosave jawaban sesi Siswa B
  try {
    await ExamService.saveAnswer(student.id, session.sessionId, {
      questionId: firstQuestion.id,
      selectedOptionId: null,
      isFlagged: false,
    });
    assert("Siswa A tidak boleh menyimpan jawaban sesi Siswa B", false, "Harusnya diblokir");
  } catch (err: any) {
    assert(
      "Simpan jawaban ke sesi siswa lain diblokir dengan FORBIDDEN",
      err.code === "FORBIDDEN" || err.code === "NOT_FOUND",
    );
  }

  // Bersihkan data seluruh sesi siswa B setelah pengujian selesai
  const studentBSessions = await prisma.examSession.findMany({ where: { userId: studentB.id } });
  for (const s of studentBSessions) {
    await prisma.examTopicScore.deleteMany({ where: { examSessionId: s.id } });
    await prisma.examAnswer.deleteMany({ where: { examSessionId: s.id } });
    await prisma.examSession.delete({ where: { id: s.id } });
  }
  await prisma.user.delete({ where: { id: studentB.id } });

  const allPassed = results.every((r) => r.pass);
  console.log(`\n=> Hasil Integration & RBAC Tests: ${results.filter((r) => r.pass).length}/${results.length} Pengujian Berhasil.`);
  return allPassed;
}

// Eksekusi langsung jika dipanggil via node/tsx
if (require.main === module || process.argv[1]?.endsWith("test-integration-rbac.ts")) {
  runIntegrationRbacTests()
    .then((success) => process.exit(success ? 0 : 1))
    .catch((err) => {
      console.error("Terjadi error tak terduga:", err);
      process.exit(1);
    });
}
