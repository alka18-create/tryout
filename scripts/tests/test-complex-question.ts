import { prisma } from "../../src/lib/prisma";
import { QuestionType, DifficultyLevel, UserRole } from "../../src/generated/prisma/client";
import { QuestionBankService } from "../../src/modules/question-bank/question.service";
import { ExamService } from "../../src/modules/exam/exam.service";
import { ScoringService } from "../../src/modules/scoring/scoring.service";

async function runTest() {
  console.log("=== MEMULAI TEST INTEGRASI SOAL PG KOMPLEKS & BENAR/SALAH ===");

  // 1. Setup User Guru & Siswa untuk testing
  let teacher = await prisma.user.findFirst({ where: { role: UserRole.TEACHER } });
  if (!teacher) {
    teacher = await prisma.user.create({
      data: {
        name: "Test Guru",
        email: `guru_test_${Date.now()}@tryoutku.com`,
        passwordHash: "dummy",
        role: UserRole.TEACHER,
      },
    });
  }

  let student = await prisma.user.findFirst({ where: { role: UserRole.STUDENT } });
  if (!student) {
    student = await prisma.user.create({
      data: {
        name: "Test Siswa",
        email: `siswa_test_${Date.now()}@tryoutku.com`,
        passwordHash: "dummy",
        role: UserRole.STUDENT,
      },
    });
  }

  // 2. Setup Topik
  let topic = await prisma.topic.findFirst();
  if (!topic) {
    let subject = await prisma.subject.findFirst();
    if (!subject) {
      subject = await prisma.subject.create({
        data: { name: "Pengetahuan Umum", code: "PU", description: "Test Subject" },
      });
    }
    topic = await prisma.topic.create({
      data: { name: "Logika Dasar", subjectId: subject.id },
    });
  }

  // 3. Test Buat Soal PG Kompleks via QuestionBankService
  console.log("\n1. Membuat Soal Pilihan Ganda Kompleks...");
  const mcQuestion = await QuestionBankService.createQuestion(teacher.id, {
    topicId: topic.id,
    type: QuestionType.MULTIPLE_CHOICE,
    content: "Manakah dari berikut ini yang merupakan planet dalam tata surya kita? (Pilih minimal 2)",
    difficulty: DifficultyLevel.MEDIUM,
    options: [
      { label: "A", content: "Mars", isCorrect: true },
      { label: "B", content: "Jupiter", isCorrect: true },
      { label: "C", content: "Alpha Centauri", isCorrect: false },
      { label: "D", content: "Sirius", isCorrect: false },
    ],
  });
  console.log(`✓ Soal PG Kompleks dibuat dengan ID: ${mcQuestion.id}, tipe: ${mcQuestion.type}`);

  // 4. Test Buat Soal Benar / Salah via QuestionBankService
  console.log("\n2. Membuat Soal Benar / Salah...");
  const tfQuestion = await QuestionBankService.createQuestion(teacher.id, {
    topicId: topic.id,
    type: QuestionType.TRUE_FALSE,
    content: "Matahari terbit dari sebelah barat.",
    difficulty: DifficultyLevel.EASY,
    options: [
      { label: "A", content: "Benar", isCorrect: false },
      { label: "B", content: "Salah", isCorrect: true },
    ],
  });
  console.log(`✓ Soal Benar/Salah dibuat dengan ID: ${tfQuestion.id}, tipe: ${tfQuestion.type}`);

  // 5. Buat Tryout yang berisi kedua soal tersebut
  console.log("\n3. Membuat Tryout Uji Coba...");
  const tryout = await prisma.tryout.create({
    data: {
      title: `Tryout Uji Coba Fitur Baru ${Date.now()}`,
      durationMinutes: 30,
      passingScore: 60,
      status: "PUBLISHED",
      subjectId: topic.subjectId,
      createdById: teacher.id,
      tryoutQuestions: {
        create: [
          { questionId: mcQuestion.id, orderNumber: 1, weight: 10 },
          { questionId: tfQuestion.id, orderNumber: 2, weight: 10 },
        ],
      },
    },
  });

  // 6. Jalankan Ujian untuk Siswa (Sesi Pengerjaan)
  console.log("\n4. Memulai Sesi Ujian Siswa...");
  const session = await ExamService.startOrResumeExamSession(student.id, tryout.id);
  console.log(`✓ Sesi Ujian Aktif: ${session.sessionId}`);

  // Ambil detail soal & opsi
  const mcOpts = mcQuestion.options;
  const correctOptA = mcOpts.find((o) => o.label === "A")!; // Mars (true)
  const correctOptB = mcOpts.find((o) => o.label === "B")!; // Jupiter (true)
  const wrongOptC = mcOpts.find((o) => o.label === "C")!;   // Alpha Centauri (false)

  const tfOpts = tfQuestion.options;
  const tfSalahOpt = tfOpts.find((o) => o.label === "B")!; // Salah (true)

  // 7. Simpan Jawaban Siswa
  // Soal 1 (PG Kompleks): Siswa memilih HANYA Mars (1 dari 2 benar -> 50% partial score)
  console.log("\n5. Siswa menyimpan jawaban PG Kompleks (1 opsi benar dipilih)...");
  await ExamService.saveAnswer(student.id, session.sessionId, {
    questionId: mcQuestion.id,
    selectedOptionIds: [correctOptA.id],
    isFlagged: false,
  });

  // Soal 2 (Benar/Salah): Siswa memilih "Salah" (Benar -> 100% score)
  console.log("6. Siswa menyimpan jawaban Benar/Salah...");
  await ExamService.saveAnswer(student.id, session.sessionId, {
    questionId: tfQuestion.id,
    selectedOptionId: tfSalahOpt.id,
    isFlagged: false,
  });

  // 8. Submit Sesi Ujian dan Cek Evaluasi Skor
  console.log("\n7. Submit Sesi Ujian & Hitung Skor...");
  const result = await ExamService.submitExamSession(student.id, session.sessionId);
  console.log(`Hasil Penilaian:
  - Total Skor Siswa: ${result.totalScore} (dari total bobot 20)
  - Jumlah Benar Penuh: ${result.correctCount}
  - Jumlah Salah: ${result.wrongCount}`);

  // Harapannya:
  // Soal 1 (bobot 10): 1 benar dari 2 benar => ratio 0.5 => 5 poin (skor parsial)
  // Soal 2 (bobot 10): 1 benar => ratio 1.0 => 10 poin
  // Total Poin = 15 poin.
  // Persentase Skor = (15 / 20) * 100 = 75.
  if (Math.abs(result.totalScore - 75) < 0.1) {
    console.log("✓ Skor kalkulasi tepat 75% (Parsial 5 poin + Penuh 10 poin)!");
  } else {
    throw new Error(`Skor tidak sesuai ekspektasi! Didapat: ${result.totalScore}, Diharapkan: 75`);
  }

  // 9. Cek Pembahasan & Discussion Viewer Data
  console.log("\n8. Memeriksa Format Pembahasan...");
  const discussion = await ScoringService.getExamSessionDiscussion(student.id, session.sessionId);
  const q1Discussion = discussion.questions.find((q) => q.questionId === mcQuestion.id);
  const q2Discussion = discussion.questions.find((q) => q.questionId === tfQuestion.id);

  console.log(`Status Soal 1 (PG Kompleks): answerStatus=${q1Discussion?.answerStatus}, scoreObtained=${q1Discussion?.scoreObtained}/${q1Discussion?.weight}`);
  console.log(`Status Soal 2 (Benar/Salah): answerStatus=${q2Discussion?.answerStatus}, scoreObtained=${q2Discussion?.scoreObtained}/${q2Discussion?.weight}`);

  if (q1Discussion?.answerStatus !== "PARTIAL") {
    throw new Error(`Soal 1 seharusnya berstatus answerStatus = PARTIAL, didapat: ${q1Discussion?.answerStatus}`);
  }
  if (q2Discussion?.answerStatus !== "CORRECT") {
    throw new Error(`Soal 2 seharusnya berstatus answerStatus = CORRECT, didapat: ${q2Discussion?.answerStatus}`);
  }

  // Cleanup data test
  console.log("\n9. Membersihkan data test...");
  await prisma.examAnswer.deleteMany({ where: { examSessionId: session.sessionId } });
  await prisma.examTopicScore.deleteMany({ where: { examSessionId: session.sessionId } });
  await prisma.examSession.delete({ where: { id: session.sessionId } });
  await prisma.tryoutQuestion.deleteMany({ where: { tryoutId: tryout.id } });
  await prisma.tryout.delete({ where: { id: tryout.id } });
  await prisma.questionOption.deleteMany({ where: { questionId: { in: [mcQuestion.id, tfQuestion.id] } } });
  await prisma.question.deleteMany({ where: { id: { in: [mcQuestion.id, tfQuestion.id] } } });

  console.log("=== SEMUA TEST BERHASIL DILALUI DENGAN SUKSES! ===\n");
}

runTest()
  .catch((e) => {
    console.error("Test Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
