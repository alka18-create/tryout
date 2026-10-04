/**
 * Dipanggil sekali saat server Next.js start.
 * Memvalidasi environment variables lebih awal agar kesalahan konfigurasi langsung terlihat.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./lib/env");
  }
}
