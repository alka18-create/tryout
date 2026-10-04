/**
 * Kode error standar API — sesuai BLUEPRINT 02 §4.
 * Setiap kode dipetakan ke HTTP status default.
 */
export const ERROR_CODES = {
  // Umum
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,

  // Auth
  EMAIL_ALREADY_REGISTERED: 409,
  INVALID_CREDENTIALS: 401,
  EMAIL_NOT_VERIFIED: 403,
  INVALID_OR_EXPIRED_TOKEN: 400,

  // Tryout & Exam Engine
  TRYOUT_NOT_AVAILABLE: 403,
  TRYOUT_ALREADY_COMPLETED: 409,
  EXAM_SESSION_EXPIRED: 400,
  EXAM_ALREADY_SUBMITTED: 409,
  EXAM_NOT_SUBMITTED: 409,
  DISCUSSION_LOCKED: 403,
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

/** Error yang dilempar dari service layer dan diubah menjadi response oleh `handleApiError`. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = ERROR_CODES[code];
    this.details = details;
  }
}
