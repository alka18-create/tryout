/**
 * Modul Pengacakan Deterministik Berbasis Seed (Deterministic Pseudo-Random Shuffling)
 * Digunakan untuk mengacak urutan butir soal, opsi jawaban (A–E), dan kunci jawaban
 * secara unik untuk setiap sesi pengerjaan ujian peserta didik.
 *
 * Sifat:
 * 1. Setiap sesi siswa (sessionId) memiliki urutan soal dan opsi yang unik (teracak).
 * 2. Deterministik: Siswa yang sama me-refresh halaman atau membuka kembali sesi ujian
 *    akan selalu mendapatkan urutan soal dan opsi yang konsisten sama.
 */

const STANDARD_LABELS = ["A", "B", "C", "D", "E"] as const;

/**
 * Algoritma Mulberry32 PRNG (Pseudo-Random Number Generator)
 * Menghasilkan angka acak seragam antara 0 dan 1 berdasarkan seed 32-bit.
 */
function createPrng(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Mengubah string arbitrary (misal: sessionId + questionId) menjadi integer seed 32-bit.
 */
export function stringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

/**
 * Mengacak urutan array menggunakan algoritma Fisher-Yates dengan PRNG berbasis seed.
 * Mengembalikan array baru tanpa mengubah array asli.
 */
export function shuffleArrayWithSeed<T>(array: T[], seedStr: string): T[] {
  if (!array || array.length <= 1) return [...(array || [])];

  const result = [...array];
  const prng = createPrng(stringToSeed(seedStr));

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

/**
 * Mengacak urutan opsi pilihan ganda dan memberikan label A–E baru sesuai urutan acak.
 */
export function shuffleQuestionOptions<
  T extends { id: string; label: string; content: string; imageUrl?: string | null; isCorrect?: boolean }
>(options: T[], seedStr: string): T[] {
  if (!options || options.length <= 1) return [...(options || [])];

  const shuffled = shuffleArrayWithSeed(options, seedStr);

  return shuffled.map((opt, index) => ({
    ...opt,
    label: STANDARD_LABELS[index] || opt.label,
  }));
}
