import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { ExamSessionStatus, DiscussionVisibility } from "@/generated/prisma/client";
import { shuffleArrayWithSeed, shuffleQuestionOptions } from "@/lib/randomizer";

export class ScoringService {
  /**
   * Mengambil rincian hasil ujian peserta beserta diagnostik penguasaan topik materi.
   */
  static async getExamSessionResult(studentId: string, sessionId: string) {
    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        tryout: {
          include: {
            subject: true,
          },
        },
        topicScores: {
          include: {
            topic: true,
          },
        },
      },
    });

    if (!session) {
      throw new AppError("NOT_FOUND", "Sesi ujian tidak ditemukan.");
    }

    if (session.userId !== studentId) {
      throw new AppError("FORBIDDEN", "Anda tidak memiliki akses ke hasil ujian ini.");
    }

    if (session.status === ExamSessionStatus.IN_PROGRESS) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Ujian ini masih dalam proses pengerjaan dan belum disubmit."
      );
    }

    // Hitung durasi nyata yang dihabiskan
    const startTime = session.startedAt.getTime();
    const endTime = session.submittedAt ? session.submittedAt.getTime() : session.expiresAt.getTime();
    const durationSpentMinutes = Math.max(1, Math.round((endTime - startTime) / 60000));

    // Diagnostik Materi
    const topicMastery = session.topicScores.map((ts) => ({
      topicId: ts.topicId,
      topicName: ts.topic.name,
      correctCount: ts.correctCount,
      totalCount: ts.totalCount,
      percentage: ts.percentage,
    }));

    // Materi terkuat dan materi yang butuh perbaikan
    const sortedTopics = [...topicMastery].sort((a, b) => b.percentage - a.percentage);
    const strongestTopics = sortedTopics.filter((t) => t.percentage >= 75);
    const improvementTopics = sortedTopics.filter((t) => t.percentage < 70);

    // Ambil seluruh percobaan siswa pada paket tryout ini
    const allAttempts = await prisma.examSession.findMany({
      where: {
        tryoutId: session.tryoutId,
        userId: studentId,
        status: { in: [ExamSessionStatus.SUBMITTED, ExamSessionStatus.EXPIRED] },
      },
      orderBy: { attemptNumber: "asc" },
      select: {
        id: true,
        attemptNumber: true,
        totalScore: true,
        isPassed: true,
        submittedAt: true,
      },
    });

    const maxAttempts = session.tryout.maxAttempts ?? 3;
    const scores = allAttempts.map((a) => a.totalScore);
    const highestScore = scores.length > 0 ? Math.max(...scores) : (session.totalScore ?? 0);
    const isHighestScore = session.totalScore === highestScore;
    const attemptsUsed = allAttempts.length;
    const attemptsRemaining = Math.max(0, maxAttempts - attemptsUsed);

    const now = Date.now();
    const isStarted = !session.tryout.startDate || new Date(session.tryout.startDate).getTime() <= now;
    const isEnded = session.tryout.endDate && new Date(session.tryout.endDate).getTime() < now;
    const canRetake = attemptsRemaining > 0 && isStarted && !isEnded;

    return {
      sessionId: session.id,
      tryoutId: session.tryoutId,
      tryoutTitle: session.tryout.title,
      subjectName: session.tryout.subject.name,
      attemptNumber: session.attemptNumber,
      maxAttempts,
      attemptsUsed,
      attemptsRemaining,
      canRetake,
      highestScore,
      isHighestScore,
      allAttempts: allAttempts.map((a) => ({
        id: a.id,
        attemptNumber: a.attemptNumber,
        totalScore: a.totalScore,
        isPassed: a.isPassed,
        submittedAt: (a.submittedAt || new Date()).toISOString(),
        isHighestScore: a.totalScore === highestScore,
      })),
      totalScore: session.totalScore,
      passingScore: session.tryout.passingScore,
      isPassed: session.isPassed,
      correctCount: session.correctCount,
      wrongCount: session.wrongCount,
      unansweredCount: session.unansweredCount,
      totalQuestions: session.correctCount + session.wrongCount + session.unansweredCount,
      durationSpentMinutes,
      submittedAt: (session.submittedAt || session.expiresAt).toISOString(),
      discussionVisibility: session.tryout.discussionVisibility,
      topicMastery,
      strongestTopics,
      improvementTopics,
    };
  }

  /**
   * Mengambil lembar pembahasan soal lengkap dengan kunci dan analisis pembahasan.
   * Divalidasi dengan kebijakan discussionVisibility paket tryout.
   */
  static async getExamSessionDiscussion(studentId: string, sessionId: string) {
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
                topic: true,
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
      throw new AppError("FORBIDDEN", "Anda tidak memiliki akses ke pembahasan ujian ini.");
    }

    if (session.status === ExamSessionStatus.IN_PROGRESS) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Pembahasan tidak dapat dilihat saat sesi ujian masih berlangsung."
      );
    }

    // Validasi kebijakan discussionVisibility
    const visibility = session.tryout.discussionVisibility;
    const now = Date.now();

    if (visibility === DiscussionVisibility.NEVER) {
      throw new AppError(
        "DISCUSSION_LOCKED",
        "Pembahasan soal dinonaktifkan oleh guru untuk paket tryout ini."
      );
    }

    if (visibility === DiscussionVisibility.AFTER_TRYOUT_CLOSED) {
      if (session.tryout.endDate && now < new Date(session.tryout.endDate).getTime()) {
        throw new AppError(
          "DISCUSSION_LOCKED",
          `Pembahasan baru akan terbuka setelah periode tryout ditutup pada ${new Date(
            session.tryout.endDate
          ).toLocaleString("id-ID")}.`
        );
      }
    }

    // 1. Acak urutan butir soal dengan seed yang sama persis seperti saat ujian berlangsung
    const questionSeed = `${session.id}:questions`;
    const shuffledAnswers = shuffleArrayWithSeed(session.answers, questionSeed);

    const weightMap = new Map<string, number>();
    session.tryout.tryoutQuestions.forEach((tq) => {
      weightMap.set(tq.questionId, tq.weight);
    });

    const discussionQuestions = shuffledAnswers.map((ans, index) => {
      const weight = weightMap.get(ans.questionId) || 1.0;
      const optionSeed = `${session.id}:question:${ans.questionId}:options`;

      const rawOptions = ans.question.options.map((opt) => ({
        id: opt.id,
        label: opt.label,
        content: opt.content,
        imageUrl: opt.imageUrl,
        isCorrect: opt.isCorrect,
      }));

      // Acak opsi jawaban dengan seed yang sama persis
      const shuffledOptions = shuffleQuestionOptions(rawOptions, optionSeed);

      // Cari seluruh opsi yang benar di dalam urutan yang sudah teracak
      const correctOptions = shuffledOptions.filter((o) => o.isCorrect);
      const correctLabels = correctOptions.map((o) => o.label).join(", ");
      const correctOptionIds = correctOptions.map((o) => o.id);

      const selectedIds = ans.selectedOptionIds && ans.selectedOptionIds.length > 0
        ? ans.selectedOptionIds
        : (ans.selectedOptionId ? [ans.selectedOptionId] : []);

      let answerStatus: "CORRECT" | "PARTIAL" | "WRONG" | "EMPTY" = "EMPTY";
      if (selectedIds.length > 0) {
        if (ans.isCorrect) {
          answerStatus = "CORRECT";
        } else if (ans.scoreObtained > 0) {
          answerStatus = "PARTIAL";
        } else {
          answerStatus = "WRONG";
        }
      }

      return {
        orderNumber: index + 1, // Nomor 1 .. N persis sama dengan tampilan lembar ujian siswa
        weight,
        questionId: ans.questionId,
        type: ans.question.type,
        topicName: ans.question.topic.name,
        difficulty: ans.question.difficulty,
        content: ans.question.content,
        imageUrl: ans.question.imageUrl,
        options: shuffledOptions,
        selectedOptionId: ans.selectedOptionId,
        selectedOptionIds: selectedIds,
        correctOptionId: correctOptions[0]?.id || null,
        correctOptionIds,
        correctLabel: correctLabels || "-", // Huruf kunci jawaban (misal "B, D" atau "A")
        answerStatus,
        isFlagged: ans.isFlagged,
        scoreObtained: ans.scoreObtained,
        explanation: ans.question.explanation,
        explanationImageUrl: ans.question.explanationImageUrl,
      };
    });

    return {
      sessionId: session.id,
      tryoutTitle: session.tryout.title,
      subjectName: session.tryout.subject.name,
      totalScore: session.totalScore,
      passingScore: session.tryout.passingScore,
      isPassed: session.isPassed,
      totalQuestions: discussionQuestions.length,
      questions: discussionQuestions,
    };
  }

  /**
   * Mengambil seluruh riwayat tryout peserta beserta data tren perkembangan nilai.
   */
  static async getStudentExamHistory(studentId: string, subjectId?: string) {
    const sessions = await prisma.examSession.findMany({
      where: {
        userId: studentId,
        status: { in: [ExamSessionStatus.SUBMITTED, ExamSessionStatus.EXPIRED] },
        ...(subjectId ? { tryout: { subjectId } } : {}),
      },
      include: {
        tryout: {
          include: {
            subject: true,
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    // Temukan nilai tertinggi per paket tryout
    const bestPerTryout = new Map<
      string,
      { highestScore: number; isPassed: boolean; tryoutTitle: string; submittedAt: string }
    >();

    sessions.forEach((s) => {
      const current = bestPerTryout.get(s.tryoutId);
      if (!current || s.totalScore > current.highestScore) {
        bestPerTryout.set(s.tryoutId, {
          highestScore: s.totalScore,
          isPassed: s.isPassed,
          tryoutTitle: s.tryout.title,
          submittedAt: (s.submittedAt || s.expiresAt).toISOString(),
        });
      }
    });

    const historyItems = sessions.map((s) => {
      const best = bestPerTryout.get(s.tryoutId);
      const isHighestScore = best ? s.totalScore === best.highestScore : true;

      const startTime = s.startedAt.getTime();
      const endTime = s.submittedAt ? s.submittedAt.getTime() : s.expiresAt.getTime();
      const durationSpentMinutes = Math.max(1, Math.round((endTime - startTime) / 60000));

      return {
        sessionId: s.id,
        tryoutId: s.tryoutId,
        tryoutTitle: s.tryout.title,
        subjectId: s.tryout.subjectId,
        subjectName: s.tryout.subject.name,
        attemptNumber: s.attemptNumber,
        maxAttempts: s.tryout.maxAttempts ?? 3,
        isHighestScore,
        totalScore: s.totalScore,
        highestScore: best?.highestScore ?? s.totalScore,
        passingScore: s.tryout.passingScore,
        isPassed: s.isPassed,
        correctCount: s.correctCount,
        wrongCount: s.wrongCount,
        unansweredCount: s.unansweredCount,
        durationSpentMinutes,
        status: s.status,
        submittedAt: (s.submittedAt || s.expiresAt).toISOString(),
      };
    });

    // Metrik ringkasan didasarkan pada nilai tertinggi per paket tryout
    const uniqueTryouts = Array.from(bestPerTryout.values());
    const totalUniqueTryouts = uniqueTryouts.length;
    const totalBestScoreSum = uniqueTryouts.reduce((sum, item) => sum + item.highestScore, 0);
    const passedTryoutsCount = uniqueTryouts.filter((item) => item.isPassed).length;

    const averageScore =
      totalUniqueTryouts > 0 ? Math.round((totalBestScoreSum / totalUniqueTryouts) * 10) / 10 : 0;
    const passingRate =
      totalUniqueTryouts > 0 ? Math.round((passedTryoutsCount / totalUniqueTryouts) * 100) : 0;
    const totalCompleted = totalUniqueTryouts;

    // Data tren perkembangan (urutan kronologis terlama ke terbaru)
    const scoreTrend = [...historyItems]
      .reverse()
      .map((item, index) => ({
        index: index + 1,
        title: `${item.tryoutTitle} (Ke-${item.attemptNumber})`,
        score: item.totalScore,
        date: new Date(item.submittedAt).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
        }),
      }));

    return {
      totalCompleted,
      averageScore,
      passingRate,
      scoreTrend,
      history: historyItems,
    };
  }
}
