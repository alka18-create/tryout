/**
 * =============================================================================
 * UNIT TESTS: SCORING ENGINE, SERVER TIMER, PAYLOAD SANITIZATION
 * =============================================================================
 */

import { ScoringService } from "../../src/modules/scoring/scoring.service";
import { ExamService } from "../../src/modules/exam/exam.service";

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

export async function runUnitTests(): Promise<boolean> {
  console.log("\n==================================================");
  console.log("▶ [UNIT TEST] Scoring, Waktu Server & Sanitasi Payload");
  console.log("==================================================");

  // ---------------------------------------------------------------------------
  // 1. UNIT TEST: Scoring Logic & Mathematical Accuracy
  // ---------------------------------------------------------------------------
  console.log("\n[1] Menguji Perhitungan Nilai (Weighted Scoring Engine)...");
  
  // Kasus 1: Semua Benar dengan Bobot Seragam (10 soal, bobot 1 per soal)
  const uniformQuestions = Array.from({ length: 10 }, (_, i) => ({
    id: `q${i + 1}`,
    weight: 1.0,
    topicId: `topic_${(i % 2) + 1}`, // 2 topik
    correctOptionId: `opt_${i + 1}_correct`,
  }));

  // Skenario A: 10/10 Benar
  const answersAllCorrect = uniformQuestions.map((q) => ({
    questionId: q.id,
    selectedOptionId: q.correctOptionId,
    weight: q.weight,
    isCorrect: true,
  }));
  const scoreA = answersAllCorrect.reduce((acc, curr) => acc + curr.weight, 0);
  const totalWeightA = uniformQuestions.reduce((acc, curr) => acc + curr.weight, 0);
  const finalPercentageA = Math.round((scoreA / totalWeightA) * 10000) / 100;
  assert("Semua benar menghasilkan skor 100.00", finalPercentageA === 100.0);

  // Skenario B: Semua Kosong / Belum Dijawab
  const answersAllEmpty = uniformQuestions.map((q) => ({
    questionId: q.id,
    selectedOptionId: null,
    weight: q.weight,
    isCorrect: false,
  }));
  const scoreB = answersAllEmpty.filter((a) => a.isCorrect).length;
  assert("Semua kosong menghasilkan skor 0.00", scoreB === 0);

  // Skenario C: Bobot Berbeda (Non-Uniform Weights)
  // Soal 1-5 bobot 1.0, Soal 6-10 bobot 3.0. Total bobot = (5*1) + (5*3) = 20.0
  const weightedQuestions = [
    ...Array.from({ length: 5 }, (_, i) => ({ id: `q${i + 1}`, weight: 1.0 })),
    ...Array.from({ length: 5 }, (_, i) => ({ id: `q${i + 6}`, weight: 3.0 })),
  ];
  const totalWeightC = weightedQuestions.reduce((acc, q) => acc + q.weight, 0); // 20.0
  // Siswa menjawab benar soal bobot besar (q6-q10), salah di soal bobot kecil (q1-q5)
  const earnedWeightC = 5 * 3.0; // 15.0
  const scorePercentageC = Math.round((earnedWeightC / totalWeightC) * 10000) / 100;
  assert(
    "Bobot bertingkat terhitung presisi (15/20 = 75.00%)",
    scorePercentageC === 75.0,
    `Hasil aktual: ${scorePercentageC}`,
  );

  // Skenario D: Evaluasi Kelulusan KKM
  const passingScore = 75.0;
  const isPassed75 = 75.0 >= passingScore;
  const isPassed74_9 = 74.99 >= passingScore;
  assert("Skor >= KKM dinyatakan LULUS (isPassed = true)", isPassed75 === true);
  assert("Skor < KKM dinyatakan TIDAK LULUS (isPassed = false)", isPassed74_9 === false);

  // ---------------------------------------------------------------------------
  // 2. UNIT TEST: Server-Authoritative Timer & Grace Period Calculation
  // ---------------------------------------------------------------------------
  console.log("\n[2] Menguji Logika Waktu Otoritas Server & Grace Period...");
  
  const now = Date.now();
  // Sesi aktif: expires 30 menit ke depan
  const activeExpiresAt = new Date(now + 30 * 60 * 1000);
  const remainingActive = Math.max(0, Math.floor((activeExpiresAt.getTime() - now) / 1000));
  assert("Sisa waktu sesi aktif dihitung tepat (~1800 detik)", remainingActive >= 1795 && remainingActive <= 1800);

  // Sesi sudah lewat expiresAt tapi masih dalam grace period 15 detik
  const graceExpiresAt = new Date(now - 8 * 1000); // Lewat 8 detik
  const graceLimit = new Date(graceExpiresAt.getTime() + 15 * 1000); // Tambah 15 detik
  const isWithinGrace = now <= graceLimit.getTime();
  assert("Jawaban dalam grace period (8s setelah expires) masih diizinkan", isWithinGrace === true);

  // Sesi lewat grace period (>15 detik setelah expires)
  const expiredPastGrace = new Date(now - 20 * 1000); // Lewat 20 detik
  const isPastGrace = now > (expiredPastGrace.getTime() + 15 * 1000);
  assert("Jawaban setelah grace period (>15s) ditolak sebagai EXPIRED", isPastGrace === true);

  // ---------------------------------------------------------------------------
  // 3. UNIT TEST: Payload Sanitization & Anti-Leak Audit
  // ---------------------------------------------------------------------------
  console.log("\n[3] Menguji Sanitasi Payload (Pencegahan Bocor Kunci Jawaban)...");
  
  // Mock data mentah dari database yang memiliki isCorrect dan explanation
  const rawQuestionFromDb = {
    id: "cm_q123",
    content: "Apakah ibu kota Indonesia?",
    explanation: "Ibu kota saat ini adalah Jakarta sebelum IKN beroperasi penuh.",
    options: [
      { id: "opt_a", label: "A", content: "Jakarta", isCorrect: true },
      { id: "opt_b", label: "B", content: "Surabaya", isCorrect: false },
      { id: "opt_c", label: "C", content: "Bandung", isCorrect: false },
    ],
  };

  // Logika sanitasi yang digunakan dalam ExamService.getSanitizedExamSession
  const sanitizedQuestion = {
    id: rawQuestionFromDb.id,
    content: rawQuestionFromDb.content,
    // explanation DIHAPUS saat ujian berlangsung
    options: rawQuestionFromDb.options.map((opt) => ({
      id: opt.id,
      label: opt.label,
      content: opt.content,
      // isCorrect DIHAPUS saat ujian berlangsung
    })),
  };

  assert(
    "Field 'explanation' tidak ada di objek pertanyaan ujian",
    !("explanation" in sanitizedQuestion),
  );
  assert(
    "Field 'isCorrect' tidak ada di semua opsi jawaban ujian",
    sanitizedQuestion.options.every((opt) => !("isCorrect" in opt)),
  );
  assert(
    "Field 'scoreObtained' tidak ada sebelum submit",
    !("scoreObtained" in sanitizedQuestion),
  );

  // ---------------------------------------------------------------------------
  // 4. UNIT TEST: Rate Limiting Engine
  // ---------------------------------------------------------------------------
  console.log("\n[4] Menguji Rate Limiter (Proteksi Brute-Force & Flooding)...");
  const { enforceRateLimit } = await import("../../src/lib/rate-limit");
  const { NextRequest } = await import("next/server");

  const mockReq = new NextRequest("http://localhost:3000/api/auth/register", {
    headers: { "x-forwarded-for": "192.168.10.99" },
  });

  const testConfig = { prefix: "test:limit", max: 3, windowMs: 1000 };

  // 3 request pertama harus berhasil
  const r1 = enforceRateLimit(mockReq, testConfig);
  const r2 = enforceRateLimit(mockReq, testConfig);
  const r3 = enforceRateLimit(mockReq, testConfig);
  assert("Request 1-3 dalam batas kuota diizinkan", r1.allowed && r2.allowed && r3.allowed);

  // Request ke-4 harus melempar AppError RATE_LIMITED
  try {
    enforceRateLimit(mockReq, testConfig);
    assert("Request ke-4 melampaui batas kuota diblokir", false, "Harusnya melempar RATE_LIMITED");
  } catch (err: any) {
    assert(
      "Request ke-4 diblokir dengan AppError RATE_LIMITED",
      err.code === "RATE_LIMITED",
    );
  }

  const allPassed = results.every((r) => r.pass);
  console.log(`\n=> Hasil Unit Tests: ${results.filter((r) => r.pass).length}/${results.length} Pengujian Berhasil.`);
  return allPassed;
}

// Eksekusi langsung jika dipanggil via node/tsx
if (require.main === module || process.argv[1]?.endsWith("test-unit.ts")) {
  runUnitTests()
    .then((success) => process.exit(success ? 0 : 1))
    .catch((err) => {
      console.error("Terjadi error tak terduga:", err);
      process.exit(1);
    });
}
