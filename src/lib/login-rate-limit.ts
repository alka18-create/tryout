import { CredentialsSignin } from "next-auth";

/**
 * Error yang dilempar dari `authorize` ketika percobaan login melebihi batas.
 * NextAuth akan meneruskan `code` ini ke client (redirect: false) sehingga
 * halaman login bisa menampilkan pesan yang tepat.
 */
export class LoginRateLimitedError extends CredentialsSignin {
  code = "rate_limited";
}

interface Bucket {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 15 * 60 * 1000; // 15 menit
const MAX_FAILURES_PER_EMAIL = 5;
const MAX_FAILURES_PER_IP = 20;

const emailBuckets = new Map<string, Bucket>();
const ipBuckets = new Map<string, Bucket>();

// Bersihkan bucket kedaluwarsa secara periodik
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const store of [emailBuckets, ipBuckets]) {
      for (const [key, bucket] of store.entries()) {
        if (now > bucket.resetAt) store.delete(key);
      }
    }
  }, 5 * 60_000).unref?.();
}

function isBlocked(store: Map<string, Bucket>, key: string, max: number): boolean {
  const bucket = store.get(key);
  if (!bucket) return false;
  if (Date.now() > bucket.resetAt) {
    store.delete(key);
    return false;
  }
  return bucket.count >= max;
}

function increment(store: Map<string, Bucket>, key: string) {
  const now = Date.now();
  const bucket = store.get(key);
  if (!bucket || now > bucket.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  bucket.count += 1;
}

/** Ekstrak IP klien dari header request standar reverse proxy. */
export function getRequestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

/**
 * Melempar LoginRateLimitedError jika email atau IP sudah melewati batas
 * kegagalan login dalam window berjalan.
 */
export function assertLoginAllowed(ip: string, email: string) {
  if (
    isBlocked(emailBuckets, email, MAX_FAILURES_PER_EMAIL) ||
    isBlocked(ipBuckets, ip, MAX_FAILURES_PER_IP)
  ) {
    throw new LoginRateLimitedError();
  }
}

/** Catat satu kegagalan login (email salah / password salah). */
export function recordLoginFailure(ip: string, email: string) {
  increment(emailBuckets, email);
  increment(ipBuckets, ip);
}

/** Hapus hitungan kegagalan email setelah login berhasil. */
export function resetLoginFailures(email: string) {
  emailBuckets.delete(email);
}
