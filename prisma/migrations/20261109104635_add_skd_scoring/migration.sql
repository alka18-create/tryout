-- CreateEnum
CREATE TYPE "ScoringMode" AS ENUM ('NORMALIZED', 'RAW');

-- CreateEnum
CREATE TYPE "SkdSection" AS ENUM ('TWK', 'TIU', 'TKP');

-- AlterEnum
ALTER TYPE "QuestionType" ADD VALUE 'WEIGHTED_CHOICE';

-- AlterTable
ALTER TABLE "question_options" ADD COLUMN     "score" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "tryout_questions" ADD COLUMN     "section" "SkdSection";

-- AlterTable
ALTER TABLE "tryouts" ADD COLUMN     "passing_tiu" DOUBLE PRECISION,
ADD COLUMN     "passing_tkp" DOUBLE PRECISION,
ADD COLUMN     "passing_twk" DOUBLE PRECISION,
ADD COLUMN     "scoring_mode" "ScoringMode" NOT NULL DEFAULT 'NORMALIZED';

-- CreateTable
CREATE TABLE "exam_section_scores" (
    "id" TEXT NOT NULL,
    "exam_session_id" TEXT NOT NULL,
    "section" "SkdSection" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "max_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "correct_count" INTEGER NOT NULL DEFAULT 0,
    "total_count" INTEGER NOT NULL DEFAULT 0,
    "is_passed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "exam_section_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exam_section_scores_exam_session_id_idx" ON "exam_section_scores"("exam_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_section_scores_exam_session_id_section_key" ON "exam_section_scores"("exam_session_id", "section");

-- AddForeignKey
ALTER TABLE "exam_section_scores" ADD CONSTRAINT "exam_section_scores_exam_session_id_fkey" FOREIGN KEY ("exam_session_id") REFERENCES "exam_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
