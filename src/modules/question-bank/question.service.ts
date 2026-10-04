import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { UserRole } from "@/generated/prisma/client";
import type {
  SubjectInput,
  TopicInput,
  QuestionInput,
  QuestionFilter,
} from "./question.schema";

export class QuestionBankService {
  // ─── 1. SUBJECTS ──────────────────────────────────────────────────────────

  static async listSubjects() {
    return prisma.subject.findMany({
      include: {
        _count: {
          select: { topics: true, tryouts: true },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  static async createSubject(input: SubjectInput) {
    const existing = await prisma.subject.findFirst({
      where: {
        OR: [
          { name: { equals: input.name.trim(), mode: "insensitive" } },
          { code: { equals: input.code.trim().toUpperCase() } },
        ],
      },
    });

    if (existing) {
      throw new AppError("CONFLICT", "Nama atau kode mata pelajaran sudah terdaftar.");
    }

    return prisma.subject.create({
      data: {
        name: input.name.trim(),
        code: input.code.trim().toUpperCase(),
        description: input.description || null,
      },
    });
  }

  // ─── 2. TOPICS ────────────────────────────────────────────────────────────

  static async listTopics(subjectId?: string) {
    return prisma.topic.findMany({
      where: subjectId ? { subjectId } : undefined,
      include: {
        subject: { select: { id: true, name: true, code: true } },
        _count: { select: { questions: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  static async createTopic(input: TopicInput) {
    const existing = await prisma.topic.findFirst({
      where: {
        subjectId: input.subjectId,
        name: { equals: input.name.trim(), mode: "insensitive" },
      },
    });

    if (existing) {
      throw new AppError("CONFLICT", "Topik materi dengan nama ini sudah ada pada mata pelajaran tersebut.");
    }

    return prisma.topic.create({
      data: {
        subjectId: input.subjectId,
        name: input.name.trim(),
        description: input.description || null,
      },
      include: {
        subject: true,
      },
    });
  }

  // ─── 3. QUESTIONS ─────────────────────────────────────────────────────────

  static async listQuestions(filter: QuestionFilter) {
    const { search, subjectId, topicId, difficulty, page, limit } = filter;
    const skip = (page - 1) * limit;

    const where: any = {
      isActive: true,
    };

    if (topicId) {
      where.topicId = topicId;
    } else if (subjectId) {
      where.topic = { subjectId };
    }

    if (difficulty) {
      where.difficulty = difficulty;
    }

    if (search && search.trim().length > 0) {
      where.OR = [
        { content: { contains: search.trim(), mode: "insensitive" } },
        { explanation: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    const [total, questions] = await Promise.all([
      prisma.question.count({ where }),
      prisma.question.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          topic: {
            include: {
              subject: { select: { id: true, name: true, code: true } },
            },
          },
          options: {
            orderBy: { label: "asc" },
          },
          author: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { inTryouts: true },
          },
        },
      }),
    ]);

    return {
      questions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getQuestionById(id: string) {
    const question = await prisma.question.findUnique({
      where: { id },
      include: {
        topic: {
          include: {
            subject: true,
          },
        },
        options: {
          orderBy: { label: "asc" },
        },
        author: {
          select: { id: true, name: true },
        },
        _count: {
          select: { inTryouts: true },
        },
      },
    });

    if (!question || !question.isActive) {
      throw new AppError("NOT_FOUND", "Soal tidak ditemukan atau telah dihapus.");
    }

    return question;
  }

  static async createQuestion(teacherId: string, input: QuestionInput) {
    return prisma.question.create({
      data: {
        topicId: input.topicId,
        createdById: teacherId,
        content: input.content.trim(),
        difficulty: input.difficulty,
        imageUrl: input.imageUrl || null,
        explanation: input.explanation?.trim() || null,
        explanationImageUrl: input.explanationImageUrl || null,
        options: {
          create: input.options.map((opt) => ({
            label: opt.label,
            content: opt.content.trim(),
            imageUrl: opt.imageUrl || null,
            isCorrect: opt.isCorrect,
          })),
        },
      },
      include: {
        topic: {
          include: { subject: true },
        },
        options: {
          orderBy: { label: "asc" },
        },
      },
    });
  }

  static async updateQuestion(
    userId: string,
    userRole: UserRole,
    questionId: string,
    input: QuestionInput,
  ) {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { options: true },
    });

    if (!question || !question.isActive) {
      throw new AppError("NOT_FOUND", "Soal tidak ditemukan.");
    }

    // Otorisasi: Hanya pembuat soal atau Admin yang boleh mengubah
    if (question.createdById !== userId && userRole !== UserRole.ADMIN) {
      throw new AppError("FORBIDDEN", "Anda tidak memiliki izin untuk mengedit soal ini.");
    }

    return prisma.$transaction(async (tx) => {
      // 1. Update data induk soal
      await tx.question.update({
        where: { id: questionId },
        data: {
          topicId: input.topicId,
          content: input.content.trim(),
          difficulty: input.difficulty,
          imageUrl: input.imageUrl || null,
          explanation: input.explanation?.trim() || null,
          explanationImageUrl: input.explanationImageUrl || null,
        },
      });

      // 2. Update opsi jawaban (upsert per label A-E)
      for (const opt of input.options) {
        await tx.questionOption.upsert({
          where: {
            questionId_label: {
              questionId,
              label: opt.label,
            },
          },
          update: {
            content: opt.content.trim(),
            imageUrl: opt.imageUrl || null,
            isCorrect: opt.isCorrect,
          },
          create: {
            questionId,
            label: opt.label,
            content: opt.content.trim(),
            imageUrl: opt.imageUrl || null,
            isCorrect: opt.isCorrect,
          },
        });
      }

      return tx.question.findUnique({
        where: { id: questionId },
        include: {
          topic: { include: { subject: true } },
          options: { orderBy: { label: "asc" } },
        },
      });
    });
  }

  static async deleteQuestion(userId: string, userRole: UserRole, questionId: string) {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        _count: {
          select: {
            inTryouts: true,
            examAnswers: true,
          },
        },
      },
    });

    if (!question || !question.isActive) {
      throw new AppError("NOT_FOUND", "Soal tidak ditemukan.");
    }

    // Otorisasi
    if (question.createdById !== userId && userRole !== UserRole.ADMIN) {
      throw new AppError("FORBIDDEN", "Anda tidak memiliki izin untuk menghapus soal ini.");
    }

    // Integritas data: jika soal sudah terhubung ke tryout atau pernah dijawab peserta,
    // gunakan soft delete agar riwayat hasil ujian peserta tidak rusak!
    if (question._count.inTryouts > 0 || question._count.examAnswers > 0) {
      await prisma.question.update({
        where: { id: questionId },
        data: { isActive: false },
      });
      return {
        softDeleted: true,
        message: "Soal dinonaktifkan (soft delete) karena telah terikat pada paket tryout/sesi ujian.",
      };
    }

    // Jika belum pernah digunakan, dapat dihapus permanen
    await prisma.question.delete({
      where: { id: questionId },
    });

    return {
      softDeleted: false,
      message: "Soal berhasil dihapus permanen.",
    };
  }
}
