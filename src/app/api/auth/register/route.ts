import { NextRequest } from "next/server";
import { registerSchema } from "@/modules/auth/auth.schema";
import { AuthService } from "@/modules/auth/auth.service";
import { created, handleApiError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const validated = registerSchema.parse(json);
    const user = await AuthService.registerStudent(validated);

    return created(user, "Pendaftaran berhasil! Silakan login untuk melanjutkan.");
  } catch (error) {
    return handleApiError(error);
  }
}
