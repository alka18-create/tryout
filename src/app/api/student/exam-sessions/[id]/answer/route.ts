import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { ok, fail, handleApiError } from "@/lib/api-response";
import { ExamService } from "@/modules/exam/exam.service";
import { saveAnswerSchema } from "@/modules/exam/exam.schema";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return fail("UNAUTHENTICATED", "Silakan login terlebih dahulu.");
    }

    const { id: sessionId } = await context.params;
    const body = await req.json();

    const parsedData = saveAnswerSchema.parse(body);

    const result = await ExamService.saveAnswer(
      session.user.id,
      sessionId,
      parsedData
    );

    return ok(result, "Jawaban berhasil disimpan.");
  } catch (err: any) {
    return handleApiError(err);
  }
}
