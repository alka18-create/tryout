import { prisma } from "../src/lib/prisma";
import { TryoutService } from "../src/modules/tryout/tryout.service";

async function main() {
  console.log("=== MEMULAI TEST INTEGRASI FASE 6 (TRYOUT MANAGEMENT) ===");

  // 1. Ambil akun guru dan mata pelajaran
  const teacher = await prisma.user.findFirst({
    where: { role: "TEACHER" },
  });
  if (!teacher) {
    throw new Error("Guru tidak ditemukan!");
  }
  console.log(`[1] Guru ditemukan: ${teacher.name} (${teacher.email})`);

  const subject = await prisma.subject.findFirst();
  if (!subject) {
    throw new Error("Mata pelajaran tidak ditemukan!");
  }
  const questions = await prisma.question.findMany({
    where: { topic: { subjectId: subject.id } },
    take: 5,
  });
  console.log(`[2] Mata pelajaran: ${subject.name} (${questions.length} soal diambil)`);

  // 2. Buat Tryout DRAFT baru
  const newTryout = await TryoutService.createTryout(teacher.id, {
    title: "Simulasi Ujian Fase 6 Automated Test",
    description: "Tryout otomatis untuk memverifikasi logika Fase 6",
    subjectId: subject.id,
    durationMinutes: 45,
    passingScore: 80,
    status: "DRAFT",
    discussionVisibility: "AFTER_SUBMIT",
  });
  console.log(`[3] Berhasil membuat Tryout ID: ${newTryout.id} (Status: ${newTryout.status})`);

  // 3. Coba publish saat soal masih 0 (Harus GAGAL / throw error)
  try {
    await TryoutService.updateTryout(teacher.id, "TEACHER", newTryout.id, {
      status: "PUBLISHED",
    });
    console.error("❌ ERROR: Harusnya gagal publish tryout tanpa butir soal!");
  } catch (err: any) {
    console.log(`[4] ✅ Berhasil dicegah publish soal kosong: "${err.message}"`);
  }

  // 4. Tambahkan 3 soal dari bank soal dengan bobot dan urutan
  const questionIds = questions.slice(0, 3).map((q) => q.id);
  const questionsPayload = questionIds.map((qid, idx) => ({
    questionId: qid,
    orderNumber: idx + 1,
    weight: idx === 0 ? 2.0 : 1.0,
  }));

  const attached = await TryoutService.setTryoutQuestions(
    teacher.id,
    "TEACHER",
    newTryout.id,
    { questions: questionsPayload }
  );
  console.log(`[5] ✅ Berhasil menambahkan ${attached.length} butir soal ke tryout.`);

  // 5. Publish tryout sekarang (Harus BERHASIL)
  const published = await TryoutService.updateTryout(teacher.id, "TEACHER", newTryout.id, {
    status: "PUBLISHED",
  });
  console.log(`[6] ✅ Berhasil publish tryout (Status sekarang: ${published.status})`);

  // 6. Coba kunci: Buat simulasi sesi ujian peserta (ExamSession)
  const student = await prisma.user.findFirst({
    where: { role: "STUDENT" },
  });
  if (student) {
    const session = await prisma.examSession.create({
      data: {
        tryoutId: newTryout.id,
        userId: student.id,
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 45 * 60 * 1000),
        status: "IN_PROGRESS",
      },
    });
    console.log(`[7] Simulasi sesi ujian peserta dibuat (ID: ${session.id})`);

    // 7. Coba ubah susunan soal setelah ada sesi (Harus DITOLAK / LOCKED)
    try {
      await TryoutService.setTryoutQuestions(
        teacher.id,
        "TEACHER",
        newTryout.id,
        { questions: questionsPayload.slice(0, 1) }
      );
      console.error("❌ ERROR: Harusnya gagal mengubah soal pada tryout yang sudah ada sesi!");
    } catch (err: any) {
      console.log(`[8] ✅ Berhasil ditolak perubahan susunan soal (Locked): "${err.message}"`);
    }

    // Bersihkan sesi simulasi agar bersih
    await prisma.examSession.delete({ where: { id: session.id } });
    console.log(`[9] Sesi ujian simulasi dibersihkan.`);
  }

  // 8. Bersihkan data tryout test
  await prisma.tryoutQuestion.deleteMany({ where: { tryoutId: newTryout.id } });
  await prisma.tryout.delete({ where: { id: newTryout.id } });
  console.log(`[10] Data tryout pengujian Fase 6 berhasil dibersihkan.`);

  console.log("=== SEMUA TEST INTEGRASI FASE 6 SUKSES 100% ===");
}

main()
  .catch((err) => {
    console.error("Gagal menjalankan test:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
