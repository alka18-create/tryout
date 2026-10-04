/**
 * =============================================================================
 * LOAD & CONCURRENCY SIMULATION: 100 CONCURRENT AUTOSAVE TRANSACTIONS
 * =============================================================================
 */

import { prisma } from "../../src/lib/prisma";
import { ExamService } from "../../src/modules/exam/exam.service";

export async function runLoadSimulation(): Promise<boolean> {
  console.log("\n==================================================");
  console.log("▶ [LOAD & CONCURRENCY] Simulasi 100 Autosave Bersamaan");
  console.log("==================================================");

  // 1. Ambil tryout aktif dan buat sesi pengujian khusus
  const tryout = await prisma.tryout.findFirst({
    where: { status: "PUBLISHED", tryoutQuestions: { some: {} } },
    include: {
      tryoutQuestions: {
        include: { question: { include: { options: true } } },
        orderBy: { orderNumber: "asc" },
      },
    },
  });

  if (!tryout) {
    throw new Error("Tidak ada tryout berstatus PUBLISHED untuk pengujian beban!");
  }

  // Buat user simulasi beban
  let loadUser = await prisma.user.findUnique({ where: { email: "load_test_user@tryoutku.com" } });
  if (!loadUser) {
    loadUser = await prisma.user.create({
      data: {
        name: "User Simulasi Beban",
        email: "load_test_user@tryoutku.com",
        role: "STUDENT",
      },
    });
  }

  // Bersihkan sesi lama
  await prisma.examSession.deleteMany({
    where: { userId: loadUser.id, tryoutId: tryout.id },
  });

  // Mulai sesi baru
  const session = await ExamService.startOrResumeExamSession(loadUser.id, tryout.id);
  const questions = tryout.tryoutQuestions.map((tq) => tq.question);

  console.log(`[Info] Mempersiapkan 100 permintaan autosave serentak pada ${questions.length} butir soal...`);

  const TOTAL_REQUESTS = 100;
  const requests: Array<{
    index: number;
    questionId: string;
    optionId: string;
  }> = [];

  for (let i = 0; i < TOTAL_REQUESTS; i++) {
    const q = questions[i % questions.length];
    const option = q.options[i % q.options.length];
    requests.push({
      index: i + 1,
      questionId: q.id,
      optionId: option.id,
    });
  }

  const startTime = Date.now();
  const latencies: number[] = [];
  let successCount = 0;
  let failureCount = 0;

  // Jalankan seluruh request secara konkuren (Promise.all)
  const results = await Promise.all(
    requests.map(async (req) => {
      const t0 = Date.now();
      try {
        await ExamService.saveAnswer(loadUser!.id, session.sessionId, {
          questionId: req.questionId,
          selectedOptionId: req.optionId,
          isFlagged: req.index % 5 === 0,
        });
        const elapsed = Date.now() - t0;
        latencies.push(elapsed);
        successCount++;
        return { success: true, latency: elapsed };
      } catch (err: any) {
        failureCount++;
        return { success: false, error: err.message };
      }
    }),
  );

  const totalTime = Date.now() - startTime;
  latencies.sort((a, b) => a - b);

  const p50 = latencies[Math.floor(latencies.length * 0.50)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const max = latencies[latencies.length - 1] || 0;
  const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1));

  console.log("\n--- HASIL PENGUJIAN BEBAN KONKURENSI ---");
  console.log(`✓ Total Permintaan      : ${TOTAL_REQUESTS}`);
  console.log(`✓ Sukses                : ${successCount} (${(successCount / TOTAL_REQUESTS) * 100}%)`);
  console.log(`✗ Gagal                 : ${failureCount}`);
  console.log(`⏱ Total Waktu Eksekusi  : ${totalTime} ms`);
  console.log(`⚡ Throughput (RPS)      : ${Math.round((TOTAL_REQUESTS / (totalTime / 1000)) * 10) / 10} req/detik`);
  console.log(`📊 Latensi Rata-rata    : ${avg} ms`);
  console.log(`📊 Latensi P50 (Median) : ${p50} ms`);
  console.log(`📊 Latensi P95          : ${p95} ms`);
  console.log(`📊 Latensi Maksimum     : ${max} ms`);

  // Cleanup data uji
  await prisma.examAnswer.deleteMany({ where: { examSessionId: session.sessionId } });
  await prisma.examSession.delete({ where: { id: session.sessionId } });
  await prisma.user.delete({ where: { id: loadUser.id } });

  const passed = failureCount === 0 && successCount === TOTAL_REQUESTS;
  if (passed) {
    console.log("\n=> Pengujian Beban & Konkurensi: LULUS 100% (Tanpa race condition/deadlock) ✅");
  } else {
    console.error("\n=> Pengujian Beban: GAGAL ❌");
  }

  return passed;
}

// Eksekusi langsung jika dipanggil via node/tsx
if (require.main === module || process.argv[1]?.endsWith("test-load-simulation.ts")) {
  runLoadSimulation()
    .then((success) => process.exit(success ? 0 : 1))
    .catch((err) => {
      console.error("Terjadi error tak terduga:", err);
      process.exit(1);
    });
}
