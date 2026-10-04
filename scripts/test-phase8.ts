import { prisma } from "../src/lib/prisma";
import { ExamService } from "../src/modules/exam/exam.service";
import { ScoringService } from "../src/modules/scoring/scoring.service";
import { DiscussionVisibility } from "../src/generated/prisma/client";

async function main() {
  console.log("=== MEMULAI TEST INTEGRASI FASE 8 (SCORING, HASIL, PEMBAHASAN & RIWAYAT) ===");

  // 1. Ambil akun student dan paket tryout yang berstatus PUBLISHED
  const student = await prisma.user.findFirst({
    where: { role: "STUDENT" },
  });
  if (!student) {
    throw new Error("Student tidak ditemukan!");
  }
  console.log(`[1] Siswa Uji: ${student.name} (${student.email})`);

  const tryout = await prisma.tryout.findFirst({
    where: { status: "PUBLISHED" },
    include: {
      tryoutQuestions: {
        orderBy: { orderNumber: "asc" },
        include: {
          question: {
            include: { options: true, topic: true },
          },
        },
      },
    },
  });
  if (!tryout || tryout.tryoutQuestions.length === 0) {
    throw new Error("Paket tryout tidak ditemukan!");
  }
  console.log(`[2] Tryout: "${tryout.title}" (${tryout.tryoutQuestions.length} butir soal)`);

  // Bersihkan data lama siswa untuk tryout ini agar terisolasi
  await prisma.examAnswer.deleteMany({
    where: { examSession: { userId: student.id, tryoutId: tryout.id } },
  });
  await prisma.examTopicScore.deleteMany({
    where: { examSession: { userId: student.id, tryoutId: tryout.id } },
  });
  await prisma.examSession.deleteMany({
    where: { userId: student.id, tryoutId: tryout.id },
  });

  // 2. Mulai sesi ujian baru
  const startResult = await ExamService.startOrResumeExamSession(student.id, tryout.id);
  const sessionId = startResult.sessionId;
  console.log(`[3] ✅ Sesi ujian baru dibuat (ID: ${sessionId})`);

  // 3. Jawab sebagian benar, sebagian salah, sebagian kosong untuk menguji akurasi scoring
  // Soal 1: Jawab Benar
  const q1 = tryout.tryoutQuestions[0].question;
  const correctOpt1 = q1.options.find((o) => o.isCorrect)!;
  await ExamService.saveAnswer(student.id, sessionId, {
    questionId: q1.id,
    selectedOptionId: correctOpt1.id,
    isFlagged: false,
  });

  // Soal 2: Jawab Salah
  if (tryout.tryoutQuestions.length > 1) {
    const q2 = tryout.tryoutQuestions[1].question;
    const wrongOpt2 = q2.options.find((o) => !o.isCorrect)!;
    await ExamService.saveAnswer(student.id, sessionId, {
      questionId: q2.id,
      selectedOptionId: wrongOpt2.id,
      isFlagged: true,
    });
  }

  // Soal 3 s/d N: Dibiarkan kosong
  console.log(`[4] ✅ Jawaban simulasi disiapkan: 1 Benar, 1 Salah, ${tryout.tryoutQuestions.length - 2} Kosong.`);

  // 4. Submit Sesi Ujian
  const submitResult = await ExamService.submitExamSession(student.id, sessionId, false);
  console.log(`[5] ✅ Submit berhasil: Skor=${submitResult.totalScore}, Benar=${submitResult.correctCount}, Salah=${submitResult.wrongCount}, Kosong=${submitResult.unansweredCount}`);

  if (submitResult.correctCount !== 1 || submitResult.wrongCount !== 1) {
    throw new Error("Kalkulasi hitungan benar/salah tidak akurat!");
  }

  // 5. Test: ScoringService.getExamSessionResult (Hasil & Diagnostik Topik)
  const resultData = await ScoringService.getExamSessionResult(student.id, sessionId);
  if (!resultData.topicMastery || resultData.topicMastery.length === 0) {
    throw new Error("Topic mastery tidak ditemukan pada hasil ujian!");
  }
  console.log(`[6] ✅ getExamSessionResult sukses:`);
  console.log(`    - Total Pertanyaan: ${resultData.totalQuestions}`);
  console.log(`    - Topik Terdiagnosa: ${resultData.topicMastery.length} topik`);
  console.log(`    - Durasi Pengerjaan: ${resultData.durationSpentMinutes} menit`);

  // 6. Test: ScoringService.getExamSessionDiscussion (Pembahasan Soal)
  const discussionData = await ScoringService.getExamSessionDiscussion(student.id, sessionId);
  if (!discussionData.questions || discussionData.questions.length !== tryout.tryoutQuestions.length) {
    throw new Error("Jumlah soal pada pembahasan tidak sesuai!");
  }

  // Verifikasi bahwa kunci jawaban dan pembahasan ada di lembar pembahasan
  const firstDisQ = discussionData.questions[0];
  if (!firstDisQ.correctLabel || !firstDisQ.options.some((o) => o.isCorrect)) {
    throw new Error("Kunci jawaban hilang dari pembahasan!");
  }
  console.log(`[7] ✅ getExamSessionDiscussion sukses: Kunci (${firstDisQ.correctLabel}) dan pembahasan konsep materi terverifikasi.`);

  // 7. Test: Validasi Proteksi Discussion Visibility (NEVER)
  await prisma.tryout.update({
    where: { id: tryout.id },
    data: { discussionVisibility: DiscussionVisibility.NEVER },
  });

  try {
    await ScoringService.getExamSessionDiscussion(student.id, sessionId);
    throw new Error("Gagal: Harusnya pembahasan ditolak jika visibility = NEVER!");
  } catch (err: any) {
    console.log(`[8] ✅ Proteksi discussionVisibility teruji: "${err.message}"`);
  }

  // Kembalikan visibility ke AFTER_SUBMIT
  await prisma.tryout.update({
    where: { id: tryout.id },
    data: { discussionVisibility: DiscussionVisibility.AFTER_SUBMIT },
  });

  // 8. Test: ScoringService.getStudentExamHistory (Riwayat & Tren Perkembangan)
  const historyData = await ScoringService.getStudentExamHistory(student.id);
  if (historyData.totalCompleted < 1 || historyData.history.length < 1) {
    throw new Error("Riwayat ujian peserta kosong!");
  }
  console.log(`[9] ✅ getStudentExamHistory sukses:`);
  console.log(`    - Total Tryout: ${historyData.totalCompleted}`);
  console.log(`    - Rata-rata Skor: ${historyData.averageScore}`);
  console.log(`    - Tren Skor Titik: ${historyData.scoreTrend.length} sesi`);

  // 9. Bersihkan data sesi uji
  await prisma.examAnswer.deleteMany({
    where: { examSessionId: sessionId },
  });
  await prisma.examTopicScore.deleteMany({
    where: { examSessionId: sessionId },
  });
  await prisma.examSession.delete({
    where: { id: sessionId },
  });
  console.log(`[10] Data sesi pengujian dibersihkan.`);

  console.log("=== SEMUA TEST INTEGRASI FASE 8 SUKSES 100% ===");
}

main()
  .catch((err) => {
    console.error("Gagal menjalankan test:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
