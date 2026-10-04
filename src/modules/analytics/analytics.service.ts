import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { UserRole, ExamSessionStatus } from "@/generated/prisma/client";

export class AnalyticsService {
  /**
   * Mengambil laporan komprehensif suatu paket tryout:
   * - Ringkasan nilai peserta
   * - Daftar siswa beserta skor & status kelulusan
   * - Analisis topik materi terlemah
   * - Analisis butir soal (item difficulty & % benar)
   */
  static async getTryoutReport(tryoutId: string, currentUserId: string, currentUserRole: UserRole) {
    const tryout = await prisma.tryout.findUnique({
      where: { id: tryoutId },
      include: {
        subject: true,
        tryoutQuestions: {
          orderBy: { orderNumber: "asc" },
          include: {
            question: {
              include: {
                topic: true,
                options: true,
              },
            },
          },
        },
      },
    });

    if (!tryout) {
      throw new AppError("NOT_FOUND", "Paket tryout tidak ditemukan.");
    }

    if (currentUserRole !== UserRole.ADMIN && tryout.createdById !== currentUserId) {
      throw new AppError("FORBIDDEN", "Anda tidak memiliki izin melihat laporan tryout ini.");
    }

    // Ambil seluruh sesi ujian yang sudah SUBMITTED atau EXPIRED
    const sessions = await prisma.examSession.findMany({
      where: {
        tryoutId,
        status: { in: [ExamSessionStatus.SUBMITTED, ExamSessionStatus.EXPIRED] },
      },
      include: {
        user: {
          include: {
            school: true,
          },
        },
        answers: true,
        topicScores: {
          include: {
            topic: true,
          },
        },
      },
      orderBy: { totalScore: "desc" },
    });

    const totalParticipants = sessions.length;

    // 1. Ringkasan Metrik
    let averageScore = 0;
    let highestScore = 0;
    let lowestScore = 100;
    let passedCount = 0;

    if (totalParticipants > 0) {
      let scoreSum = 0;
      highestScore = sessions[0].totalScore;
      lowestScore = sessions[sessions.length - 1].totalScore;

      sessions.forEach((s) => {
        scoreSum += s.totalScore;
        if (s.isPassed) passedCount++;
        if (s.totalScore > highestScore) highestScore = s.totalScore;
        if (s.totalScore < lowestScore) lowestScore = s.totalScore;
      });

      averageScore = Math.round((scoreSum / totalParticipants) * 10) / 10;
    } else {
      lowestScore = 0;
    }

    const passingRate =
      totalParticipants > 0 ? Math.round((passedCount / totalParticipants) * 100) : 0;

    // 2. Daftar Peserta
    const participants = sessions.map((s, index) => {
      const startTime = s.startedAt.getTime();
      const endTime = s.submittedAt ? s.submittedAt.getTime() : s.expiresAt.getTime();
      const durationSpentMinutes = Math.max(1, Math.round((endTime - startTime) / 60000));

      return {
        rank: index + 1,
        sessionId: s.id,
        userId: s.user.id,
        name: s.user.name,
        email: s.user.email,
        schoolName: s.user.school?.name || "-",
        schoolClass: s.user.schoolClass || "-",
        totalScore: s.totalScore,
        isPassed: s.isPassed,
        correctCount: s.correctCount,
        wrongCount: s.wrongCount,
        unansweredCount: s.unansweredCount,
        durationSpentMinutes,
        submittedAt: (s.submittedAt || s.expiresAt).toISOString(),
      };
    });

    // 3. Analisis Topik Terlemah (Rata-rata persentase per topik dari seluruh sesi)
    const topicAggMap = new Map<
      string,
      { topicId: string; topicName: string; totalSum: number; count: number }
    >();

    sessions.forEach((s) => {
      s.topicScores.forEach((ts) => {
        if (!topicAggMap.has(ts.topicId)) {
          topicAggMap.set(ts.topicId, {
            topicId: ts.topicId,
            topicName: ts.topic.name,
            totalSum: 0,
            count: 0,
          });
        }
        const current = topicAggMap.get(ts.topicId)!;
        current.totalSum += ts.percentage;
        current.count += 1;
      });
    });

    const topicAnalysis = Array.from(topicAggMap.values())
      .map((t) => ({
        topicId: t.topicId,
        topicName: t.topicName,
        averagePercentage: t.count > 0 ? Math.round((t.totalSum / t.count) * 10) / 10 : 0,
        testedSessions: t.count,
      }))
      .sort((a, b) => a.averagePercentage - b.averagePercentage); // Terendah (terlemah) lebih dulu

    // 4. Analisis Butir Soal (% benar per nomor soal)
    const questionStatsMap = new Map<
      string,
      { correctCount: number; answeredCount: number }
    >();

    sessions.forEach((s) => {
      s.answers.forEach((ans) => {
        if (!questionStatsMap.has(ans.questionId)) {
          questionStatsMap.set(ans.questionId, { correctCount: 0, answeredCount: 0 });
        }
        const stat = questionStatsMap.get(ans.questionId)!;
        if (ans.selectedOptionId) {
          stat.answeredCount += 1;
          if (ans.isCorrect) stat.correctCount += 1;
        }
      });
    });

    const itemAnalysis = tryout.tryoutQuestions.map((tq) => {
      const stat = questionStatsMap.get(tq.questionId) || { correctCount: 0, answeredCount: 0 };
      const correctPercentage =
        totalParticipants > 0 ? Math.round((stat.correctCount / totalParticipants) * 100) : 0;

      let absorptionCategory: "TINGGI" | "SEDANG" | "RENDAH" = "SEDANG";
      if (correctPercentage >= 75) absorptionCategory = "TINGGI";
      else if (correctPercentage < 50) absorptionCategory = "RENDAH";

      return {
        orderNumber: tq.orderNumber,
        questionId: tq.questionId,
        contentSnippet: tq.question.content.slice(0, 120),
        topicName: tq.question.topic.name,
        difficulty: tq.question.difficulty,
        weight: tq.weight,
        correctCount: stat.correctCount,
        totalParticipants,
        correctPercentage,
        absorptionCategory,
      };
    });

    return {
      tryout: {
        id: tryout.id,
        title: tryout.title,
        subjectName: tryout.subject.name,
        durationMinutes: tryout.durationMinutes,
        passingScore: tryout.passingScore,
        questionCount: tryout.tryoutQuestions.length,
      },
      summary: {
        totalParticipants,
        averageScore,
        highestScore,
        lowestScore,
        passedCount,
        passingRate,
      },
      participants,
      topicAnalysis,
      itemAnalysis,
    };
  }

  /**
   * Mengambil daftar seluruh tryout guru beserta ringkasan jumlah peserta dan skor rata-rata.
   */
  static async listTeacherTryoutsWithMetrics(teacherId?: string, role?: UserRole) {
    const where = role === UserRole.ADMIN ? {} : { createdById: teacherId };

    const tryouts = await prisma.tryout.findMany({
      where,
      include: {
        subject: true,
        author: {
          select: { name: true, email: true },
        },
        _count: {
          select: {
            tryoutQuestions: true,
            examSessions: true,
          },
        },
        examSessions: {
          where: {
            status: { in: [ExamSessionStatus.SUBMITTED, ExamSessionStatus.EXPIRED] },
          },
          select: {
            totalScore: true,
            isPassed: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return tryouts.map((t) => {
      const completedSessions = t.examSessions;
      const completedCount = completedSessions.length;

      let avgScore = 0;
      let passedCount = 0;

      if (completedCount > 0) {
        const sum = completedSessions.reduce((acc, s) => acc + s.totalScore, 0);
        avgScore = Math.round((sum / completedCount) * 10) / 10;
        passedCount = completedSessions.filter((s) => s.isPassed).length;
      }

      const passingRate = completedCount > 0 ? Math.round((passedCount / completedCount) * 100) : 0;

      return {
        id: t.id,
        title: t.title,
        subjectName: t.subject.name,
        authorName: t.author.name,
        status: t.status,
        durationMinutes: t.durationMinutes,
        passingScore: t.passingScore,
        questionCount: t._count.tryoutQuestions,
        totalSessions: t._count.examSessions,
        completedCount,
        averageScore: avgScore,
        passingRate,
        createdAt: t.createdAt.toISOString(),
      };
    });
  }

  /**
   * Menghasilkan file CSV teks laporan nilai peserta suatu tryout.
   */
  static async generateTryoutCsv(tryoutId: string, currentUserId: string, currentUserRole: UserRole) {
    const report = await this.getTryoutReport(tryoutId, currentUserId, currentUserRole);

    const headers = [
      "Peringkat",
      "Nama Siswa",
      "Email",
      "Sekolah",
      "Kelas",
      "Skor Ujian",
      "KKM",
      "Status",
      "Benar",
      "Salah",
      "Kosong",
      "Durasi (Menit)",
      "Tanggal Selesai",
    ];

    const rows = report.participants.map((p) => [
      p.rank,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.email.replace(/"/g, '""')}"`,
      `"${p.schoolName.replace(/"/g, '""')}"`,
      `"${p.schoolClass.replace(/"/g, '""')}"`,
      p.totalScore,
      report.tryout.passingScore,
      p.isPassed ? "LULUS" : "BELUM LULUS",
      p.correctCount,
      p.wrongCount,
      p.unansweredCount,
      p.durationSpentMinutes,
      `"${p.submittedAt}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    return {
      csvContent,
      filename: `Laporan_${report.tryout.title.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`,
    };
  }
}
