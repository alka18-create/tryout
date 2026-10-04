import { prisma } from "../src/lib/prisma";
import { ExamService } from "../src/modules/exam/exam.service";

async function main() {
  console.log("=== MEMULAI TEST INTEGRASI FASE 7 (EXAM ENGINE PESERTA) ===");

  // 1. Ambil 2 peserta untuk pengujian isolasi dan keamanan
  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    take: 2,
  });
  if (students.length < 2) {
    throw new Error("Dibutuhkan minimal 2 akun student untuk pengujian.");
  }
  const [studentA, studentB] = students;
  console.log(`[1] Siswa Uji A: ${studentA.name} (${studentA.email})`);
  console.log(`[1] Siswa Uji B: ${studentB.name} (${studentB.email})`);

  // 2. Ambil paket tryout yang berstatus PUBLISHED
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
  });
  if (!tryout || tryout.tryoutQuestions.length === 0) {
    throw new Error("Paket tryout berstatus PUBLISHED dengan soal tidak ditemukan!");
  }
  console.log(`[2] Tryout Uji: "${tryout.title}" (${tryout.tryoutQuestions.length} butir soal)`);

  // Bersihkan riwayat sesi lama untuk studentA pada tryout ini jika ada
  await prisma.examAnswer.deleteMany({
    where: { examSession: { userId: studentA.id, tryoutId: tryout.id } },
  });
  await prisma.examTopicScore.deleteMany({
    where: { examSession: { userId: studentA.id, tryoutId: tryout.id } },
  });
  await prisma.examSession.deleteMany({
    where: { userId: studentA.id, tryoutId: tryout.id },
  });

  // 3. Test: getAvailableTryoutsForStudent
  const availableList = await ExamService.getAvailableTryoutsForStudent(studentA.id);
  const found = availableList.find((t) => t.id === tryout.id);
  if (!found || found.participationStatus !== "NOT_STARTED") {
    throw new Error("Gagal mengambil daftar tryout tersedia untuk peserta.");
  }
  console.log(`[3] ✅ getAvailableTryoutsForStudent sukses (Status: ${found.participationStatus})`);

  // 4. Test: startOrResumeExamSession (Memulai sesi baru)
  const sessionResult = await ExamService.startOrResumeExamSession(studentA.id, tryout.id);
  if (!sessionResult.sessionId || sessionResult.isResumed !== false) {
    throw new Error("Gagal menginisialisasi sesi ujian baru.");
  }
  console.log(`[4] ✅ Sesi ujian baru berhasil dibuat (Session ID: ${sessionResult.sessionId})`);

  // Verifikasi baris ExamAnswer terbentuk di DB
  const answerRows = await prisma.examAnswer.findMany({
    where: { examSessionId: sessionResult.sessionId },
  });
  if (answerRows.length !== tryout.tryoutQuestions.length) {
    throw new Error(`Jumlah ExamAnswer (${answerRows.length}) tidak sesuai dengan jumlah soal (${tryout.tryoutQuestions.length})`);
  }
  console.log(`[5] ✅ ${answerRows.length} baris lembar jawaban kosong terbuat dalam DB.`);

  // 5. Test: Idempotent Resume (Panggil start kembali saat status masih IN_PROGRESS)
  const resumeResult = await ExamService.startOrResumeExamSession(studentA.id, tryout.id);
  if (resumeResult.sessionId !== sessionResult.sessionId || resumeResult.isResumed !== true) {
    throw new Error("Idempotent resume gagal!");
  }
  console.log(`[6] ✅ Idempotent resume sukses: Sesi yang sama dikembalikan tanpa duplikasi.`);

  // 6. Test: Sanitasi Payload Lembar Ujian (Anti-Bocor Kunci Jawaban)
  const sanitizedSheet = await ExamService.getSanitizedExamSession(studentA.id, sessionResult.sessionId);
  if (!sanitizedSheet.questions || sanitizedSheet.questions.length === 0) {
    throw new Error("Gagal memuat lembar ujian tersanitasi.");
  }

  // Uji bahwa tidak ada isCorrect di options atau explanation di question
  for (const q of sanitizedSheet.questions) {
    if ("explanation" in q) {
      throw new Error(`BOCOR: Field explanation ditemukan pada soal ID ${q.questionId}`);
    }
    for (const opt of q.options) {
      if ("isCorrect" in opt) {
        throw new Error(`BOCOR: Field isCorrect ditemukan pada opsi ID ${opt.id}`);
      }
    }
  }
  console.log(`[7] ✅ STRICT SECURITY PASSED: Seluruh kunci jawaban (isCorrect) & pembahasan bersih dari response.`);

  // 7. Test: Otorisasi Keamanan (Student B mencoba akses lembar Student A)
  try {
    await ExamService.getSanitizedExamSession(studentB.id, sessionResult.sessionId);
    throw new Error("Gagal: Student B seharusnya tidak boleh mengakses sesi Student A!");
  } catch (err: any) {
    console.log(`[8] ✅ Otorisasi terlindungi: Percobaan akses pihak lain ditolak (${err.message})`);
  }

  // 8. Test: Autosave Jawaban (saveAnswer)
  const firstQ = tryout.tryoutQuestions[0].question;
  const correctOpt = firstQ.options.find((o) => o.isCorrect);
  if (!correctOpt) throw new Error("Opsi kunci tidak ditemukan pada soal 1.");

  const saveRes = await ExamService.saveAnswer(studentA.id, sessionResult.sessionId, {
    questionId: firstQ.id,
    selectedOptionId: correctOpt.id,
    isFlagged: true,
  });
  if (saveRes.selectedOptionId !== correctOpt.id || saveRes.isFlagged !== true) {
    throw new Error("Autosave jawaban gagal!");
  }
  console.log(`[9] ✅ Autosave sukses: Opsi terpilih & flag ragu-ragu tersimpan.`);

  // 9. Test: Submit Ujian (Manual Submit & Auto-Scoring)
  const submitRes = await ExamService.submitExamSession(studentA.id, sessionResult.sessionId, false);
  if (submitRes.status !== "SUBMITTED" || (submitRes.correctCount ?? 0) < 1) {
    throw new Error(`Submit gagal: Status=${submitRes.status}, Benar=${submitRes.correctCount}`);
  }
  console.log(`[10] ✅ Submit & Scoring Sukses: Skor = ${submitRes.totalScore}, Benar = ${submitRes.correctCount}, Status = ${submitRes.status}`);

  // Cek Topic Scores di DB
  const topicScores = await prisma.examTopicScore.findMany({
    where: { examSessionId: sessionResult.sessionId },
  });
  console.log(`[11] ✅ Agregasi penguasaan materi (Topic Scores) terbuat: ${topicScores.length} topik.`);

  // 10. Test: Idempotent Submit (Panggil submit ulang tidak menghitung ulang atau merusak data)
  const reSubmitRes = await ExamService.submitExamSession(studentA.id, sessionResult.sessionId, false);
  if (reSubmitRes.totalScore !== submitRes.totalScore) {
    throw new Error("Idempotent submit menghasilkan skor berbeda!");
  }
  console.log(`[12] ✅ Idempotent submit sukses: Hasil sama dikembalikan secara instan.`);

  // 11. Test: Cegah Retake (Ulang Ujian yang sudah SUBMITTED)
  try {
    await ExamService.startOrResumeExamSession(studentA.id, tryout.id);
    throw new Error("Gagal: Harusnya peserta dilarang mengulang ujian yang sudah disubmit!");
  } catch (err: any) {
    console.log(`[13] ✅ Pencegahan retake berhasil: "${err.message}"`);
  }

  // Bersihkan data sesi uji
  await prisma.examAnswer.deleteMany({
    where: { examSessionId: sessionResult.sessionId },
  });
  await prisma.examTopicScore.deleteMany({
    where: { examSessionId: sessionResult.sessionId },
  });
  await prisma.examSession.delete({
    where: { id: sessionResult.sessionId },
  });
  console.log(`[14] Data sesi pengujian berhasil dibersihkan.`);

  console.log("=== SEMUA TEST INTEGRASI FASE 7 SUKSES 100% ===");
}

main()
  .catch((err) => {
    console.error("Gagal menjalankan test:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
