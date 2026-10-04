import { NextRequest } from "next/server";
import { registerSchema } from "@/modules/auth/auth.schema";
import { AuthService } from "@/modules/auth/auth.service";
import { created, handleApiError } from "@/lib/api-response";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    // Batasi registrasi maksimal 10 request per menit per IP
    enforceRateLimit(req, {
      prefix: "auth:register",
      max: 10,
      windowMs: 60 * 1000,
    });

    const json = await req.json();
    const validated = registerSchema.parse(json);
    const user = await AuthService.registerStudent(validated);

    return created(user, "Pendaftaran berhasil! Silakan login untuk melanjutkan.");
  } catch (error) {
    return handleApiError(error);
  }
}
