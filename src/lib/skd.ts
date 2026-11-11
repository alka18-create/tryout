/**
 * Helper struktur soal SKD CASN.
 *
 * Satu paket SKD selalu disusun berurutan: TWK → TIU → TKP dengan kuota
 * 30 / 35 / 45 soal (total 110). Helper di sini dipakai untuk memilih soal
 * yang benar-benar ditampilkan, sehingga paket lama yang memiliki soal
 * berlebih tetap menampilkan komposisi resmi.
 */

import { SkdSection } from "@/generated/prisma/client";

/** Kuota resmi jumlah soal per subtes SKD CASN. */
export const SKD_QUESTION_QUOTA: Record<SkdSection, number> = {
  [SkdSection.TWK]: 30,
  [SkdSection.TIU]: 35,
  [SkdSection.TKP]: 45,
};

/** Urutan tampil subtes: TWK lebih dulu, lalu TIU, lalu TKP. */
export const SKD_SECTION_PRIORITY: Record<SkdSection, number> = {
  [SkdSection.TWK]: 0,
  [SkdSection.TIU]: 1,
  [SkdSection.TKP]: 2,
};

/** True jika seluruh soal sudah ditandai kategori subtes (paket SKD). */
export function isSectionedSkdQuestions(
  questions: Array<{ section: SkdSection | null }>,
): boolean {
  return questions.length > 0 && questions.every((q) => q.section !== null);
}

function priorityOf(section: SkdSection | null): number {
  return section ? SKD_SECTION_PRIORITY[section] : 3;
}

/**
 * Mengambil soal SKD sesuai komposisi resmi: maksimal 30 TWK, 35 TIU, 45 TKP,
 * diurutkan TWK → TIU → TKP lalu nomor urut. Soal berlebih di tiap subtes
 * (data paket lama) tidak disertakan.
 */
export function selectSkdQuestions<T extends { section: SkdSection | null; orderNumber: number }>(
  questions: T[],
): T[] {
  const sorted = [...questions].sort(
    (a, b) => priorityOf(a.section) - priorityOf(b.section) || a.orderNumber - b.orderNumber,
  );

  const used = { TWK: 0, TIU: 0, TKP: 0 };
  return sorted.filter((q) => {
    if (!q.section) return false;
    if (used[q.section] >= SKD_QUESTION_QUOTA[q.section]) return false;
    used[q.section] += 1;
    return true;
  });
}

/** Jumlah soal efektif SKD setelah dibatasi komposisi resmi. */
export function countSkdSelection(questions: Array<{ section: SkdSection | null }>): number {
  const used = { TWK: 0, TIU: 0, TKP: 0 };
  let total = 0;
  for (const q of questions) {
    if (!q.section) continue;
    if (used[q.section] >= SKD_QUESTION_QUOTA[q.section]) continue;
    used[q.section] += 1;
    total += 1;
  }
  return total;
}
