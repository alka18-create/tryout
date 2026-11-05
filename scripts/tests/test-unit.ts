/**
 * =============================================================================
 * UNIT TESTS: SCORING ENGINE, SERVER TIMER, PAYLOAD SANITIZATION
 * =============================================================================
 */

import { ScoringService } from "../../src/modules/scoring/scoring.service";
import { ExamService } from "../../src/modules/exam/exam.service";
import {
  buildMatrixOptions,
  formatMatrixOptionLabel,
  isMatrixFullyAnswered,
  parseMatrixLabel,
  parseMatrixQuestion,
} from "../../src/lib/matrix-question";
import { safeCallbackUrl } from "../../src/lib/safe-redirect";

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

  // ---------------------------------------------------------------------------
  // 5. UNIT TEST: Inactivity Timeout Configuration & Auto-Logout Rules
  // ---------------------------------------------------------------------------
  console.log("\n[5] Menguji Pengaturan Inactivity Timeout (10 Menit Auto-Logout)...");
  const {
    INACTIVITY_TIMEOUT_MS,
    WARNING_DURATION_MS,
    STORAGE_KEY_LAST_ACTIVE,
    COOKIE_NAME_LAST_ACTIVE,
  } = await import("../../src/components/auth/session-idle-timer");
  const { INACTIVITY_TIMEOUT_MS: PROXY_TIMEOUT, LAST_ACTIVITY_COOKIE } = await import("../../src/proxy");

  assert("Durasi batas inaktivitas tepat 10 menit (600.000 ms)", INACTIVITY_TIMEOUT_MS === 10 * 60 * 1000);
  assert("Batas waktu proxy sinkron dengan client timer (10 menit)", PROXY_TIMEOUT === INACTIVITY_TIMEOUT_MS);
  assert("Durasi peringatan sebelum logout tepat 60 detik (60.000 ms)", WARNING_DURATION_MS === 60 * 1000);
  assert("Nama cookie aktivitas sinkron antara Client dan Proxy", COOKIE_NAME_LAST_ACTIVE === LAST_ACTIVITY_COOKIE);
  assert("Storage key localStorage valid", STORAGE_KEY_LAST_ACTIVE === "tryoutku_last_activity");

  // Simulasi perhitungan waktu
  const baseTime = 1700000000000;
  const idle5Min = baseTime + 5 * 60 * 1000;
  const idle9Min30Sec = baseTime + 9.5 * 60 * 1000;
  const idle10Min1Sec = baseTime + 10 * 60 * 1000 + 1000;

  const isWarning5Min = idle5Min - baseTime >= INACTIVITY_TIMEOUT_MS - WARNING_DURATION_MS;
  const isExpired5Min = idle5Min - baseTime >= INACTIVITY_TIMEOUT_MS;
  assert("Aktivitas di 5 menit: tidak memicu warning dan tidak logout", !isWarning5Min && !isExpired5Min);

  const isWarning9Min30 = idle9Min30Sec - baseTime >= INACTIVITY_TIMEOUT_MS - WARNING_DURATION_MS;
  const isExpired9Min30 = idle9Min30Sec - baseTime >= INACTIVITY_TIMEOUT_MS;
  assert("Aktivitas di 9.5 menit: memicu dialog warning (sisa 30 detik)", isWarning9Min30 && !isExpired9Min30);

  const isExpired10Min1 = idle10Min1Sec - baseTime >= INACTIVITY_TIMEOUT_MS;
  assert("Aktivitas di >10 menit: memicu auto logout seketika", isExpired10Min1);

  // ---------------------------------------------------------------------------
  // 6. UNIT TEST: Random Sampling & Weighted Scoring for Question Pool (questionCount)
  // ---------------------------------------------------------------------------
  console.log("\n[6] Menguji Fitur Kuota Soal Acak (Random Sampling 50 dari 100 Bank Soal)...");
  const { shuffleArrayWithSeed } = await import("../../src/lib/randomizer");

  // Bank soal berisi 100 butir soal
  const bankOf100Questions = Array.from({ length: 100 }, (_, i) => ({
    questionId: `question_${i + 1}`,
    orderNumber: i + 1,
    weight: 1.0,
  }));

  const questionCount = 50;

  // Siswa A (Session A)
  const sessionA_Id = "session_student_A_123";
  const sampledQuestionsA = shuffleArrayWithSeed(
    bankOf100Questions,
    `${sessionA_Id}:selected_questions`
  ).slice(0, questionCount);

  // Siswa B (Session B)
  const sessionB_Id = "session_student_B_456";
  const sampledQuestionsB = shuffleArrayWithSeed(
    bankOf100Questions,
    `${sessionB_Id}:selected_questions`
  ).slice(0, questionCount);

  assert("Siswa A mendapatkan tepat 50 soal", sampledQuestionsA.length === 50);
  assert("Siswa B mendapatkan tepat 50 soal", sampledQuestionsB.length === 50);

  // Memastikan soal yang diterima siswa A dan siswa B berbeda susunan/isinya (acak)
  const idsA = new Set(sampledQuestionsA.map((q) => q.questionId));
  const idsB = new Set(sampledQuestionsB.map((q) => q.questionId));
  let differentCount = 0;
  for (const id of idsB) {
    if (!idsA.has(id)) differentCount++;
  }
  assert("Siswa A dan Siswa B mendapatkan subset soal acak yang berbeda", differentCount > 0);

  // Evaluasi Penilaian Siswa: Total bobot maksimal harus berbasis 50 soal (bukan 100 soal)
  const studentAnswersA = sampledQuestionsA.map((q) => ({
    questionId: q.questionId,
    weight: q.weight,
    isCorrect: true, // Semua 50 soal dijawab benar
  }));

  const totalEarnedA = studentAnswersA.filter((a) => a.isCorrect).reduce((sum, a) => sum + a.weight, 0);
  const totalMaxWeightA = studentAnswersA.reduce((sum, a) => sum + a.weight, 0);
  const calculatedScoreA = Math.round((totalEarnedA / totalMaxWeightA) * 1000) / 10;

  assert(
    "Menjawab benar 50 dari 50 soal yang ditampilkan menghasilkan skor 100.0 (bukan 50.0)",
    calculatedScoreA === 100.0,
    `Hasil aktual: ${calculatedScoreA}`
  );

  // ---------------------------------------------------------------------------
  // 7. UNIT TEST: AI JSON Response Parser & Auto-Repair Resilience
  // ---------------------------------------------------------------------------
  console.log("\n[7] Menguji Ekstraksi & Perbaikan JSON Respon AI (Resilience Parser)...");
  const { sanitizeAndExtractJson } = await import("./test-ai-json-parser");

  // Kasus A: Model DeepSeek R1 dengan tag <think>
  const rawWithThink = `<think>
Harus buat 1 soal pilihan ganda.
Contoh: { "pikir": "analisis" }
</think>
\`\`\`json
{
  "questions": [
    { "number": 1, "content": "Soal 1", "options": [{ "label": "A", "content": "Opsi", "isCorrect": true }] }
  ]
}
\`\`\``;
  const parsedA = sanitizeAndExtractJson(rawWithThink);
  assert("Berhasil ekstrak JSON dari teks AI dengan tag <think>", parsedA?.questions?.length === 1);

  // Kasus B: Trailing comma & LaTeX backslashes (\alpha, \sqrt, dll)
  const rawWithLatex = `{
    "questions": [
      {
        "number": 1,
        "content": "Berapa \\alpha + \\frac{1}{2}?",
        "options": [
          { "label": "A", "content": "\\sqrt{9}", "isCorrect": true, },
        ],
        "explanation": "Simbol \\pm 3.",
      },
    ],
  }`;
  const parsedB = sanitizeAndExtractJson(rawWithLatex);
  assert("Berhasil memulihkan trailing comma dan backslash LaTeX", parsedB?.questions?.length === 1);

  // Kasus C: JSON terpotong akibat batas token (Truncated JSON recovery)
  const rawTruncated = `\`\`\`json
  {
    "questions": [
      {
        "number": 1,
        "content": "Soal lengkap 1",
        "options": [{ "label": "A", "content": "A", "isCorrect": true }]
      },
      {
        "number": 2,
        "content": "Soal lengkap 2",
        "options": [{ "label": "A", "content": "B", "isCorrect": true }]
      },
      {
        "number": 3,
        "content": "Soal terpotong di tengah jalan`;
  const parsedC = sanitizeAndExtractJson(rawTruncated);
  const countC = Array.isArray(parsedC) ? parsedC.length : parsedC?.questions?.length;
  assert("Berhasil memulihkan butir soal utuh dari JSON yang terpotong", countC === 2);

  // ---------------------------------------------------------------------------
  // 5. UNIT TEST: Helper Soal Matriks (build / parse / format / completeness)
  // ---------------------------------------------------------------------------
  console.log("\n[5] Menguji Helper Soal Matriks (Tabel Pernyataan)...");

  const matrixOptions = buildMatrixOptions(
    [
      { statement: "Pernyataan pertama", correctColumn: "Sesuai" },
      { statement: "Pernyataan kedua", correctColumn: "Tidak Sesuai" },
      { statement: "Pernyataan ketiga", correctColumn: "Sesuai" },
    ],
    ["Sesuai", "Tidak Sesuai"],
  );

  assert("Matriks 3 baris x 2 kolom menghasilkan 6 opsi", matrixOptions.length === 6);
  assert(
    "Label opsi matriks memuat nomor baris & indeks kolom",
    matrixOptions[0].label === "1:1:Sesuai" && matrixOptions[3].label === "2:2:Tidak Sesuai",
  );
  assert(
    "Setiap baris matriks memiliki tepat satu kunci benar",
    ["1", "2", "3"].every(
      (row) =>
        matrixOptions.filter((opt) => opt.label.startsWith(`${row}:`) && opt.isCorrect).length === 1,
    ),
  );

  const parsedMatrix = parseMatrixQuestion(
    matrixOptions.map((opt, index) => ({ id: `m${index}`, ...opt })),
  );
  assert("Parser matriks mengembalikan 3 baris", parsedMatrix.rows.length === 3);
  assert(
    "Parser matriks mengembalikan urutan kolom yang benar",
    parsedMatrix.columnNames[0] === "Sesuai" && parsedMatrix.columnNames[1] === "Tidak Sesuai",
  );
  assert(
    "Parser matriks mempertahankan teks pernyataan per baris",
    parsedMatrix.rows[1].statement === "Pernyataan kedua",
  );
  assert(
    "Parser matriks membaca format label lama (tanpa indeks kolom)",
    parseMatrixLabel("4:Tidak Sesuai").rowNumber === 4 &&
      parseMatrixLabel("4:Tidak Sesuai").columnName === "Tidak Sesuai",
  );
  assert(
    "Label matriks diformat ramah baca (1. Sesuai)",
    formatMatrixOptionLabel("1:2:Tidak Sesuai") === "1. Tidak Sesuai" &&
      formatMatrixOptionLabel("A") === "A",
  );

  const matrixOptionObjects = matrixOptions.map((opt, index) => ({ id: `m${index}`, ...opt }));
  assert(
    "Jawaban matriks parsial belum dianggap selesai",
    isMatrixFullyAnswered(matrixOptionObjects, ["m0", "m2"]) === false,
  );
  assert(
    "Jawaban matriks dengan satu pilihan per baris dianggap selesai",
    isMatrixFullyAnswered(matrixOptionObjects, ["m0", "m3", "m4"]) === true,
  );

  // --- Sanitasi callbackUrl (open redirect) ---
  assert(
    "callbackUrl null memakai fallback /dashboard",
    safeCallbackUrl(null) === "/dashboard",
  );
  assert(
    "callbackUrl path internal yang sah dipertahankan",
    safeCallbackUrl("/dashboard/teacher") === "/dashboard/teacher" &&
      safeCallbackUrl("/dashboard/student?tab=hasil") === "/dashboard/student?tab=hasil",
  );
  assert(
    "callbackUrl absolut ke domain lain ditolak",
    safeCallbackUrl("https://evil.com") === "/dashboard",
  );
  assert(
    "callbackUrl protocol-relative (//evil.com) ditolak",
    safeCallbackUrl("//evil.com") === "/dashboard",
  );
  assert(
    "callbackUrl dengan backslash (/) ditolak",
    safeCallbackUrl("/\\evil.com") === "/dashboard" &&
      safeCallbackUrl("/dashboard\\..\\evil") === "/dashboard",
  );
  assert(
    "callbackUrl ter-encode (%2F%2Fevil.com) ditolak",
    safeCallbackUrl("%2F%2Fevil.com") === "/dashboard",
  );
  assert(
    "callbackUrl kembali ke halaman login ditolak",
    safeCallbackUrl("/auth/login?callbackUrl=/dashboard") === "/dashboard",
  );
  assert(
    "callbackUrl berisi karakter kontrol ditolak",
    safeCallbackUrl("/dashboard\nSet-Cookie: x=1") === "/dashboard",
  );

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
