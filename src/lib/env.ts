import { z } from "zod";

/**
 * Validasi environment variables saat aplikasi start.
 * Variabel yang baru dibutuhkan di fase berikutnya (Google OAuth, email) dibuat opsional dulu.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.url().default("http://localhost:3000"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL wajib diisi"),

  AUTH_SECRET: z.string().min(32, "AUTH_SECRET minimal 32 karakter"),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),

  EMAIL_FROM: z.string().optional(),
  EMAIL_PROVIDER_API_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Environment variables tidak valid:", z.treeifyError(parsed.error));
  throw new Error("Environment variables tidak valid. Periksa file .env");
}

export const env = parsed.data;
