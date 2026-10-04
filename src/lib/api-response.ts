import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, ERROR_CODES, type ErrorCode } from "./errors";

/**
 * Format response standar API — sesuai BLUEPRINT 02 §4.
 *   Sukses: { success: true, data, message? }
 *   Gagal : { success: false, error: { code, message, details? } }
 */
export type ApiSuccess<T> = { success: true; data: T; message?: string };
export type ApiFailure = {
  success: false;
  error: { code: ErrorCode; message: string; details?: unknown };
};
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function ok<T>(data: T, message?: string, status = 200) {
  return NextResponse.json<ApiSuccess<T>>({ success: true, data, message }, { status });
}

export function created<T>(data: T, message?: string) {
  return ok(data, message, 201);
}

export function fail(code: ErrorCode, message: string, details?: unknown, status?: number) {
  return NextResponse.json<ApiFailure>(
    { success: false, error: { code, message, details } },
    { status: status ?? ERROR_CODES[code] },
  );
}

/** Ubah error apa pun menjadi response standar. Error tak dikenal tidak membocorkan detail. */
export function handleApiError(error: unknown) {
  if (error instanceof AppError) {
    return fail(error.code, error.message, error.details, error.status);
  }
  if (error instanceof ZodError) {
    return fail("VALIDATION_ERROR", "Data yang dikirim tidak valid.", error.flatten().fieldErrors);
  }
  console.error("[API] Unhandled error:", error);
  return fail("INTERNAL_ERROR", "Terjadi kesalahan pada server.");
}
