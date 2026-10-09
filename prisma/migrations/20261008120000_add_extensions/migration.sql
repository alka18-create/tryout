-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE');

-- AlterTable
ALTER TABLE "questions" ADD COLUMN "type" "QuestionType" NOT NULL DEFAULT 'SINGLE_CHOICE';

-- AlterTable
ALTER TABLE "exam_answers" ADD COLUMN "selected_option_ids" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "learning_materials" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'LINK',
    "subject_id" TEXT NOT NULL,
    "topic_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_materials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "learning_materials_subject_id_idx" ON "learning_materials"("subject_id");

-- CreateIndex
CREATE INDEX "learning_materials_topic_id_idx" ON "learning_materials"("topic_id");

-- CreateIndex
CREATE INDEX "learning_materials_created_by_id_idx" ON "learning_materials"("created_by_id");

-- AddForeignKey
ALTER TABLE "learning_materials" ADD CONSTRAINT "learning_materials_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_materials" ADD CONSTRAINT "learning_materials_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_materials" ADD CONSTRAINT "learning_materials_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
