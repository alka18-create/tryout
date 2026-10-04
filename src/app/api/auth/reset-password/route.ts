import { NextRequest } from "next/server";
import { resetPasswordSchema } from "@/modules/auth/auth.schema";
import { AuthService } from "@/modules/auth/auth.service";
import { ok, handleApiError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const validated = resetPasswordSchema.parse(json);
    const result = await AuthService.resetPassword(validated.token, validated.password);

    return ok(result, result.message);
  } catch (error) {
    return handleApiError(error);
  }
}
