import { NextRequest } from "next/server";
import { resetPasswordSchema } from "@/modules/auth/auth.schema";
import { AuthService } from "@/modules/auth/auth.service";
import { ok, handleApiError } from "@/lib/api-response";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    // Batasi reset password maksimal 10 request per 15 menit per IP
    enforceRateLimit(req, {
      prefix: "auth:reset-password",
      max: 10,
      windowMs: 15 * 60 * 1000,
    });

    const json = await req.json();
    const validated = resetPasswordSchema.parse(json);
    const result = await AuthService.resetPassword(validated.token, validated.password);

    return ok(result, result.message);
  } catch (error) {
    return handleApiError(error);
  }
}
