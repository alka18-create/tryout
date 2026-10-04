import { NextRequest } from "next/server";
import { AppError } from "./errors";

interface RateLimitConfig {
  /** Maksimal request dalam kurun waktu windowMs */
  max: number;
  /** Durasi waktu dalam milidetik (contoh: 60_000 untuk 1 menit) */
  windowMs: number;
  /** Prefix identifikasi unik rute (contoh: "auth:register") */
  prefix?: string;
}

interface ClientRecord {
  count: number;
  resetAt: number;
}

// In-memory store untuk rate limiter
const store = new Map<string, ClientRecord>();

// Bersihkan data lama secara periodik (setiap 5 menit)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (now > record.resetAt) {
        store.delete(key);
      }
    }
  }, 5 * 60_000).unref?.();
}

/**
 * Ekstrak IP address klien dari header request Next.js
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

/**
 * Validasi rate limit untuk sebuah request.
 * Melempar `AppError("RATE_LIMITED", ...)` jika batas terlampaui.
 */
export function enforceRateLimit(req: NextRequest, config: RateLimitConfig) {
  const ip = getClientIp(req);
  const key = `${config.prefix || "rl"}:${ip}`;
  const now = Date.now();

  const record = store.get(key);

  if (!record || now > record.resetAt) {
    // Inisialisasi window baru
    store.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return {
      allowed: true,
      remaining: config.max - 1,
      resetAt: now + config.windowMs,
    };
  }

  // Window masih aktif
  if (record.count >= config.max) {
    const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
    throw new AppError(
      "RATE_LIMITED",
      `Terlalu banyak permintaan. Silakan tunggu ${retryAfterSec} detik sebelum mencoba kembali.`,
      { retryAfter: retryAfterSec },
    );
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: config.max - record.count,
    resetAt: record.resetAt,
  };
}
