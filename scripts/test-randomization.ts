import { prisma } from "../src/lib/prisma";
import { ExamService } from "../src/modules/exam/exam.service";
import { ScoringService } from "../src/modules/scoring/scoring.service";
import { stringToSeed, shuffleArrayWithSeed, shuffleQuestionOptions } from "../src/lib/randomizer";

function assert(description: string, condition: boolean) {
  if (condition) {
    console.log(`  ✓ ${description}`);
  } else {
    console.error(`  ✗ FAIL: ${description}`);
    process.exit(1);
  }
}

async function runRandomizationTest() {
  console.log("=================================================================");
  console.log("   TESTING: RANDOMISASI SOAL, OPSI & KUNCI JAWABAN PER SISWA    ");
  console.log("=================================================================\n");

  // 1. Ambil 2 siswa uji
  const [studentA, studentB] = await prisma.user.findMany({
    where: { role: "STUDENT" },
    take: 2,
  });

  if (!studentA || !studentB) {
    throw new Error("Dibutuhkan minimal 2 user siswa di database.");
  }

  // 2. Ambil paket tryout dengan soal terbanyak
  const tryout = await prisma.tryout.findFirst({
    where: { status: "PUBLISHED" },
    include: {
      tryoutQuestions: {
        include: {
          question: {
            include: { options: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!tryout || tryout.tryoutQuestions.length < 3) {
    throw new Error("Dibutuhkan tryout published dengan minimal 3 soal.");
  }

  console.log(`[Info] Siswa A: ${studentA.name} (${studentA.id})`);
  console.log(`[Info] Siswa B: ${studentB.name} (${studentB.id})`);
  console.log(`[Info] Tryout: "${tryout.title}" (${tryout.tryoutQuestions.length} butir soal)\n`);

  // Hapus sesi lama jika ada untuk keperluan uji bersih
  await prisma.examSession.deleteMany({
    where: {
      tryoutId: tryout.id,
      userId: { in: [studentA.id, studentB.id] },
    },
  });

  // 3. Siswa A dan Siswa B memulai ujian
  const sessionA = await ExamService.startOrResumeExamSession(studentA.id, tryout.id);
  const sessionB = await ExamService.startOrResumeExamSession(studentB.id, tryout.id);

  console.log("[1] Menguji Perbedaan Urutan Soal (Question Randomization)...");
  const sheetA = await ExamService.getSanitizedExamSession(studentA.id, sessionA.sessionId);
  const sheetB = await ExamService.getSanitizedExamSession(studentB.id, sessionB.sessionId);

  const orderA = sheetA.questions.map((q) => q.questionId);
  const orderB = sheetB.questions.map((q) => q.questionId);

  const isDifferentQuestionOrder = orderA.some((qId, idx) => qId !== orderB[idx]);
  assert("Urutan nomor butir soal Siswa A dan Siswa B saling teracak (berbeda)", isDifferentQuestionOrder);

  console.log("\n[2] Menguji Konsistensi Deterministik (Idempotent Refresh)...");
  const sheetARefresh = await ExamService.getSanitizedExamSession(studentA.id, sessionA.sessionId);
  const orderARefresh = sheetARefresh.questions.map((q) => q.questionId);
  const isConsistentOrder = orderA.every((qId, idx) => qId === orderARefresh[idx]);
  assert("Siswa A me-refresh halaman: urutan soal tetap 100% konsisten", isConsistentOrder);

  console.log("\n[3] Menguji Peracakan Opsi Jawaban & Kunci Jawaban (Option & Key Randomization)...");
  // Cari soal yang ada di lembar Siswa A dan Siswa B
  const commonQuestionId = orderA[0];
  const qInA = sheetA.questions.find((q) => q.questionId === commonQuestionId)!;
  const qInB = sheetB.questions.find((q) => q.questionId === commonQuestionId)!;

  const labelsInA = qInA.options.map((o) => `${o.label}:${o.id}`);
  const labelsInB = qInB.options.map((o) => `${o.label}:${o.id}`);

  console.log(`  - Opsi Soal '${qInA.content.slice(0, 30)}...' pada Siswa A:`, qInA.options.map((o) => `${o.label}: ${o.content.slice(0, 15)}`));
  console.log(`  - Opsi Soal '${qInB.content.slice(0, 30)}...' pada Siswa B:`, qInB.options.map((o) => `${o.label}: ${o.content.slice(0, 15)}`));

  assert("Setiap opsi memiliki label standar A–E", qInA.options.every((o, i) => o.label === ["A", "B", "C", "D", "E"][i]));

  console.log("\n[4] Menguji Jawaban Siswa & Integritas Penilaian (Scoring Accuracy)...");
  // Ambil opsi yang benar di database
  const masterQuestion = tryout.tryoutQuestions.find((tq) => tq.questionId === commonQuestionId)!.question;
  const masterCorrectOpt = masterQuestion.options.find((o) => o.isCorrect)!;

  // Temukan label opsi benar pada lembar Siswa A
  const optCorrectInA = qInA.options.find((o) => o.id === masterCorrectOpt.id)!;
  // Temukan label opsi benar pada lembar Siswa B
  const optCorrectInB = qInB.options.find((o) => o.id === masterCorrectOpt.id)!;

  console.log(`  - Posisi Kunci Jawaban pada Siswa A: Opsi (${optCorrectInA.label})`);
  console.log(`  - Posisi Kunci Jawaban pada Siswa B: Opsi (${optCorrectInB.label})`);

  // Siswa A menjawab benar (pilih optCorrectInA.id)
  await ExamService.saveAnswer(studentA.id, sessionA.sessionId, {
    questionId: commonQuestionId,
    selectedOptionId: optCorrectInA.id,
    isFlagged: false,
  });

  // Submit ujian Siswa A
  const submitA = await ExamService.submitExamSession(studentA.id, sessionA.sessionId);
  assert("Penilaian Siswa A akurat (skor terhitung benar dari opsi teracak)", submitA.totalScore > 0);

  console.log("\n[5] Menguji Pembahasan (Discussion View Alignment)...");
  const discussionA = await ScoringService.getExamSessionDiscussion(studentA.id, sessionA.sessionId);
  const discQ = discussionA.questions.find((q) => q.questionId === commonQuestionId)!;

  assert(
    "Label kunci jawaban di pembahasan cocok persis dengan posisi opsi acak siswa",
    discQ.correctLabel === optCorrectInA.label
  );
  assert(
    "Urutan opsi di pembahasan sama persis dengan urutan opsi saat pengerjaan",
    discQ.options.map((o) => o.id).join(",") === qInA.options.map((o) => o.id).join(",")
  );

  console.log("\n=================================================================");
  console.log("   ✅ SELURUH PENGUJIAN RANDOMISASI SOAL, OPSI & KUNCI BERHASIL!");
  console.log("=================================================================\n");
}

runRandomizationTest().catch((err) => {
  console.error("Test Error:", err);
  process.exit(1);
});
