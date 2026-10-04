import { NextRequest } from "next/server";
import { forgotPasswordSchema } from "@/modules/auth/auth.schema";
import { AuthService } from "@/modules/auth/auth.service";
import { ok, handleApiError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const validated = forgotPasswordSchema.parse(json);
    const result = await AuthService.createPasswordResetToken(validated.email);

    return ok(result, result.message);
  } catch (error) {
    return handleApiError(error);
  }
}
