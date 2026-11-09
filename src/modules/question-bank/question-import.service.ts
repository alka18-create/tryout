import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { DifficultyLevel, QuestionType } from "@/generated/prisma/client";

export interface RowError {
  row: number;
  error: string;
}

export interface ImportResult {
  totalRows: number;
  successCount: number;
  failedCount: number;
  errors: RowError[];
}

export class QuestionImportService {
  /**
   * Menghasilkan file Excel template untuk import soal lengkap dengan
   * contoh data valid untuk Pilihan Ganda, PG Kompleks, Benar/Salah, dan
   * TKP (opsi berbobot), serta lembar petunjuk pengisian & referensi topik
   * materi aktif.
   */
  static async generateQuestionExcelTemplate(): Promise<Uint8Array> {
    const subjects = await prisma.subject.findMany({
      include: {
        topics: {
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    // 1. Data Contoh untuk Sheet 1: "Template Soal"
    const defaultSubject = subjects[0]?.name || "Sosiologi";
    const defaultTopic = subjects[0]?.topics[0]?.name || "Identitas Diri & Sosial";
    const secondTopic = subjects[0]?.topics[1]?.name || defaultTopic;

    const sampleRows = [
      {
        No: 1,
        "Jenis Soal": "PILIHAN GANDA",
        "Mata Pelajaran": defaultSubject,
        "Topik Materi": defaultTopic,
        "Tingkat Kesulitan": "MUDAH",
        "Teks Soal":
          "Identitas diri seseorang yang terbentuk melalui proses interaksi sosial dalam lingkungan keluarga disebut sebagai...",
        "Opsi A": "Identitas gender",
        "Opsi B": "Identitas primer",
        "Opsi C": "Identitas sekunder",
        "Opsi D": "Identitas komunal",
        "Opsi E": "Identitas profesional",
        "Skor A": "",
        "Skor B": "",
        "Skor C": "",
        "Skor D": "",
        "Skor E": "",
        "Kunci Jawaban": "B",
        Pembahasan:
          "Identitas primer merupakan fondasi kepribadian dasar yang pertama kali dibentuk dalam lingkungan sosialisasi primer, yaitu keluarga.",
      },
      {
        No: 2,
        "Jenis Soal": "PG KOMPLEKS",
        "Mata Pelajaran": defaultSubject,
        "Topik Materi": secondTopic,
        "Tingkat Kesulitan": "SEDANG",
        "Teks Soal":
          "Manakah dari pernyataan berikut yang merupakan faktor pendorong terjadinya integrasi sosial? (Pilih minimal 2 jawaban benar)",
        "Opsi A": "Toleransi terhadap perbedaan kebudayaan",
        "Opsi B": "Kesempatan yang seimbang dalam bidang ekonomi",
        "Opsi C": "Sikap etnosentrisme yang berlebihan",
        "Opsi D": "Sikap saling menghargai orang lain dan kebudayaannya",
        "Opsi E": "",
        "Skor A": "",
        "Skor B": "",
        "Skor C": "",
        "Skor D": "",
        "Skor E": "",
        "Kunci Jawaban": "A, B, D",
        Pembahasan:
          "Faktor pendorong integrasi sosial meliputi toleransi budaya, kesempatan ekonomi yang seimbang, dan sikap saling menghargai. Sikap etnosentrisme justru merupakan faktor penghambat integrasi.",
      },
      {
        No: 3,
        "Jenis Soal": "BENAR SALAH",
        "Mata Pelajaran": defaultSubject,
        "Topik Materi": secondTopic,
        "Tingkat Kesulitan": "MUDAH",
        "Teks Soal":
          "Konflik sosial selalu membawa dampak negatif dan merusak integrasi dalam masyarakat.",
        "Opsi A": "Benar",
        "Opsi B": "Salah",
        "Opsi C": "",
        "Opsi D": "",
        "Opsi E": "",
        "Skor A": "",
        "Skor B": "",
        "Skor C": "",
        "Skor D": "",
        "Skor E": "",
        "Kunci Jawaban": "B",
        Pembahasan:
          "Pernyataan tersebut Salah. Dalam perspektif sosiologi, konflik sosial tidak selalu destruktif; konflik juga dapat mempererat kohesi kelompok internal (in-group solidarity) dan mendorong perubahan sosial yang konstruktif.",
      },
      {
        No: 4,
        "Jenis Soal": "TKP / OPSI BERBOBOT",
        "Mata Pelajaran": defaultSubject,
        "Topik Materi": defaultTopic,
        "Tingkat Kesulitan": "SEDANG",
        "Teks Soal":
          "Anda seorang petugas layanan publik. Seorang warga datang dengan keluhan yang sama untuk ketiga kalinya dan mulai emosional. Tindakan yang paling tepat Anda lakukan adalah...",
        "Opsi A":
          "Mendengarkan keluhan dengan saksama, meminta maaf atas ketidaknyamanan, lalu mencarikan solusi bersama.",
        "Opsi B":
          "Menjelaskan prosedur yang berlaku dan meminta warga mengikuti alur yang ada.",
        "Opsi C": "Mengalihkan warga ke petugas lain karena bukan tugas Anda.",
        "Opsi D":
          "Menyarankan warga menuliskan keluhan dan menunggu tanpa batas waktu.",
        "Opsi E": "Meninggalkan warga karena Anda sedang sibuk.",
        "Skor A": 5,
        "Skor B": 4,
        "Skor C": 2,
        "Skor D": 3,
        "Skor E": 1,
        "Kunci Jawaban": "",
        Pembahasan:
          "TKP menilai kualitas respons. Opsi A menunjukkan empati, pelayanan prima, dan orientasi solusi; opsi lain kurang optimal.",
      },
    ];

    const wb = XLSX.utils.book_new();

    // Buat Sheet 1: Template Soal
    const wsTemplate = XLSX.utils.json_to_sheet(sampleRows);

    // Atur lebar kolom agar nyaman dibaca di Excel
    wsTemplate["!cols"] = [
      { wch: 5 },  // No
      { wch: 18 }, // Jenis Soal
      { wch: 20 }, // Mata Pelajaran
      { wch: 30 }, // Topik Materi
      { wch: 16 }, // Tingkat Kesulitan
      { wch: 60 }, // Teks Soal
      { wch: 28 }, // Opsi A
      { wch: 28 }, // Opsi B
      { wch: 28 }, // Opsi C
      { wch: 28 }, // Opsi D
      { wch: 28 }, // Opsi E
      { wch: 8 },  // Skor A
      { wch: 8 },  // Skor B
      { wch: 8 },  // Skor C
      { wch: 8 },  // Skor D
      { wch: 8 },  // Skor E
      { wch: 16 }, // Kunci Jawaban
      { wch: 55 }, // Pembahasan
    ];

    XLSX.utils.book_append_sheet(wb, wsTemplate, "Template Soal");

    // 2. Data untuk Sheet 2: "Petunjuk Jenis Soal"
    const instructions = [
      {
        "Jenis Soal": "PILIHAN GANDA",
        "Format Opsi Jawaban": "Wajib mengisi lengkap Opsi A, B, C, D, dan E.",
        "Format Kunci Jawaban": "Tepat 1 huruf: A, B, C, D, atau E.",
        "Keterangan / Aturan": "Sistem pilihan ganda konvensional dengan skor tunggal penuh.",
      },
      {
        "Jenis Soal": "PG KOMPLEKS",
        "Format Opsi Jawaban": "Wajib mengisi Opsi A dan B. Opsi C, D, E opsional (bisa 2 s/d 5 pilihan).",
        "Format Kunci Jawaban": "Minimal 2 huruf dipisah koma atau spasi. Contoh: A, C atau A, B, D.",
        "Keterangan / Aturan":
          "Peserta dapat memilih lebih dari satu jawaban benar. Sistem menerapkan penskoran parsial proporsional yang adil.",
      },
      {
        "Jenis Soal": "BENAR SALAH",
        "Format Opsi Jawaban":
          "Cukup isi Opsi A ('Benar') dan Opsi B ('Salah'). Opsi C, D, E dikosongkan.",
        "Format Kunci Jawaban":
          "Isi 'A' (atau 'Benar') jika benar, atau 'B' (atau 'Salah') jika pernyataan salah.",
        "Keterangan / Aturan":
          "Jika kolom Opsi A & B dikosongkan, sistem otomatis mengisinya dengan 'Benar' & 'Salah'.",
      },
      {
        "Jenis Soal": "TKP / OPSI BERBOBOT",
        "Format Opsi Jawaban":
          "Wajib mengisi lengkap Opsi A–E dan kolom Skor A–E (bilangan bulat 1–5, tidak boleh sama).",
        "Format Kunci Jawaban":
          "Tidak perlu diisi. Skor ditentukan per opsi, bukan oleh satu kunci jawaban.",
        "Keterangan / Aturan":
          "Khas soal TKP SKD. Setiap opsi diberi skor 1–5; jawaban kosong bernilai 0. Contoh: Skor A=5, B=4, C=3, D=2, E=1.",
      },
      {
        "Jenis Soal": "MATRIKS / TABEL",
        "Format Opsi Jawaban":
          "Tidak tersedia melalui Excel karena membutuhkan beberapa kolom jawaban (mis. Sesuai / Tidak Sesuai).",
        "Format Kunci Jawaban":
          "Ditentukan per baris pada formulir (satu kolom kunci untuk setiap pernyataan).",
        "Keterangan / Aturan":
          "Buat soal matriks lewat menu Bank Soal → Tambah Soal → pilih tipe 'Matriks / Tabel'. Penilaian dilakukan proporsional per baris pernyataan.",
      },
    ];

    const wsInstructions = XLSX.utils.json_to_sheet(instructions);
    wsInstructions["!cols"] = [
      { wch: 18 }, // Jenis Soal
      { wch: 45 }, // Format Opsi Jawaban
      { wch: 35 }, // Format Kunci Jawaban
      { wch: 50 }, // Keterangan / Aturan
    ];
    XLSX.utils.book_append_sheet(wb, wsInstructions, "Petunjuk Jenis Soal");

    // 3. Data untuk Sheet 3: "Daftar Topik & Referensi"
    const guideRows: Array<Record<string, string>> = [];

    subjects.forEach((sub) => {
      if (sub.topics.length === 0) {
        guideRows.push({
          "Mata Pelajaran": sub.name,
          "Kode Mapel": sub.code || "-",
          "Nama Topik Terdaftar": "(Belum ada topik - tambahkan topik di menu Bank Soal)",
          "Deskripsi Topik": "-",
        });
      } else {
        sub.topics.forEach((top) => {
          guideRows.push({
            "Mata Pelajaran": sub.name,
            "Kode Mapel": sub.code || "-",
            "Nama Topik Terdaftar": top.name,
            "Deskripsi Topik": top.description || "-",
          });
        });
      }
    });

    const wsGuide = XLSX.utils.json_to_sheet(guideRows);
    wsGuide["!cols"] = [
      { wch: 22 }, // Mata Pelajaran
      { wch: 12 }, // Kode Mapel
      { wch: 32 }, // Nama Topik Terdaftar
      { wch: 45 }, // Deskripsi Topik
    ];

    XLSX.utils.book_append_sheet(wb, wsGuide, "Daftar Topik & Referensi");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new Uint8Array(buffer);
  }

  /**
   * Mengimpor soal Pilihan Ganda, PG Kompleks, Benar/Salah, dan TKP
   * (opsi berbobot) dari file Excel (.xlsx / .xls / .csv)
   */
  static async importQuestionsFromExcel(
    userId: string,
    fileBuffer: Buffer | ArrayBuffer | Uint8Array,
  ): Promise<ImportResult> {
    const wb = XLSX.read(fileBuffer, { type: "buffer" });
    if (!wb.SheetNames || wb.SheetNames.length === 0) {
      throw new AppError("VALIDATION_ERROR", "File Excel kosong atau format tidak didukung.");
    }

    // Ambil sheet "Template Soal" atau sheet pertama
    const sheetName =
      wb.SheetNames.find((name) => name.toLowerCase().includes("soal")) || wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];

    if (!sheet) {
      throw new AppError("VALIDATION_ERROR", "Lembar kerja soal tidak ditemukan di file Excel.");
    }

    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

    if (!rawRows || rawRows.length === 0) {
      throw new AppError("VALIDATION_ERROR", "Tidak ada data baris yang ditemukan pada file Excel.");
    }

    // Batasi jumlah baris untuk mencegah pemrosesan file berukuran ekstrem
    const MAX_IMPORT_ROWS = 2000;
    if (rawRows.length > MAX_IMPORT_ROWS) {
      throw new AppError(
        "VALIDATION_ERROR",
        `File berisi ${rawRows.length} baris, melebihi batas maksimal ${MAX_IMPORT_ROWS} baris per impor.`,
      );
    }

    // Ambil data referensi subject & topic untuk validasi relasi
    const subjects = await prisma.subject.findMany({
      include: { topics: true },
    });

    // Peta lookup case-insensitive: "subjectNameLower" -> Map("topicNameLower" -> topicId)
    const subjectMap = new Map<string, { id: string; name: string; topics: Map<string, string> }>();

    for (const sub of subjects) {
      const topicMap = new Map<string, string>();
      for (const top of sub.topics) {
        topicMap.set(top.name.trim().toLowerCase(), top.id);
      }
      subjectMap.set(sub.name.trim().toLowerCase(), {
        id: sub.id,
        name: sub.name,
        topics: topicMap,
      });
      if (sub.code) {
        subjectMap.set(sub.code.trim().toLowerCase(), {
          id: sub.id,
          name: sub.name,
          topics: topicMap,
        });
      }
    }

    const errors: RowError[] = [];
    const validQuestions: Array<{
      topicId: string;
      createdById: string;
      type: QuestionType;
      content: string;
      difficulty: DifficultyLevel;
      explanation: string | null;
      options: Array<{
        label: string;
        content: string;
        isCorrect: boolean;
        score?: number | null;
      }>;
    }> = [];

    // Mengubah nilai sel skor menjadi angka. Sel kosong / tidak valid -> null.
    const parseOptionalScore = (raw: unknown): number | null => {
      if (raw === "" || raw === null || raw === undefined) return null;
      const normalized = String(raw).trim().replace(",", ".");
      if (!normalized) return null;
      const value = Number(normalized);
      return Number.isFinite(value) ? value : null;
    };

    rawRows.forEach((row, index) => {
      const rowNumber = index + 2; // Baris 1 adalah header di Excel

      // Ambil nilai kolom dengan toleransi variasi penamaan header
      const rawType = String(
        row["Jenis Soal"] || row["jenis_soal"] || row["Tipe Soal"] || row["tipe_soal"] || row["Type"] || "",
      ).trim().toUpperCase();

      const subjectName = String(
        row["Mata Pelajaran"] || row["mata_pelajaran"] || row["Subject"] || "",
      ).trim();
      const topicName = String(
        row["Topik Materi"] || row["topik_materi"] || row["Topik"] || row["Topic"] || "",
      ).trim();
      const rawDifficulty = String(
        row["Tingkat Kesulitan"] || row["tingkat_kesulitan"] || row["Difficulty"] || "SEDANG",
      ).trim().toUpperCase();
      const content = String(
        row["Teks Soal"] || row["teks_soal"] || row["Soal"] || row["Question"] || "",
      ).trim();

      const optA = String(row["Opsi A"] || row["opsi_a"] || row["A"] || "").trim();
      const optB = String(row["Opsi B"] || row["opsi_b"] || row["B"] || "").trim();
      const optC = String(row["Opsi C"] || row["opsi_c"] || row["C"] || "").trim();
      const optD = String(row["Opsi D"] || row["opsi_d"] || row["D"] || "").trim();
      const optE = String(row["Opsi E"] || row["opsi_e"] || row["E"] || "").trim();

      const rawScoreA =
        row["Skor A"] ?? row["skor_a"] ?? row["Score A"] ?? row["score_a"] ?? row["Skor Opsi A"] ?? "";
      const rawScoreB =
        row["Skor B"] ?? row["skor_b"] ?? row["Score B"] ?? row["score_b"] ?? row["Skor Opsi B"] ?? "";
      const rawScoreC =
        row["Skor C"] ?? row["skor_c"] ?? row["Score C"] ?? row["score_c"] ?? row["Skor Opsi C"] ?? "";
      const rawScoreD =
        row["Skor D"] ?? row["skor_d"] ?? row["Score D"] ?? row["score_d"] ?? row["Skor Opsi D"] ?? "";
      const rawScoreE =
        row["Skor E"] ?? row["skor_e"] ?? row["Score E"] ?? row["score_e"] ?? row["Skor Opsi E"] ?? "";

      const rawCorrectKey = String(
        row["Kunci Jawaban"] || row["kunci_jawaban"] || row["Kunci"] || row["Answer"] || "",
      ).trim().toUpperCase();

      const explanation = String(
        row["Pembahasan"] || row["pembahasan"] || row["Explanation"] || "",
      ).trim();

      // Jika baris kosong sama sekali, lewati saja
      if (!subjectName && !topicName && !content) {
        return;
      }

      // Validasi 1: Teks Soal
      if (!content) {
        errors.push({ row: rowNumber, error: "Teks Soal wajib diisi." });
        return;
      }

      // Validasi 2: Mata Pelajaran
      if (!subjectName) {
        errors.push({ row: rowNumber, error: "Mata Pelajaran wajib diisi." });
        return;
      }

      const foundSubject = subjectMap.get(subjectName.toLowerCase());
      if (!foundSubject) {
        errors.push({
          row: rowNumber,
          error: `Mata Pelajaran "${subjectName}" tidak terdaftar di sistem.`,
        });
        return;
      }

      // Validasi 3: Topik Materi
      if (!topicName) {
        errors.push({ row: rowNumber, error: "Topik Materi wajib diisi." });
        return;
      }

      const targetTopicId = foundSubject.topics.get(topicName.toLowerCase());
      if (!targetTopicId) {
        errors.push({
          row: rowNumber,
          error: `Topik "${topicName}" tidak ditemukan pada mapel "${foundSubject.name}". Pastikan nama topik sesuai dengan lembar referensi.`,
        });
        return;
      }

      // Tentukan Tipe Soal
      let questionType: QuestionType = QuestionType.SINGLE_CHOICE;
      if (rawType.includes("KOMPLEKS") || rawType.includes("MULTIPLE") || rawType.includes("COMPLEX")) {
        questionType = QuestionType.MULTIPLE_CHOICE;
      } else if (
        rawType.includes("TKP") ||
        rawType.includes("BERBOBOT") ||
        rawType.includes("WEIGHTED")
      ) {
        questionType = QuestionType.WEIGHTED_CHOICE;
      } else if (
        rawType.includes("BENAR") ||
        rawType.includes("SALAH") ||
        rawType.includes("TRUE") ||
        rawType.includes("FALSE")
      ) {
        questionType = QuestionType.TRUE_FALSE;
      }

      // Validasi Opsi & Kunci Jawaban Berdasarkan Tipe Soal
      const questionOptions: Array<{
        label: string;
        content: string;
        isCorrect: boolean;
        score?: number;
      }> = [];

      if (questionType === QuestionType.SINGLE_CHOICE) {
        // --- 1. PILIHAN GANDA BIASA ---
        if (!optA || !optB || !optC || !optD || !optE) {
          errors.push({
            row: rowNumber,
            error: "Untuk Pilihan Ganda biasa, Opsi jawaban A, B, C, D, dan E seluruhnya wajib diisi.",
          });
          return;
        }

        if (!["A", "B", "C", "D", "E"].includes(rawCorrectKey)) {
          errors.push({
            row: rowNumber,
            error: `Kunci Jawaban "${rawCorrectKey}" tidak valid. Untuk Pilihan Ganda harus salah satu dari A, B, C, D, atau E.`,
          });
          return;
        }

        questionOptions.push(
          { label: "A", content: optA, isCorrect: rawCorrectKey === "A" },
          { label: "B", content: optB, isCorrect: rawCorrectKey === "B" },
          { label: "C", content: optC, isCorrect: rawCorrectKey === "C" },
          { label: "D", content: optD, isCorrect: rawCorrectKey === "D" },
          { label: "E", content: optE, isCorrect: rawCorrectKey === "E" },
        );
      } else if (questionType === QuestionType.MULTIPLE_CHOICE) {
        // --- 2. PILIHAN GANDA KOMPLEKS ---
        if (!optA || !optB) {
          errors.push({
            row: rowNumber,
            error: "Untuk PG Kompleks, minimal Opsi A dan Opsi B wajib diisi.",
          });
          return;
        }

        // Kumpulkan opsi yang tersedia (A-E yang tidak kosong)
        const rawOptionsList = [
          { label: "A", content: optA },
          { label: "B", content: optB },
          { label: "C", content: optC },
          { label: "D", content: optD },
          { label: "E", content: optE },
        ].filter((o) => o.content.length > 0);

        const availableLabels = rawOptionsList.map((o) => o.label);

        // Parse kunci jawaban multi-select (misal: "A, B, D" atau "A C" atau "A;B")
        const parsedKeys = Array.from(
          new Set(
            rawCorrectKey
              .split(/[,;\s/]+/)
              .map((k) => k.trim().toUpperCase())
              .filter(Boolean),
          ),
        );

        if (parsedKeys.length < 2) {
          errors.push({
            row: rowNumber,
            error: `Kunci Jawaban PG Kompleks "${rawCorrectKey}" tidak valid. Wajib memiliki minimal 2 jawaban benar (contoh: 'A, C' atau 'A, B, D').`,
          });
          return;
        }

        // Cek apakah ada kunci yang berada di luar opsi yang diisi
        const invalidKeys = parsedKeys.filter((k) => !availableLabels.includes(k));
        if (invalidKeys.length > 0) {
          errors.push({
            row: rowNumber,
            error: `Kunci jawaban memuat opsi [${invalidKeys.join(", ")}] yang tidak memiliki teks pilihan di lembar Excel.`,
          });
          return;
        }

        for (const opt of rawOptionsList) {
          questionOptions.push({
            label: opt.label,
            content: opt.content,
            isCorrect: parsedKeys.includes(opt.label),
          });
        }
      } else if (questionType === QuestionType.TRUE_FALSE) {
        // --- 3. BENAR / SALAH ---
        const labelAContent = optA || "Benar";
        const labelBContent = optB || "Salah";

        // Normalisasi kunci jawaban
        let isCorrectA = false;
        let isCorrectB = false;

        if (
          rawCorrectKey === "A" ||
          rawCorrectKey === "BENAR" ||
          rawCorrectKey === "TRUE" ||
          rawCorrectKey === "B1" // variasi B/S
        ) {
          isCorrectA = true;
        } else if (
          rawCorrectKey === "B" ||
          rawCorrectKey === "SALAH" ||
          rawCorrectKey === "FALSE" ||
          rawCorrectKey === "S"
        ) {
          isCorrectB = true;
        } else {
          errors.push({
            row: rowNumber,
            error: `Kunci Jawaban Benar/Salah "${rawCorrectKey}" tidak valid. Harap gunakan 'A' (Benar) atau 'B' (Salah).`,
          });
          return;
        }

        questionOptions.push(
          { label: "A", content: labelAContent, isCorrect: isCorrectA },
          { label: "B", content: labelBContent, isCorrect: isCorrectB },
        );
      } else if (questionType === QuestionType.WEIGHTED_CHOICE) {
        // --- 4. TKP / OPSI BERBOBOT ---
        const optionContents = [optA, optB, optC, optD, optE];
        if (optionContents.some((c) => !c)) {
          errors.push({
            row: rowNumber,
            error:
              "Untuk TKP (opsi berbobot), Opsi jawaban A, B, C, D, dan E seluruhnya wajib diisi.",
          });
          return;
        }

        const rawScores = [rawScoreA, rawScoreB, rawScoreC, rawScoreD, rawScoreE];
        const parsedScores = rawScores.map(parseOptionalScore);
        if (parsedScores.some((s) => s === null)) {
          errors.push({
            row: rowNumber,
            error: "Untuk TKP, kolom Skor A sampai Skor E wajib diisi.",
          });
          return;
        }

        const scores = parsedScores as number[];
        if (scores.some((s) => !Number.isInteger(s) || s < 1 || s > 5)) {
          errors.push({
            row: rowNumber,
            error: "Skor opsi TKP harus berupa bilangan bulat 1 sampai 5.",
          });
          return;
        }

        if (new Set(scores).size !== 5) {
          errors.push({
            row: rowNumber,
            error:
              "Skor opsi TKP tidak boleh sama. Setiap opsi harus memiliki skor unik 1-5.",
          });
          return;
        }

        const labels = ["A", "B", "C", "D", "E"];
        for (let i = 0; i < labels.length; i++) {
          questionOptions.push({
            label: labels[i],
            content: optionContents[i],
            isCorrect: false,
            score: scores[i],
          });
        }
      }

      // Validasi Tingkat Kesulitan
      let difficulty: DifficultyLevel = DifficultyLevel.MEDIUM;
      if (rawDifficulty === "MUDAH" || rawDifficulty === "EASY") {
        difficulty = DifficultyLevel.EASY;
      } else if (rawDifficulty === "SULIT" || rawDifficulty === "HARD") {
        difficulty = DifficultyLevel.HARD;
      } else {
        difficulty = DifficultyLevel.MEDIUM;
      }

      validQuestions.push({
        topicId: targetTopicId,
        createdById: userId,
        type: questionType,
        content,
        difficulty,
        explanation: explanation || null,
        options: questionOptions,
      });
    });

    // Simpan seluruh soal yang valid dalam satu transaksi database
    if (validQuestions.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const q of validQuestions) {
          await tx.question.create({
            data: {
              topicId: q.topicId,
              createdById: q.createdById,
              type: q.type,
              content: q.content,
              difficulty: q.difficulty,
              explanation: q.explanation,
              options: {
                create: q.options,
              },
            },
          });
        }
      });
    }

    return {
      totalRows: validQuestions.length + errors.length,
      successCount: validQuestions.length,
      failedCount: errors.length,
      errors,
    };
  }
}
