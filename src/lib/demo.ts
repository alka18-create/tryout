/**
 * Helper untuk logika pembatasan akun demo pada TryoutKu
 */

/**
 * Daftar eksplisit akun demo siswa (sesuai prisma/seed.ts).
 *
 * Sengaja dicocokkan per-email, BUKAN per-domain, agar akun peserta resmi yang
 * mendaftar memakai alamat @tryoutku.com tetap bisa mengerjakan semua paket.
 * Pembatasan "1 paket tryout" hanya berlaku untuk akun demo publik.
 */
const DEMO_STUDENT_EMAILS = new Set(["ahmad@tryoutku.com", "citra@tryoutku.com"]);

export function isDemoStudentEmail(email?: string | null): boolean {
  if (!email) return false;
  return DEMO_STUDENT_EMAILS.has(email.toLowerCase().trim());
}

/**
 * Menentukan ID tryout yang diizinkan untuk dikerjakan oleh akun demo (1 tryout saja).
 * Prioritaskan tryout yang memiliki kata "demo" / "uji coba" di judulnya,
 * atau tryout yang paling pertama dibuat (paket dasar/pengenalan).
 */
export function getDemoAllowedTryoutId<
  T extends { id: string; title: string; createdAt?: Date | string }
>(tryouts: T[]): string | null {
  if (tryouts.length === 0) return null;

  // 1. Cari tryout yang berjudul ada kata "demo" atau "uji coba"
  const demoNamed = tryouts.find((t) => /demo|uji\s*coba/i.test(t.title));
  if (demoNamed) return demoNamed.id;

  // 2. Jika tidak ada, urutkan berdasarkan createdAt paling awal (terlama)
  const sorted = [...tryouts].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeA - timeB;
  });

  return sorted[0].id;
}
