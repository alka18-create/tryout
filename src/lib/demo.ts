/**
 * Helper untuk logika pembatasan akun demo pada TryoutKu
 */

export function isDemoStudentEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return (
    clean === "ahmad@tryoutku.com" ||
    clean === "citra@tryoutku.com" ||
    clean.endsWith("@tryoutku.com")
  );
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
