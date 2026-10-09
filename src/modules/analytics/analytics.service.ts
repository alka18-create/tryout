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

    // Kelompokkan sesi per siswa untuk mengambil sesi dengan nilai tertinggi (Best Attempt)
    const studentSessionsMap = new Map<
      string,
      {
        bestSession: (typeof sessions)[0];
        allSessions: typeof sessions;
        totalAttempts: number;
      }
    >();

    sessions.forEach((s) => {
      const existing = studentSessionsMap.get(s.userId);
      if (!existing) {
        studentSessionsMap.set(s.userId, {
          bestSession: s,
          allSessions: [s],
          totalAttempts: 1,
        });
      } else {
        existing.allSessions.push(s);
        existing.totalAttempts += 1;
        // Ambil sesi dengan skor tertinggi, jika seri ambil yang attemptNumber lebih baru
        if (
          s.totalScore > existing.bestSession.totalScore ||
          (s.totalScore === existing.bestSession.totalScore && s.attemptNumber > existing.bestSession.attemptNumber)
        ) {
          existing.bestSession = s;
        }
      }
    });

    const studentBestList = Array.from(studentSessionsMap.values());
    const totalParticipants = studentBestList.length;

    // Urutkan siswa berdasarkan skor tertinggi
    const sortedBestParticipants = studentBestList
      .map((item) => ({
        ...item.bestSession,
        bestAttemptNumber: item.bestSession.attemptNumber,
        totalAttempts: item.totalAttempts,
      }))
      .sort((a, b) => b.totalScore - a.totalScore);

    // 1. Ringkasan Metrik (berdasarkan nilai tertinggi setiap siswa)
    let averageScore = 0;
    let highestScore = 0;
    let lowestScore = 100;
    let passedCount = 0;

    if (totalParticipants > 0) {
      let scoreSum = 0;
      highestScore = sortedBestParticipants[0].totalScore;
      lowestScore = sortedBestParticipants[sortedBestParticipants.length - 1].totalScore;

      sortedBestParticipants.forEach((s) => {
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

    // 2. Daftar Peserta (Peringkat Berdasarkan Skor Tertinggi)
    const participants = sortedBestParticipants.map((s, index) => {
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
        attemptNumber: s.bestAttemptNumber,
        totalAttempts: s.totalAttempts,
        totalScore: s.totalScore,
        isPassed: s.isPassed,
        correctCount: s.correctCount,
        wrongCount: s.wrongCount,
        unansweredCount: s.unansweredCount,
        durationSpentMinutes,
        submittedAt: (s.submittedAt || s.expiresAt).toISOString(),
      };
    });

    // 3. Analisis Topik Terlemah (Rata-rata persentase per topik dari sesi terbaik masing-masing siswa)
    const topicAggMap = new Map<
      string,
      { topicId: string; topicName: string; totalSum: number; count: number }
    >();

    sortedBestParticipants.forEach((s) => {
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

    // 4. Analisis Butir Soal (% benar per nomor soal dari sesi terbaik masing-masing siswa)
    const questionStatsMap = new Map<
      string,
      { correctCount: number; answeredCount: number }
    >();

    sortedBestParticipants.forEach((s) => {
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
            userId: true,
            totalScore: true,
            isPassed: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return tryouts.map((t) => {
      // Kelompokkan per siswa dan ambil nilai tertinggi
      const studentBestScores = new Map<string, { totalScore: number; isPassed: boolean }>();
      t.examSessions.forEach((s) => {
        const existing = studentBestScores.get(s.userId);
        if (!existing || s.totalScore > existing.totalScore) {
          studentBestScores.set(s.userId, { totalScore: s.totalScore, isPassed: s.isPassed });
        }
      });

      const uniqueStudents = Array.from(studentBestScores.values());
      const participantCount = uniqueStudents.length;

      let avgScore = 0;
      let passedCount = 0;

      if (participantCount > 0) {
        const sum = uniqueStudents.reduce((acc, s) => acc + s.totalScore, 0);
        avgScore = Math.round((sum / participantCount) * 10) / 10;
        passedCount = uniqueStudents.filter((s) => s.isPassed).length;
      }

      const passingRate = participantCount > 0 ? Math.round((passedCount / participantCount) * 100) : 0;

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
        completedCount: participantCount,
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
      "Skor Ujian (Tertinggi)",
      "Percobaan Terbaik",
      "Total Percobaan",
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
      `"Percobaan ke-${p.attemptNumber}"`,
      `"${p.totalAttempts}x"`,
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
