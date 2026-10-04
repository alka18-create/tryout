import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { ExamSessionStatus, TryoutStatus } from "@/generated/prisma/client";
import { SaveAnswerInput } from "./exam.schema";

export class ExamService {
  /**
   * Mengambil daftar tryout yang tersedia untuk peserta didik.
   */
  static async getAvailableTryoutsForStudent(studentId: string, subjectId?: string) {
    const tryouts = await prisma.tryout.findMany({
      where: {
        status: TryoutStatus.PUBLISHED,
        ...(subjectId ? { subjectId } : {}),
      },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            tryoutQuestions: true,
          },
        },
        examSessions: {
          where: { userId: studentId },
          orderBy: { startedAt: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
            startedAt: true,
            expiresAt: true,
            submittedAt: true,
            totalScore: true,
            isPassed: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = Date.now();

    return tryouts.map((t) => {
      const latestSession = t.examSessions[0] || null;

      // Cek apakah tryout berada dalam periode aktif
      const isStarted = !t.startDate || new Date(t.startDate).getTime() <= now;
      const isEnded = t.endDate && new Date(t.endDate).getTime() < now;

      let participationStatus: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "EXPIRED" = "NOT_STARTED";
      let remainingSeconds = 0;

      if (latestSession) {
        if (latestSession.status === ExamSessionStatus.IN_PROGRESS) {
          const expiresAtMs = new Date(latestSession.expiresAt).getTime();
          if (now <= expiresAtMs + 15000) {
            participationStatus = "IN_PROGRESS";
            remainingSeconds = Math.max(0, Math.floor((expiresAtMs - now) / 1000));
          } else {
            participationStatus = "EXPIRED";
          }
        } else if (latestSession.status === ExamSessionStatus.SUBMITTED) {
          participationStatus = "SUBMITTED";
        } else {
          participationStatus = "EXPIRED";
        }
      }

      return {
        id: t.id,
        title: t.title,
        description: t.description,
        subject: t.subject,
        durationMinutes: t.durationMinutes,
        passingScore: t.passingScore,
        questionCount: t._count.tryoutQuestions,
        startDate: t.startDate,
        endDate: t.endDate,
        isPeriodActive: isStarted && !isEnded,
        participationStatus,
        remainingSeconds,
        latestSessionId: latestSession?.id || null,
        latestScore: latestSession?.totalScore ?? null,
        isPassed: latestSession?.isPassed ?? null,
      };
    });
  }

  /**
   * Mengambil informasi detail tryout untuk peserta sebelum menekan tombol mulai.
   */
  static async getTryoutDetailForStudent(studentId: string, tryoutId: string) {
    const tryout = await prisma.tryout.findUnique({
      where: { id: tryoutId },
      include: {
        subject: true,
        _count: {
          select: { tryoutQuestions: true },
        },
        examSessions: {
          where: { userId: studentId },
          orderBy: { startedAt: "desc" },
          take: 1,
        },
      },
    });

    if (!tryout || tryout.status !== TryoutStatus.PUBLISHED) {
      throw new AppError("NOT_FOUND", "Paket tryout tidak ditemukan atau belum dipublikasikan.");
    }

    const now = Date.now();
    const isStarted = !tryout.startDate || new Date(tryout.startDate).getTime() <= now;
    const isEnded = tryout.endDate && new Date(tryout.endDate).getTime() < now;

    const latestSession = tryout.examSessions[0] || null;
    let participationStatus: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "EXPIRED" = "NOT_STARTED";
    let remainingSeconds = 0;

    if (latestSession) {
      if (latestSession.status === ExamSessionStatus.IN_PROGRESS) {
        const expiresAtMs = new Date(latestSession.expiresAt).getTime();
        if (now <= expiresAtMs + 15000) {
          participationStatus = "IN_PROGRESS";
          remainingSeconds = Math.max(0, Math.floor((expiresAtMs - now) / 1000));
        } else {
          participationStatus = "EXPIRED";
        }
      } else if (latestSession.status === ExamSessionStatus.SUBMITTED) {
        participationStatus = "SUBMITTED";
      } else {
        participationStatus = "EXPIRED";
      }
    }

    return {
      id: tryout.id,
      title: tryout.title,
      description: tryout.description,
      subject: tryout.subject,
      durationMinutes: tryout.durationMinutes,
      passingScore: tryout.passingScore,
      questionCount: tryout._count.tryoutQuestions,
      discussionVisibility: tryout.discussionVisibility,
      startDate: tryout.startDate,
      endDate: tryout.endDate,
      isPeriodActive: isStarted && !isEnded,
      participationStatus,
      remainingSeconds,
      activeSessionId: latestSession?.id || null,
      latestScore: latestSession?.totalScore ?? null,
      isPassed: latestSession?.isPassed ?? null,
    };
  }

  /**
   * Memulai sesi ujian baru atau menyambung sesi yang sedang berjalan (Idempotent Resume).
   */
  static async startOrResumeExamSession(studentId: string, tryoutId: string) {
    const tryout = await prisma.tryout.findUnique({
      where: { id: tryoutId },
      include: {
        tryoutQuestions: {
          orderBy: { orderNumber: "asc" },
        },
      },
    });

    if (!tryout || tryout.status !== TryoutStatus.PUBLISHED) {
      throw new AppError("NOT_FOUND", "Paket tryout tidak ditemukan atau belum dipublikasikan.");
    }

    if (tryout.tryoutQuestions.length === 0) {
      throw new AppError("VALIDATION_ERROR", "Paket tryout belum memiliki butir soal.");
    }

    const now = Date.now();

    // Validasi periode aktif tryout
    if (tryout.startDate && new Date(tryout.startDate).getTime() > now) {
      throw new AppError("VALIDATION_ERROR", "Paket tryout ini belum dibuka untuk peserta.");
    }
    if (tryout.endDate && new Date(tryout.endDate).getTime() < now) {
      throw new AppError("VALIDATION_ERROR", "Periode pengerjaan tryout ini telah berakhir.");
    }

    // 1. Cek sesi IN_PROGRESS yang masih aktif (Idempotent Resume)
    const activeSession = await prisma.examSession.findFirst({
      where: {
        tryoutId,
        userId: studentId,
        status: ExamSessionStatus.IN_PROGRESS,
      },
      orderBy: { startedAt: "desc" },
    });

    if (activeSession) {
      const expiresAtMs = new Date(activeSession.expiresAt).getTime();

      // Jika waktu masih berlaku (termasuk toleransi 15 detik)
      if (now <= expiresAtMs + 15000) {
        const remainingSeconds = Math.max(0, Math.floor((expiresAtMs - now) / 1000));
        return {
          sessionId: activeSession.id,
          tryoutId: activeSession.tryoutId,
          startedAt: activeSession.startedAt.toISOString(),
          expiresAt: activeSession.expiresAt.toISOString(),
          remainingSeconds,
          isResumed: true,
        };
      } else {
        // Otomatis submit karena waktu sudah habis
        await this.submitExamSession(studentId, activeSession.id, true);
        throw new AppError(
          "EXAM_SESSION_EXPIRED",
          "Waktu pengerjaan tryout Anda telah habis dan sesi telah diselesaikan otomatis.",
        );
      }
    }

    // 2. Cek apakah sudah pernah menyelesaikan tryout ini sebelumnya
    const finishedSession = await prisma.examSession.findFirst({
      where: {
        tryoutId,
        userId: studentId,
        status: { in: [ExamSessionStatus.SUBMITTED, ExamSessionStatus.EXPIRED] },
      },
    });

    if (finishedSession) {
      throw new AppError(
        "EXAM_ALREADY_SUBMITTED",
        "Anda telah menyelesaikan tryout ini dan tidak dapat mengulanginya lagi.",
      );
    }

    // 3. Buat sesi ujian baru dalam 1 transaksi
    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + tryout.durationMinutes * 60 * 1000);

    const newSession = await prisma.$transaction(async (tx) => {
      const session = await tx.examSession.create({
        data: {
          tryoutId,
          userId: studentId,
          startedAt,
          expiresAt,
          status: ExamSessionStatus.IN_PROGRESS,
        },
      });

      // Siapkan baris jawaban kosong untuk setiap soal tryout
      const answersData = tryout.tryoutQuestions.map((tq) => ({
        examSessionId: session.id,
        questionId: tq.questionId,
        isFlagged: false,
      }));

      await tx.examAnswer.createMany({
        data: answersData,
      });

      return session;
    });

    const remainingSeconds = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));

    return {
      sessionId: newSession.id,
      tryoutId: newSession.tryoutId,
      startedAt: newSession.startedAt.toISOString(),
      expiresAt: newSession.expiresAt.toISOString(),
      remainingSeconds,
      isResumed: false,
    };
  }

  /**
   * Mengambil lembar kerja ujian peserta dengan SANITASI PAYLOAD KETAT.
   * Kunci jawaban (isCorrect) dan pembahasan (explanation) TIDAK PERNAH dikirim ke client.
   */
  static async getSanitizedExamSession(studentId: string, sessionId: string) {
    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        tryout: {
          include: {
            subject: true,
            tryoutQuestions: {
              orderBy: { orderNumber: "asc" },
            },
          },
        },
        answers: {
          include: {
            question: {
              include: {
                options: {
                  orderBy: { label: "asc" },
                },
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new AppError("NOT_FOUND", "Sesi ujian tidak ditemukan.");
    }

    if (session.userId !== studentId) {
      throw new AppError("FORBIDDEN", "Anda tidak memiliki akses ke sesi ujian ini.");
    }

    const now = Date.now();
    const expiresAtMs = new Date(session.expiresAt).getTime();

    // Auto-expire jika waktu pengerjaan habis saat diakses
    if (session.status === ExamSessionStatus.IN_PROGRESS && now > expiresAtMs + 15000) {
      await this.submitExamSession(studentId, session.id, true);
      session.status = ExamSessionStatus.EXPIRED;
    }

    const remainingSeconds =
      session.status === ExamSessionStatus.IN_PROGRESS
        ? Math.max(0, Math.floor((expiresAtMs - now) / 1000))
        : 0;

    // Buat map orderNumber dari tryoutQuestions
    const orderMap = new Map<string, { orderNumber: number; weight: number }>();
    session.tryout.tryoutQuestions.forEach((tq) => {
      orderMap.set(tq.questionId, { orderNumber: tq.orderNumber, weight: tq.weight });
    });

    // Sanitasi payload soal
    const sanitizedQuestions = session.answers
      .map((ans) => {
        const orderInfo = orderMap.get(ans.questionId) || { orderNumber: 1, weight: 1 };
        return {
          orderNumber: orderInfo.orderNumber,
          weight: orderInfo.weight,
          questionId: ans.questionId,
          content: ans.question.content,
          imageUrl: ans.question.imageUrl,
          options: ans.question.options.map((opt) => ({
            id: opt.id,
            label: opt.label,
            content: opt.content,
            imageUrl: opt.imageUrl,
            // STRICT SECURITY: isCorrect DIHAPUS DARI PAYLOAD
          })),
          selectedOptionId: ans.selectedOptionId,
          isFlagged: ans.isFlagged,
          // STRICT SECURITY: explanation DIHAPUS SELAMA UJIAN
        };
      })
      .sort((a, b) => a.orderNumber - b.orderNumber);

    return {
      id: session.id,
      tryoutId: session.tryoutId,
      tryoutTitle: session.tryout.title,
      subjectName: session.tryout.subject.name,
      status: session.status,
      durationMinutes: session.tryout.durationMinutes,
      startedAt: session.startedAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      remainingSeconds,
      totalQuestions: sanitizedQuestions.length,
      questions: sanitizedQuestions,
    };
  }

  /**
   * Autosave pilihan jawaban atau tanda ragu-ragu peserta.
   */
  static async saveAnswer(studentId: string, sessionId: string, input: SaveAnswerInput) {
    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new AppError("NOT_FOUND", "Sesi ujian tidak ditemukan.");
    }

    if (session.userId !== studentId) {
      throw new AppError("FORBIDDEN", "Anda tidak berhak memperbarui lembar ujian ini.");
    }

    if (session.status !== ExamSessionStatus.IN_PROGRESS) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Jawaban tidak dapat disimpan karena sesi ujian sudah selesai.",
      );
    }

    const now = Date.now();
    const expiresAtMs = new Date(session.expiresAt).getTime();

    // Toleransi keterlambatan jaringan (grace period 15 detik)
    if (now > expiresAtMs + 15000) {
      await this.submitExamSession(studentId, session.id, true);
      throw new AppError(
        "EXAM_SESSION_EXPIRED",
        "Waktu ujian telah berakhir. Jawaban Anda tidak dapat disimpan.",
      );
    }

    // Validasi apakah opsi yang dipilih benar-benar milik soal tersebut
    if (input.selectedOptionId) {
      const validOption = await prisma.questionOption.findFirst({
        where: {
          id: input.selectedOptionId,
          questionId: input.questionId,
        },
      });

      if (!validOption) {
        throw new AppError("VALIDATION_ERROR", "Pilihan opsi tidak valid untuk soal ini.");
      }
    }

    // Update baris jawaban pada database
    const updatedAnswer = await prisma.examAnswer.update({
      where: {
        examSessionId_questionId: {
          examSessionId: sessionId,
          questionId: input.questionId,
        },
      },
      data: {
        selectedOptionId: input.selectedOptionId || null,
        isFlagged: input.isFlagged,
        answeredAt: input.selectedOptionId ? new Date() : null,
      },
    });

    return {
      questionId: updatedAnswer.questionId,
      selectedOptionId: updatedAnswer.selectedOptionId,
      isFlagged: updatedAnswer.isFlagged,
      savedAt: updatedAnswer.answeredAt ? updatedAnswer.answeredAt.toISOString() : new Date().toISOString(),
    };
  }

  /**
   * Submit dan kalkulasi penilaian ujian secara otomatis dan idempotent.
   */
  static async submitExamSession(studentId: string, sessionId: string, isAutoExpired = false) {
    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        tryout: {
          include: {
            tryoutQuestions: true,
          },
        },
        answers: {
          include: {
            question: {
              include: {
                options: true,
                topic: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new AppError("NOT_FOUND", "Sesi ujian tidak ditemukan.");
    }

    if (session.userId !== studentId) {
      throw new AppError("FORBIDDEN", "Anda tidak memiliki akses untuk submit ujian ini.");
    }

    // Idempotent: jika sudah dinilai / disubmit sebelumnya, kembalikan hasil langsung
    if (
      session.status === ExamSessionStatus.SUBMITTED ||
      session.status === ExamSessionStatus.EXPIRED
    ) {
      return {
        sessionId: session.id,
        totalScore: session.totalScore ?? 0,
        isPassed: session.isPassed ?? false,
        status: session.status,
        submittedAt: session.submittedAt?.toISOString() || session.expiresAt.toISOString(),
      };
    }

    // 1. Buat map bobot soal berdasarkan tryoutQuestions
    const weightMap = new Map<string, number>();
    let totalMaxWeight = 0;
    session.tryout.tryoutQuestions.forEach((tq) => {
      weightMap.set(tq.questionId, tq.weight);
      totalMaxWeight += tq.weight;
    });

    // 2. Evaluasi setiap butir jawaban
    let totalEarnedScore = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    // Map untuk agregasi nilai per topik
    const topicStats = new Map<
      string,
      { total: number; correct: number; wrong: number }
    >();

    const answerUpdates: Array<{
      id: string;
      isCorrect: boolean;
      score: number;
    }> = [];

    for (const ans of session.answers) {
      const qWeight = weightMap.get(ans.questionId) || 1.0;
      const topicId = ans.question.topicId;

      if (!topicStats.has(topicId)) {
        topicStats.set(topicId, { total: 0, correct: 0, wrong: 0 });
      }
      const stat = topicStats.get(topicId)!;
      stat.total += 1;

      if (!ans.selectedOptionId) {
        // Kosong
        unansweredCount++;
        answerUpdates.push({
          id: ans.id,
          isCorrect: false,
          score: 0,
        });
      } else {
        const chosenOpt = ans.question.options.find((o) => o.id === ans.selectedOptionId);
        if (chosenOpt && chosenOpt.isCorrect) {
          // Benar
          correctCount++;
          stat.correct += 1;
          totalEarnedScore += qWeight;
          answerUpdates.push({
            id: ans.id,
            isCorrect: true,
            score: qWeight,
          });
        } else {
          // Salah
          wrongCount++;
          stat.wrong += 1;
          answerUpdates.push({
            id: ans.id,
            isCorrect: false,
            score: 0,
          });
        }
      }
    }

    // Hitung total nilai (Skala 0 - 100)
    const finalScore =
      totalMaxWeight > 0 ? (totalEarnedScore / totalMaxWeight) * 100 : 0;
    const roundedScore = Math.round(finalScore * 10) / 10;
    const isPassed = roundedScore >= session.tryout.passingScore;
    const finalStatus = isAutoExpired ? ExamSessionStatus.EXPIRED : ExamSessionStatus.SUBMITTED;
    const submittedAt = new Date();

    // 3. Simpan seluruh hasil dalam 1 transaksi
    await prisma.$transaction(async (tx) => {
      // Update skor setiap baris jawaban
      for (const update of answerUpdates) {
        await tx.examAnswer.update({
          where: { id: update.id },
          data: {
            isCorrect: update.isCorrect,
            scoreObtained: update.score,
          },
        });
      }

      // Hapus jika ada topic score lama, lalu re-insert
      await tx.examTopicScore.deleteMany({
        where: { examSessionId: session.id },
      });

      for (const [tId, tStat] of topicStats.entries()) {
        const percentage = tStat.total > 0 ? (tStat.correct / tStat.total) * 100 : 0;
        await tx.examTopicScore.create({
          data: {
            examSessionId: session.id,
            topicId: tId,
            totalCount: tStat.total,
            correctCount: tStat.correct,
            percentage: Math.round(percentage * 10) / 10,
          },
        });
      }

      // Update status sesi ujian
      await tx.examSession.update({
        where: { id: session.id },
        data: {
          status: finalStatus,
          totalScore: roundedScore,
          correctCount,
          wrongCount,
          unansweredCount,
          isPassed,
          submittedAt,
        },
      });
    });

    return {
      sessionId: session.id,
      totalScore: roundedScore,
      correctCount,
      wrongCount,
      unansweredCount,
      isPassed,
      status: finalStatus,
      submittedAt: submittedAt.toISOString(),
    };
  }
}
