import { NextRequest } from "next/server";
import { requireRole } from "@/modules/auth/auth.guard";
import { UserRole } from "@/generated/prisma/client";
import { QuestionBankService } from "@/modules/question-bank/question.service";
import { topicSchema } from "@/modules/question-bank/question.schema";
import { ok, created, handleApiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    await requireRole([UserRole.TEACHER, UserRole.ADMIN]);
    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId") || undefined;
    const topics = await QuestionBankService.listTopics(subjectId);
    return ok(topics);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole([UserRole.TEACHER, UserRole.ADMIN]);
    const json = await req.json();
    const validated = topicSchema.parse(json);
    const topic = await QuestionBankService.createTopic(validated);
    return created(topic, "Topik materi berhasil ditambahkan.");
  } catch (error) {
    return handleApiError(error);
  }
}
