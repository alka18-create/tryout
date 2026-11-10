import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { UserRole, TryoutStatus, QuestionType, ScoringMode, SkdSection } from "@/generated/prisma/client";
import { sortMatrixOptions } from "@/lib/matrix-question";
import type { CreateTryoutInput, SetTryoutQuestionsInput } from "./tryout.schema";

export class TryoutService {
  /**
   * Menampilkan daftar paket tryout milik guru (atau semua jika Admin).
   */
  static async listTryouts(teacherId?: string, role?: UserRole) {
    const where = role === UserRole.ADMIN ? {} : { createdById: teacherId };

    return prisma.tryout.findMany({
      where,
      include: {
        subject: { select: { id: true, name: true, code: true } },
        author: { select: { id: true, name: true, email: true } },
        _count: {
          select: {
            tryoutQuestions: true,
            examSessions: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Mengambil detail tryout beserta daftar soal yang terhubung.
   * Otorisasi: guru hanya boleh mengakses tryout miliknya sendiri; Admin bebas.
   */
  static async getTryoutById(id: string, requesterId?: string, role?: UserRole) {
    const tryout = await prisma.tryout.findUnique({
      where: { id },
      include: {
        subject: true,
        author: { select: { id: true, name: true } },
        tryoutQuestions: {
          orderBy: { orderNumber: "asc" },
          include: {
            question: {
              include: {
                topic: true,
                options: { orderBy: { label: "asc" } },
              },
            },
          },
        },
        _count: {
          select: {
            examSessions: true,
          },
        },
      },
    });

    if (!tryout) {
      throw new AppError("NOT_FOUND", "Paket tryout tidak ditemukan.");
    }

    if (requesterId && role !== UserRole.ADMIN && tryout.createdById !== requesterId) {
      throw new AppError("FORBIDDEN", "Anda tidak memiliki izin melihat paket tryout ini.");
    }

    return {
      ...tryout,
      tryoutQuestions: tryout.tryoutQuestions.map((item) => ({
        ...item,
        question:
          item.question.type === QuestionType.MATRIX
            ? { ...item.question, options: sortMatrixOptions(item.question.options) }
            : item.question,
      })),
    };
  }

  /**
   * Membuat paket tryout baru.
   */
  static async createTryout(teacherId: string, input: CreateTryoutInput) {
    const startDate = input.startDate ? new Date(input.startDate) : null;
    const endDate = input.endDate ? new Date(input.endDate) : null;

    if (startDate && endDate && startDate >= endDate) {
      throw new AppError("VALIDATION_ERROR", "Tanggal mulai tryout harus sebelum tanggal berakhir.");
    }

    return prisma.tryout.create({
      data: {
        title: input.title.trim(),
        description: input.description?.trim() || null,
        subjectId: input.subjectId,
        createdById: teacherId,
        durationMinutes: input.durationMinutes,
        passingScore: input.passingScore,
        scoringMode: input.scoringMode,
        passingTwk: input.passingTwk ?? null,
        passingTiu: input.passingTiu ?? null,
        passingTkp: input.passingTkp ?? null,
        maxAttempts: input.maxAttempts ?? 3,
        questionCount: input.questionCount ?? null,
        status: input.status,
        discussionVisibility: input.discussionVisibility,
        startDate,
        endDate,
      },
      include: {
        subject: true,
      },
    });
  }

  /**
   * Memperbarui informasi umum paket tryout.
   */
  static async updateTryout(
    userId: string,
    role: UserRole,
    tryoutId: string,
    input: Partial<CreateTryoutInput>,
  ) {
    const tryout = await prisma.tryout.findUnique({
      where: { id: tryoutId },
      include: {
        _count: { select: { tryoutQuestions: true } },
      },
    });

    if (!tryout) {
      throw new AppError("NOT_FOUND", "Paket tryout tidak ditemukan.");
    }

    if (tryout.createdById !== userId && role !== UserRole.ADMIN) {
      throw new AppError("FORBIDDEN", "Anda tidak memiliki izin mengedit paket tryout ini.");
    }

    // Validasi Publish: Wajib ada minimal 1 soal sebelum bisa dipublikasikan
    if (input.status === TryoutStatus.PUBLISHED) {
      if (tryout._count.tryoutQuestions === 0) {
        throw new AppError(
          "VALIDATION_ERROR",
          "Paket tryout tidak dapat dipublikasikan karena belum memiliki soal. Silakan susun soal terlebih dahulu.",
        );
      }
      const targetQuestionCount =
        input.questionCount !== undefined ? input.questionCount : tryout.questionCount;
      if (targetQuestionCount && tryout._count.tryoutQuestions < targetQuestionCount) {
        throw new AppError(
          "VALIDATION_ERROR",
          `Paket tryout tidak dapat dipublikasikan karena jumlah butir soal (${tryout._count.tryoutQuestions}) masih kurang dari target soal yang ditampilkan (${targetQuestionCount}). Silakan tambahkan butir soal terlebih dahulu.`,
        );
      }

      // Mode RAW/SKD: wajib memenuhi komposisi CASN (TWK 30, TIU 35, TKP 45).
      const targetScoringMode = input.scoringMode ?? tryout.scoringMode;
      if (targetScoringMode === ScoringMode.RAW) {
        const sectionCounts = await prisma.tryoutQuestion.groupBy({
          by: ["section"],
          where: { tryoutId },
          _count: { _all: true },
        });
        const countMap = new Map<SkdSection | null, number>();
        sectionCounts.forEach((r) => countMap.set(r.section, r._count._all));

        const needs: Array<{ section: SkdSection; need: number; label: string }> = [
          { section: SkdSection.TWK, need: 30, label: "TWK" },
          { section: SkdSection.TIU, need: 35, label: "TIU" },
          { section: SkdSection.TKP, need: 45, label: "TKP" },
        ];
        const mismatches = needs.filter((n) => (countMap.get(n.section) ?? 0) !== n.need);
        if (mismatches.length > 0) {
          const detail = mismatches
            .map((n) => `${n.label} ${countMap.get(n.section) ?? 0}/${n.need}`)
            .join(", ");
          throw new AppError(
            "VALIDATION_ERROR",
            `Paket SKD belum dapat dipublikasikan: komposisi subtes tidak sesuai aturan CASN (${detail}). Wajib TWK 30, TIU 35, TKP 45.`,
          );
        }
      }
    }

    const startDate = input.startDate !== undefined ? (input.startDate ? new Date(input.startDate) : null) : undefined;
    const endDate = input.endDate !== undefined ? (input.endDate ? new Date(input.endDate) : null) : undefined;

    return prisma.tryout.update({
      where: { id: tryoutId },
      data: {
        ...(input.title ? { title: input.title.trim() } : {}),
        ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
        ...(input.subjectId ? { subjectId: input.subjectId } : {}),
        ...(input.durationMinutes ? { durationMinutes: input.durationMinutes } : {}),
        ...(input.passingScore !== undefined ? { passingScore: input.passingScore } : {}),
        ...(input.scoringMode ? { scoringMode: input.scoringMode } : {}),
        ...(input.passingTwk !== undefined ? { passingTwk: input.passingTwk } : {}),
        ...(input.passingTiu !== undefined ? { passingTiu: input.passingTiu } : {}),
        ...(input.passingTkp !== undefined ? { passingTkp: input.passingTkp } : {}),
        ...(input.maxAttempts !== undefined ? { maxAttempts: input.maxAttempts } : {}),
        ...(input.questionCount !== undefined ? { questionCount: input.questionCount } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.discussionVisibility ? { discussionVisibility: input.discussionVisibility } : {}),
        ...(startDate !== undefined ? { startDate } : {}),
        ...(endDate !== undefined ? { endDate } : {}),
      },
      include: {
        subject: true,
      },
    });
  }

  /**
   * Menyusun daftar soal, nomor urut (orderNumber), dan bobot nilai tryout.
   */
  static async setTryoutQuestions(
    userId: string,
    role: UserRole,
    tryoutId: string,
    input: SetTryoutQuestionsInput,
  ) {
    const tryout = await prisma.tryout.findUnique({
      where: { id: tryoutId },
      include: {
        _count: { select: { examSessions: true } },
      },
    });

    if (!tryout) {
      throw new AppError("NOT_FOUND", "Paket tryout tidak ditemukan.");
    }

    if (tryout.createdById !== userId && role !== UserRole.ADMIN) {
      throw new AppError("FORBIDDEN", "Anda tidak memiliki izin menyusun soal pada tryout ini.");
    }

    // Integritas Ujian: Kunci susunan soal jika sudah ada peserta yang mengerjakan/memulai
    if (tryout._count.examSessions > 0) {
      throw new AppError(
        "CONFLICT",
        "Susunan soal tryout terkunci permanen karena paket ini sudah memiliki data pengerjaan peserta.",
      );
    }

    // Mode skor mentah (mis. SKD) wajib menandai kategori subtes setiap soal
    // agar skor per subtes dan ambang batas dapat dihitung dengan benar.
    if (tryout.scoringMode === ScoringMode.RAW) {
      const missingSection = input.questions.find((q) => !q.section);
      if (missingSection) {
        throw new AppError(
          "VALIDATION_ERROR",
          "Setiap soal pada tryout dengan mode skor mentah (SKD) wajib memiliki kategori subtes (TWK/TIU/TKP).",
        );
      }

      // Urutan soal SKD selalu TWK → TIU → TKP (nomor 1-30, 31-65, 66-110).
      // Urutan relatif antar anggota dalam satu subtes dipertahankan; nomor urut global ditetapkan ulang 1..N.
      const sectionPriority: Record<SkdSection, number> = {
        [SkdSection.TWK]: 0,
        [SkdSection.TIU]: 1,
        [SkdSection.TKP]: 2,
      };
      input.questions.sort((a, b) => {
        const priorityA = sectionPriority[a.section!];
        const priorityB = sectionPriority[b.section!];
        return priorityA !== priorityB ? priorityA - priorityB : (a.orderNumber ?? 0) - (b.orderNumber ?? 0);
      });
      input.questions.forEach((q, idx) => {
        q.orderNumber = idx + 1;
      });
    }

    return prisma.$transaction(async (tx) => {
      // 1. Hapus relasi soal lama pada tryout ini
      await tx.tryoutQuestion.deleteMany({
        where: { tryoutId },
      });

      // 2. Buat relasi baru dengan urutan dan bobot yang ditentukan
      const createdRelations = await Promise.all(
        input.questions.map((q) =>
          tx.tryoutQuestion.create({
            data: {
              tryoutId,
              questionId: q.questionId,
              orderNumber: q.orderNumber,
              weight: q.weight ?? 1.0,
              section: q.section ?? null,
            },
          }),
        ),
      );

      return createdRelations;
    });
  }

  /**
   * Menghapus atau mengarsipkan tryout.
   */
  static async deleteTryout(userId: string, role: UserRole, tryoutId: string) {
    const tryout = await prisma.tryout.findUnique({
      where: { id: tryoutId },
      include: {
        _count: { select: { examSessions: true } },
      },
    });

    if (!tryout) {
      throw new AppError("NOT_FOUND", "Paket tryout tidak ditemukan.");
    }

    if (tryout.createdById !== userId && role !== UserRole.ADMIN) {
      throw new AppError("FORBIDDEN", "Anda tidak memiliki izin menghapus paket tryout ini.");
    }

    // Jika sudah ada peserta yang mengerjakan, jangan hapus hard delete -> ubah status ke ARCHIVED
    if (tryout._count.examSessions > 0) {
      await prisma.tryout.update({
        where: { id: tryoutId },
        data: { status: TryoutStatus.ARCHIVED },
      });
      return {
        archived: true,
        message: "Paket tryout diarsipkan (ARCHIVED) untuk menjaga riwayat nilai peserta.",
      };
    }

    // Jika belum ada pengerjaan, hapus permanen
    await prisma.tryout.delete({
      where: { id: tryoutId },
    });

    return {
      archived: false,
      message: "Paket tryout berhasil dihapus permanen.",
    };
  }
}
