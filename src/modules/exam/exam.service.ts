import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import {
  ExamSessionStatus,
  TryoutStatus,
  QuestionType,
  ScoringMode,
  SkdSection,
} from "@/generated/prisma/client";
import { SaveAnswerInput } from "./exam.schema";
import { shuffleArrayWithSeed, shuffleQuestionOptions } from "@/lib/randomizer";
import { parseMatrixLabel, parseMatrixQuestion, sortMatrixOptions } from "@/lib/matrix-question";
import { isDemoStudentEmail, getDemoAllowedTryoutId } from "@/lib/demo";
import {
  countSkdSelection,
  isSectionedSkdQuestions,
  selectSkdQuestions,
  SKD_SECTION_PRIORITY,
} from "@/lib/skd";

export class ExamService {
  /**
   * Mengambil daftar tryout yang tersedia untuk peserta didik.
   */
  static async getAvailableTryoutsForStudent(studentId: string, subjectId?: string) {
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, email: true },
    });
    const isDemo = isDemoStudentEmail(student?.email);

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
        tryoutQuestions: {
          select: { section: true },
        },
        _count: {
          select: {
            tryoutQuestions: true,
          },
        },
        examSessions: {
          where: { userId: studentId },
          orderBy: { attemptNumber: "asc" },
          select: {
            id: true,
            attemptNumber: true,
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

    const demoAllowedTryoutId = isDemo ? getDemoAllowedTryoutId(tryouts) : null;
    const now = Date.now();

    return tryouts.map((t) => {
      const maxAttempts = t.maxAttempts ?? 3;
      const completedSessions = t.examSessions.filter(
        (s) => s.status === ExamSessionStatus.SUBMITTED || s.status === ExamSessionStatus.EXPIRED
      );
      const activeSession = t.examSessions.find(
        (s) => s.status === ExamSessionStatus.IN_PROGRESS
      );

      // Cek apakah tryout berada dalam periode aktif
      const isStarted = !t.startDate || new Date(t.startDate).getTime() <= now;
      const isEnded = t.endDate && new Date(t.endDate).getTime() < now;

      let participationStatus: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "EXPIRED" = "NOT_STARTED";
      let remainingSeconds = 0;
      let currentSessionId: string | null = null;

      if (activeSession) {
        const expiresAtMs = new Date(activeSession.expiresAt).getTime();
        if (now <= expiresAtMs + 15000) {
          participationStatus = "IN_PROGRESS";
          remainingSeconds = Math.max(0, Math.floor((expiresAtMs - now) / 1000));
          currentSessionId = activeSession.id;
        } else {
          participationStatus = completedSessions.length > 0 ? "SUBMITTED" : "EXPIRED";
        }
      } else if (completedSessions.length > 0) {
        participationStatus = "SUBMITTED";
      }

      // Ambil nilai tertinggi dari sesi yang telah selesai
      let highestScore: number | null = null;
      let bestSessionId: string | null = null;
      let isPassed: boolean | null = null;

      if (completedSessions.length > 0) {
        const sortedByScore = [...completedSessions].sort((a, b) => {
          if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
          return b.attemptNumber - a.attemptNumber;
        });
        highestScore = sortedByScore[0].totalScore;
        bestSessionId = sortedByScore[0].id;
        isPassed = sortedByScore[0].isPassed;
      }

      const latestCompleted = completedSessions[completedSessions.length - 1] || null;
      const attemptsUsed = completedSessions.length + (activeSession && participationStatus === "IN_PROGRESS" ? 1 : 0);
      const attemptsRemaining = Math.max(0, maxAttempts - completedSessions.length - (activeSession && participationStatus === "IN_PROGRESS" ? 1 : 0));
      const isLockedForDemo = isDemo && demoAllowedTryoutId !== null && t.id !== demoAllowedTryoutId;
      const canRetake = !isLockedForDemo && !activeSession && completedSessions.length < maxAttempts && isStarted && !isEnded;

      return {
        id: t.id,
        title: t.title,
        description: t.description,
        subject: t.subject,
        durationMinutes: t.durationMinutes,
        passingScore: t.passingScore,
        scoringMode: t.scoringMode,
        passingTwk: t.passingTwk,
        passingTiu: t.passingTiu,
        passingTkp: t.passingTkp,
        questionCount: isSectionedSkdQuestions(t.tryoutQuestions)
          ? countSkdSelection(t.tryoutQuestions)
          : t.questionCount
            ? Math.min(t.questionCount, t._count.tryoutQuestions)
            : t._count.tryoutQuestions,
        maxAttempts,
        attemptsUsed,
        attemptsRemaining,
        canRetake,
        isLockedForDemo,
        demoLockMessage: isLockedForDemo
          ? "Paket tryout ini terkunci untuk akun demo. Silakan daftarkan akun resmi Anda untuk membuka seluruh paket tryout."
          : null,
        startDate: t.startDate,
        endDate: t.endDate,
        isPeriodActive: isStarted && !isEnded,
        participationStatus,
        remainingSeconds,
        latestSessionId: currentSessionId || bestSessionId || latestCompleted?.id || null,
        latestScore: latestCompleted?.totalScore ?? null,
        highestScore,
        bestSessionId,
        isPassed,
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
        tryoutQuestions: {
          select: { section: true },
        },
        _count: {
          select: { tryoutQuestions: true },
        },
        examSessions: {
          where: { userId: studentId },
          orderBy: { attemptNumber: "asc" },
          select: {
            id: true,
            attemptNumber: true,
            status: true,
            startedAt: true,
            expiresAt: true,
            submittedAt: true,
            totalScore: true,
            isPassed: true,
            correctCount: true,
            wrongCount: true,
            unansweredCount: true,
          },
        },
      },
    });

    if (!tryout || tryout.status !== TryoutStatus.PUBLISHED) {
      throw new AppError("NOT_FOUND", "Paket tryout tidak ditemukan atau belum dipublikasikan.");
    }

    const now = Date.now();
    const isStarted = !tryout.startDate || new Date(tryout.startDate).getTime() <= now;
    const isEnded = tryout.endDate && new Date(tryout.endDate).getTime() < now;

    const maxAttempts = tryout.maxAttempts ?? 3;
    const completedSessions = tryout.examSessions.filter(
      (s) => s.status === ExamSessionStatus.SUBMITTED || s.status === ExamSessionStatus.EXPIRED
    );
    const activeSession = tryout.examSessions.find(
      (s) => s.status === ExamSessionStatus.IN_PROGRESS
    );

    let participationStatus: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "EXPIRED" = "NOT_STARTED";
    let remainingSeconds = 0;
    let currentSessionId: string | null = null;

    if (activeSession) {
      const expiresAtMs = new Date(activeSession.expiresAt).getTime();
      if (now <= expiresAtMs + 15000) {
        participationStatus = "IN_PROGRESS";
        remainingSeconds = Math.max(0, Math.floor((expiresAtMs - now) / 1000));
        currentSessionId = activeSession.id;
      } else {
        participationStatus = completedSessions.length > 0 ? "SUBMITTED" : "EXPIRED";
      }
    } else if (completedSessions.length > 0) {
      participationStatus = "SUBMITTED";
    }

    // Hitung skor tertinggi
    let highestScore: number | null = null;
    let bestSessionId: string | null = null;
    let isPassed: boolean | null = null;

    if (completedSessions.length > 0) {
      const sortedByScore = [...completedSessions].sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        return b.attemptNumber - a.attemptNumber;
      });
      highestScore = sortedByScore[0].totalScore;
      bestSessionId = sortedByScore[0].id;
      isPassed = sortedByScore[0].isPassed;
    }

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, email: true },
    });
    const isDemo = isDemoStudentEmail(student?.email);
    let isLockedForDemo = false;
    if (isDemo) {
      const allPublished = await prisma.tryout.findMany({
        where: { status: TryoutStatus.PUBLISHED },
        select: { id: true, title: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      });
      const allowedId = getDemoAllowedTryoutId(allPublished);
      isLockedForDemo = allowedId !== null && tryoutId !== allowedId;
    }

    const latestCompleted = completedSessions[completedSessions.length - 1] || null;
    const attemptsUsed = completedSessions.length + (activeSession && participationStatus === "IN_PROGRESS" ? 1 : 0);
    const attemptsRemaining = Math.max(0, maxAttempts - completedSessions.length - (activeSession && participationStatus === "IN_PROGRESS" ? 1 : 0));
    const canRetake = !isLockedForDemo && !activeSession && completedSessions.length < maxAttempts && isStarted && !isEnded;

    const attemptsHistory = completedSessions.map((s) => ({
      sessionId: s.id,
      attemptNumber: s.attemptNumber,
      totalScore: s.totalScore,
      isPassed: s.isPassed,
      correctCount: s.correctCount,
      wrongCount: s.wrongCount,
      unansweredCount: s.unansweredCount,
      submittedAt: (s.submittedAt || s.expiresAt).toISOString(),
      isHighestScore: s.totalScore === highestScore,
    }));

    return {
      id: tryout.id,
      title: tryout.title,
      description: tryout.description,
      subject: tryout.subject,
      durationMinutes: tryout.durationMinutes,
      passingScore: tryout.passingScore,
      scoringMode: tryout.scoringMode,
      passingTwk: tryout.passingTwk,
      passingTiu: tryout.passingTiu,
      passingTkp: tryout.passingTkp,
      questionCount: isSectionedSkdQuestions(tryout.tryoutQuestions)
        ? countSkdSelection(tryout.tryoutQuestions)
        : tryout.questionCount
          ? Math.min(tryout.questionCount, tryout._count.tryoutQuestions)
          : tryout._count.tryoutQuestions,
      discussionVisibility: tryout.discussionVisibility,
      maxAttempts,
      attemptsUsed,
      attemptsRemaining,
      canRetake,
      isLockedForDemo,
      demoLockMessage: isLockedForDemo
        ? "Paket tryout ini terkunci untuk akun demo. Silakan daftarkan akun resmi Anda untuk membuka seluruh paket tryout."
        : null,
      startDate: tryout.startDate,
      endDate: tryout.endDate,
      isPeriodActive: isStarted && !isEnded,
      participationStatus,
      remainingSeconds,
      activeSessionId: currentSessionId,
      bestSessionId,
      highestScore,
      latestScore: latestCompleted?.totalScore ?? null,
      isPassed,
      attemptsHistory,
    };
  }

  /**
   * Memulai sesi ujian baru atau menyambung sesi yang sedang berjalan (Idempotent Resume).
   */
  static async startOrResumeExamSession(
    studentId: string,
    tryoutId: string,
    retryCount = 0,
  ): Promise<{
    sessionId: string;
    tryoutId: string;
    attemptNumber: number;
    maxAttempts: number;
    startedAt: string;
    expiresAt: string;
    remainingSeconds: number;
    isResumed: boolean;
  }> {
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, email: true },
    });
    const isDemo = isDemoStudentEmail(student?.email);
    if (isDemo) {
      const allPublished = await prisma.tryout.findMany({
        where: { status: TryoutStatus.PUBLISHED },
        select: { id: true, title: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      });
      const allowedId = getDemoAllowedTryoutId(allPublished);
      if (allowedId !== null && tryoutId !== allowedId) {
        throw new AppError(
          "FORBIDDEN",
          "Akun demo dibatasi hanya untuk 1 paket tryout uji coba. Silakan daftarkan akun resmi Anda (gratis) untuk membuka dan mengerjakan paket tryout ini."
        );
      }
    }

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

    // Mode skor mentah (SKD) membutuhkan kategori subtes pada setiap soal
    // agar skor per subtes dan ambang batas dapat dihitung.
    if (tryout.scoringMode === ScoringMode.RAW) {
      const missingSection = tryout.tryoutQuestions.some((tq) => !tq.section);
      if (missingSection) {
        throw new AppError(
          "VALIDATION_ERROR",
          "Paket tryout SKD belum lengkap: setiap soal wajib memiliki kategori subtes (TWK/TIU/TKP).",
        );
      }
    }

    const now = Date.now();

    // Validasi periode aktif tryout
    if (tryout.startDate && new Date(tryout.startDate).getTime() > now) {
      throw new AppError("VALIDATION_ERROR", "Paket tryout ini belum dibuka untuk peserta.");
    }
    if (tryout.endDate && new Date(tryout.endDate).getTime() < now) {
      throw new AppError("VALIDATION_ERROR", "Periode pengerjaan tryout ini telah berakhir.");
    }

    const maxAttempts = tryout.maxAttempts ?? 3;

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
          attemptNumber: activeSession.attemptNumber,
          maxAttempts,
          startedAt: activeSession.startedAt.toISOString(),
          expiresAt: activeSession.expiresAt.toISOString(),
          remainingSeconds,
          isResumed: true,
        };
      } else {
        // Otomatis submit karena waktu sudah habis
        await this.submitExamSession(studentId, activeSession.id, true);
      }
    }

    // 2. Cek apakah sudah pernah menyelesaikan tryout dan mencapai batas maksimal percobaan
    const completedSessions = await prisma.examSession.findMany({
      where: {
        tryoutId,
        userId: studentId,
        status: { in: [ExamSessionStatus.SUBMITTED, ExamSessionStatus.EXPIRED] },
      },
      orderBy: { attemptNumber: "asc" },
    });

    if (completedSessions.length >= maxAttempts) {
      throw new AppError(
        "EXAM_ALREADY_SUBMITTED",
        `Anda telah mencapai batas maksimal (${maxAttempts}x) percobaan untuk tryout ini.`,
      );
    }

    const attemptNumber = completedSessions.length + 1;

    // 3. Buat sesi ujian baru dalam 1 transaksi
    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + tryout.durationMinutes * 60 * 1000);

    let newSession;
    try {
      newSession = await prisma.$transaction(async (tx) => {
        const session = await tx.examSession.create({
          data: {
            tryoutId,
            userId: studentId,
            attemptNumber,
            startedAt,
            expiresAt,
            status: ExamSessionStatus.IN_PROGRESS,
          },
        });

        // Paket SKD (RAW / semua soal bertanda subtes) selalu menampilkan komposisi resmi
        // TWK 30 → TIU 35 → TKP 45 sesuai urutan paket, tanpa diacak dan tanpa soal berlebih.
        // Paket non-SKD dengan kuota soal tetap memakai pengacakan seperti sebelumnya.
        const isSectioned = isSectionedSkdQuestions(tryout.tryoutQuestions);
        const isFixedOrder = tryout.scoringMode === ScoringMode.RAW || isSectioned;
        let assignedQuestions = tryout.tryoutQuestions;
        if (isFixedOrder) {
          assignedQuestions = selectSkdQuestions(tryout.tryoutQuestions);
        } else if (
          tryout.questionCount &&
          tryout.questionCount > 0 &&
          tryout.questionCount < tryout.tryoutQuestions.length
        ) {
          // Pengacakan Fisher-Yates dengan seed unik berbasis sessionId agar setiap siswa/percobaan mendapat paket acak unik
          assignedQuestions = shuffleArrayWithSeed(
            tryout.tryoutQuestions,
            `${session.id}:selected_questions`
          ).slice(0, tryout.questionCount);
        }

        // Siapkan baris jawaban kosong untuk setiap butir soal tryout yang terpilih
        const answersData = assignedQuestions.map((tq) => ({
          examSessionId: session.id,
          questionId: tq.questionId,
          isFlagged: false,
        }));

        await tx.examAnswer.createMany({
          data: answersData,
        });

        return session;
      });
    } catch (error) {
      // Race condition: dua request start bersamaan menghitung attemptNumber yang
      // sama. Unique constraint menolak salah satunya (P2002) — ulangi sekali
      // agar request tersebut menyambung sesi yang baru dibuat.
      const isUniqueViolation = (error as { code?: string })?.code === "P2002";
      if (isUniqueViolation && retryCount < 1) {
        return this.startOrResumeExamSession(studentId, tryoutId, retryCount + 1);
      }
      throw error;
    }

    const remainingSeconds = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));

    return {
      sessionId: newSession.id,
      tryoutId: newSession.tryoutId,
      attemptNumber,
      maxAttempts,
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

    // Buat map bobot soal dari tryoutQuestions
    const weightMap = new Map<string, number>();
    session.tryout.tryoutQuestions.forEach((tq) => {
      weightMap.set(tq.questionId, tq.weight);
    });

    // Paket SKD (RAW / seluruh soal bertanda subtes): tampilkan hanya komposisi resmi
    // TWK 30 → TIU 35 → TKP 45 sesuai urutan paket, tanpa diacak. Soal berlebih
    // (data paket lama) tidak ditampilkan sehingga nomor tetap 1-110.
    // Mode lain: acak urutan butir soal secara unik & konsisten untuk sesi ini (Seeded PRNG).
    const isSectioned = isSectionedSkdQuestions(session.tryout.tryoutQuestions);
    const isFixedOrder = session.tryout.scoringMode === ScoringMode.RAW || isSectioned;
    const questionSeed = `${session.id}:questions`;

    const tryoutQuestionById = new Map(
      session.tryout.tryoutQuestions.map((tq) => [tq.questionId, tq]),
    );

    const orderedEntries = isFixedOrder
      ? (() => {
          const selectedIds = new Set(
            selectSkdQuestions(session.tryout.tryoutQuestions).map((tq) => tq.questionId),
          );
          return session.answers
            .filter((ans) => selectedIds.has(ans.questionId))
            .sort((a, b) => {
              const ta = tryoutQuestionById.get(a.questionId);
              const tb = tryoutQuestionById.get(b.questionId);
              const priorityA = ta?.section ? SKD_SECTION_PRIORITY[ta.section] : 3;
              const priorityB = tb?.section ? SKD_SECTION_PRIORITY[tb.section] : 3;
              return priorityA - priorityB || (ta?.orderNumber ?? 0) - (tb?.orderNumber ?? 0);
            })
            .map((ans) => ({
              ans,
              weight: tryoutQuestionById.get(ans.questionId)?.weight ?? 1.0,
            }));
        })()
      : shuffleArrayWithSeed(session.answers, questionSeed).map((ans) => ({
          ans,
          weight: weightMap.get(ans.questionId) || 1.0,
        }));

    // Sanitasi payload & acak urutan opsi jawaban (A–E) secara unik untuk tiap butir soal
    const sanitizedQuestions = orderedEntries.map(({ ans, weight }, index) => {
      if (!ans) {
        throw new AppError("INTERNAL_ERROR", "Baris jawaban untuk butir soal ujian tidak ditemukan.");
      }
      const optionSeed = `${session.id}:question:${ans.questionId}:options`;

      const rawOptions = ans.question.options.map((opt) => ({
        id: opt.id,
        label: opt.label,
        content: opt.content,
        imageUrl: opt.imageUrl,
        // STRICT SECURITY: isCorrect DIHAPUS DARI PAYLOAD
      }));

      // Soal matriks mempertahankan urutan baris/kolom aslinya; soal lain diacak.
      const shuffledOptions =
        ans.question.type === QuestionType.MATRIX
          ? sortMatrixOptions(rawOptions)
          : shuffleQuestionOptions(rawOptions, optionSeed);

      return {
        orderNumber: index + 1, // Urutan paket (SKD) / teracak unik per siswa (mode lain)
        weight,
        questionId: ans.questionId,
        type: ans.question.type,
        content: ans.question.content,
        imageUrl: ans.question.imageUrl,
        options: shuffledOptions,
        selectedOptionId: ans.selectedOptionId,
        selectedOptionIds: ans.selectedOptionIds || (ans.selectedOptionId ? [ans.selectedOptionId] : []),
        isFlagged: ans.isFlagged,
        // STRICT SECURITY: explanation DIHAPUS SELAMA UJIAN
      };
    });

    return {
      id: session.id,
      tryoutId: session.tryoutId,
      tryoutTitle: session.tryout.title,
      subjectName: session.tryout.subject.name,
      attemptNumber: session.attemptNumber,
      maxAttempts: session.tryout.maxAttempts ?? 3,
      status: session.status,
      scoringMode: session.tryout.scoringMode,
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

    // Resolusi daftar opsi yang dipilih (mendukung single choice dan multiple choice)
    let resolvedOptionIds: string[] = [];
    if (input.selectedOptionIds && Array.isArray(input.selectedOptionIds)) {
      resolvedOptionIds = input.selectedOptionIds;
    } else if (input.selectedOptionId) {
      resolvedOptionIds = [input.selectedOptionId];
    }

    // Validasi apakah opsi yang dipilih benar-benar milik soal tersebut
    if (resolvedOptionIds.length > 0) {
      const [question, selectedOptions] = await Promise.all([
        prisma.question.findUnique({
          where: { id: input.questionId },
          select: { type: true },
        }),
        prisma.questionOption.findMany({
          where: {
            id: { in: resolvedOptionIds },
            questionId: input.questionId,
          },
          select: { id: true, label: true },
        }),
      ]);

      if (!question) {
        throw new AppError("NOT_FOUND", "Soal tidak ditemukan.");
      }

      if (selectedOptions.length !== resolvedOptionIds.length) {
        throw new AppError("VALIDATION_ERROR", "Pilihan opsi tidak valid untuk soal ini.");
      }

      // Soal matriks hanya boleh memiliki satu pilihan per baris.
      if (question.type === QuestionType.MATRIX) {
        const rowsSeen = new Set<number>();
        for (const option of selectedOptions) {
          const { rowNumber } = parseMatrixLabel(option.label);
          if (rowsSeen.has(rowNumber)) {
            throw new AppError(
              "VALIDATION_ERROR",
              "Setiap baris matriks hanya boleh memiliki satu pilihan jawaban.",
            );
          }
          rowsSeen.add(rowNumber);
        }
      }
    }

    // Pastikan soal memang termasuk dalam sesi ujian ini (bukan soal dari paket lain).
    const existingAnswer = await prisma.examAnswer.findUnique({
      where: {
        examSessionId_questionId: {
          examSessionId: sessionId,
          questionId: input.questionId,
        },
      },
      select: { id: true },
    });

    if (!existingAnswer) {
      throw new AppError("VALIDATION_ERROR", "Soal tidak termasuk dalam sesi ujian ini.");
    }

    const hasAnswer = resolvedOptionIds.length > 0;
    const primarySelectedId = input.selectedOptionId || (resolvedOptionIds.length > 0 ? resolvedOptionIds[0] : null);

    // Update baris jawaban pada database
    const updatedAnswer = await prisma.examAnswer.update({
      where: {
        examSessionId_questionId: {
          examSessionId: sessionId,
          questionId: input.questionId,
        },
      },
      data: {
        selectedOptionId: primarySelectedId,
        selectedOptionIds: resolvedOptionIds,
        isFlagged: input.isFlagged,
        answeredAt: hasAnswer ? new Date() : null,
      },
    });

    return {
      questionId: updatedAnswer.questionId,
      selectedOptionId: updatedAnswer.selectedOptionId,
      selectedOptionIds: updatedAnswer.selectedOptionIds,
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

    // 1. Buat map bobot & kategori subtes berdasarkan tryoutQuestions
    const weightMap = new Map<string, number>();
    const sectionMap = new Map<string, SkdSection>();
    session.tryout.tryoutQuestions.forEach((tq) => {
      weightMap.set(tq.questionId, tq.weight);
      if (tq.section) sectionMap.set(tq.questionId, tq.section);
    });

    // Akumulator skor per subtes (TWK/TIU/TKP) untuk mode RAW / SKD
    const sectionStats = new Map<
      SkdSection,
      { score: number; maxScore: number; totalCount: number; correctCount: number }
    >();

    // Paket SKD: hanya soal dalam komposisi resmi yang dinilai. Soal berlebih pada
    // data paket lama diabaikan agar skor maksimum tetap 150/175/225.
    const isSectioned = isSectionedSkdQuestions(session.tryout.tryoutQuestions);
    const selectedSkdIds = isSectioned
      ? new Set(selectSkdQuestions(session.tryout.tryoutQuestions).map((tq) => tq.questionId))
      : null;

    // Total skor maksimum dihitung per butir (mendukung opsi berbobot).
    let totalMaxWeight = 0;

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
      if (selectedSkdIds && !selectedSkdIds.has(ans.questionId)) continue;
      const qWeight = weightMap.get(ans.questionId) || 1.0;
      const section = sectionMap.get(ans.questionId);
      const topicId = ans.question.topicId;
      const qType = ans.question.type;

      // Skor maksimum butir: opsi berbobot memakai skor opsi tertinggi.
      const qMax =
        qType === QuestionType.WEIGHTED_CHOICE
          ? Math.max(1, ...ans.question.options.map((o) => o.score ?? 0))
          : qWeight;

      totalMaxWeight += qMax;

      if (!topicStats.has(topicId)) {
        topicStats.set(topicId, { total: 0, correct: 0, wrong: 0 });
      }
      const stat = topicStats.get(topicId)!;
      stat.total += 1;

      if (section) {
        if (!sectionStats.has(section)) {
          sectionStats.set(section, {
            score: 0,
            maxScore: 0,
            totalCount: 0,
            correctCount: 0,
          });
        }
        const sectionStat = sectionStats.get(section)!;
        sectionStat.totalCount += 1;
        sectionStat.maxScore += qMax;
      }

      // Ambil opsi yang dipilih siswa (bisa dari selectedOptionIds atau fallback selectedOptionId)
      const selectedIds =
        ans.selectedOptionIds && ans.selectedOptionIds.length > 0
          ? ans.selectedOptionIds
          : ans.selectedOptionId
            ? [ans.selectedOptionId]
            : [];

      if (selectedIds.length === 0) {
        // Kosong / Tidak Dijawab
        unansweredCount++;
        answerUpdates.push({
          id: ans.id,
          isCorrect: false,
          score: 0,
        });
        continue;
      }

      let exactEarnedScore = 0;
      let isFullyCorrect = false;

      if (qType === QuestionType.MATRIX) {
        // Matriks: skor parsial proporsional per baris pernyataan.
        const parsedMatrix = parseMatrixQuestion(ans.question.options);
        const selectedSet = new Set(selectedIds);

        let correctRows = 0;
        for (const row of parsedMatrix.rows) {
          const chosenInRow = row.columns.filter((column) => selectedSet.has(column.optionId));
          if (chosenInRow.length === 1 && chosenInRow[0].isCorrect) {
            correctRows++;
          }
        }

        const totalRows = parsedMatrix.rows.length;
        const ratio = totalRows > 0 ? correctRows / totalRows : 0;
        exactEarnedScore = ratio * qWeight;
        isFullyCorrect = totalRows > 0 && correctRows === totalRows;
      } else if (qType === QuestionType.MULTIPLE_CHOICE) {
        // Pilihan Ganda Kompleks: Skor Parsial Proporsional
        const correctOptions = ans.question.options.filter((o) => o.isCorrect);
        const correctOptionIds = new Set(correctOptions.map((o) => o.id));
        const totalCorrectRequired = correctOptions.length;

        let numCorrectChosen = 0;
        let numWrongChosen = 0;

        for (const sId of selectedIds) {
          if (correctOptionIds.has(sId)) {
            numCorrectChosen++;
          } else {
            numWrongChosen++;
          }
        }

        // Rasio proporsional dengan penalti opsi salah.
        const ratio =
          totalCorrectRequired > 0
            ? Math.max(0, (numCorrectChosen - numWrongChosen) / totalCorrectRequired)
            : 0;

        exactEarnedScore = ratio * qWeight;
        isFullyCorrect = ratio === 1.0;
      } else if (qType === QuestionType.WEIGHTED_CHOICE) {
        // Opsi berbobot (TKP): skor = skor opsi terpilih; kosong = 0.
        const chosenOpt = ans.question.options.find((o) => o.id === selectedIds[0]);
        exactEarnedScore = Math.max(0, Math.min(chosenOpt?.score ?? 0, qMax));
        isFullyCorrect = exactEarnedScore >= qMax;
      } else {
        // SINGLE_CHOICE & TRUE_FALSE
        const chosenOpt = ans.question.options.find((o) => o.id === selectedIds[0]);
        if (chosenOpt?.isCorrect) {
          exactEarnedScore = qWeight;
          isFullyCorrect = true;
        }
      }

      totalEarnedScore += exactEarnedScore;

      if (isFullyCorrect) {
        correctCount++;
        stat.correct += 1;
      } else {
        wrongCount++;
        stat.wrong += 1;
        // Akumulasi penguasaan materi proporsional (termasuk skor parsial TKP).
        if (exactEarnedScore > 0 && qMax > 0) {
          stat.correct += exactEarnedScore / qMax;
        }
      }

      if (section) {
        const sectionStat = sectionStats.get(section)!;
        sectionStat.score += exactEarnedScore;
        if (isFullyCorrect) sectionStat.correctCount += 1;
      }

      answerUpdates.push({
        id: ans.id,
        isCorrect: isFullyCorrect,
        score: Math.round(exactEarnedScore * 100) / 100,
      });
    }

    // 3. Hitung total nilai
    // - NORMALIZED: skala 0-100 (perilaku lama)
    // - RAW: skor mentah (mis. SKD CASN, total maksimum 550)
    const isRawMode = session.tryout.scoringMode === ScoringMode.RAW;
    const finalScore = isRawMode
      ? totalEarnedScore
      : totalMaxWeight > 0
        ? (totalEarnedScore / totalMaxWeight) * 100
        : 0;
    const roundedScore = isRawMode
      ? Math.round(finalScore * 100) / 100
      : Math.round(finalScore * 10) / 10;

    // Kelulusan: jika paket menetapkan ambang batas per subtes (TWK/TIU/TKP),
    // kelulusan ditentukan oleh ketiganya — bukan KKM/nilai umum.
    const hasSectionThresholds =
      session.tryout.passingTwk !== null ||
      session.tryout.passingTiu !== null ||
      session.tryout.passingTkp !== null;
    const useSectionThresholds = hasSectionThresholds && sectionStats.size > 0;

    let isPassed: boolean;
    if (useSectionThresholds) {
      const thresholdChecks: boolean[] = [];
      if (session.tryout.passingTwk !== null) {
        thresholdChecks.push(
          (sectionStats.get(SkdSection.TWK)?.score ?? 0) >= session.tryout.passingTwk,
        );
      }
      if (session.tryout.passingTiu !== null) {
        thresholdChecks.push(
          (sectionStats.get(SkdSection.TIU)?.score ?? 0) >= session.tryout.passingTiu,
        );
      }
      if (session.tryout.passingTkp !== null) {
        thresholdChecks.push(
          (sectionStats.get(SkdSection.TKP)?.score ?? 0) >= session.tryout.passingTkp,
        );
      }
      isPassed = thresholdChecks.every(Boolean);
    } else {
      isPassed = roundedScore >= session.tryout.passingScore;
    }

    const finalStatus = isAutoExpired ? ExamSessionStatus.EXPIRED : ExamSessionStatus.SUBMITTED;
    const submittedAt = new Date();

    // 4. Simpan seluruh hasil dalam 1 transaksi
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
            correctCount: Math.round(tStat.correct),
            percentage: Math.round(percentage * 10) / 10,
          },
        });
      }

      // Simpan skor per subtes (TWK/TIU/TKP) untuk mode RAW.
      await tx.examSectionScore.deleteMany({
        where: { examSessionId: session.id },
      });

      for (const [section, sStat] of sectionStats.entries()) {
        const sectionThreshold =
          section === SkdSection.TWK
            ? session.tryout.passingTwk
            : section === SkdSection.TIU
              ? session.tryout.passingTiu
              : session.tryout.passingTkp;
        await tx.examSectionScore.create({
          data: {
            examSessionId: session.id,
            section,
            score: Math.round(sStat.score * 100) / 100,
            maxScore: Math.round(sStat.maxScore * 100) / 100,
            correctCount: sStat.correctCount,
            totalCount: sStat.totalCount,
            isPassed: sectionThreshold !== null ? sStat.score >= sectionThreshold : true,
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
