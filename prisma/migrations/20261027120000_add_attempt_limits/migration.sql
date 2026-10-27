-- AlterTable
ALTER TABLE "tryouts" ADD COLUMN IF NOT EXISTS "max_attempts" INTEGER NOT NULL DEFAULT 3;

-- AlterTable
ALTER TABLE "exam_sessions" ADD COLUMN IF NOT EXISTS "attempt_number" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "exam_sessions_user_id_tryout_id_attempt_number_idx" ON "exam_sessions"("user_id", "tryout_id", "attempt_number");
