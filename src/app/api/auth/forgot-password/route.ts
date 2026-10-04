import { NextRequest } from "next/server";
import { forgotPasswordSchema } from "@/modules/auth/auth.schema";
import { AuthService } from "@/modules/auth/auth.service";
import { ok, handleApiError } from "@/lib/api-response";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    // Batasi request reset password maksimal 5 request per 15 menit per IP
    enforceRateLimit(req, {
      prefix: "auth:forgot-password",
      max: 5,
      windowMs: 15 * 60 * 1000,
    });

    const json = await req.json();
    const validated = forgotPasswordSchema.parse(json);
    const result = await AuthService.createPasswordResetToken(validated.email);

    return ok(result, result.message);
  } catch (error) {
    return handleApiError(error);
  }
}
