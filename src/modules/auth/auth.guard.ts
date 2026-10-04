import { auth } from "@/auth";
import { AppError } from "@/lib/errors";
import { UserRole } from "@/generated/prisma/client";

/**
 * Mengambil session user saat ini (server-side).
 */
export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

/**
 * Memastikan user sudah terotentikasi.
 * Melempar error UNAUTHENTICATED jika belum login.
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user || !user.id) {
    throw new AppError("UNAUTHENTICATED", "Sesi login tidak ditemukan. Silakan login terlebih dahulu.");
  }
  return user;
}

/**
 * Memastikan user memiliki salah satu dari role yang diizinkan.
 * Melempar error FORBIDDEN jika role tidak cocok.
 */
export async function requireRole(allowedRoles: UserRole[]) {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    throw new AppError("FORBIDDEN", "Anda tidak memiliki hak akses untuk tindakan ini.");
  }
  return user;
}
