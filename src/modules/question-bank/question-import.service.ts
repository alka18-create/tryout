import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { DifficultyLevel } from "@/generated/prisma/client";

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
   * contoh data valid dan lembar referensi topik materi yang ada di database.
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
        "No": 1,
        "Mata Pelajaran": defaultSubject,
        "Topik Materi": defaultTopic,
        "Tingkat Kesulitan": "MUDAH",
        "Teks Soal": "Identitas diri seseorang yang terbentuk melalui proses interaksi sosial dalam lingkungan keluarga disebut sebagai...",
        "Opsi A": "Identitas gender",
        "Opsi B": "Identitas primer",
        "Opsi C": "Identitas sekunder",
        "Opsi D": "Identitas komunal",
        "Opsi E": "Identitas profesional",
        "Kunci Jawaban": "B",
        "Pembahasan": "Identitas primer merupakan fondasi kepribadian dasar yang pertama kali dibentuk dalam lingkungan sosialisasi primer, yaitu keluarga.",
      },
      {
        "No": 2,
        "Mata Pelajaran": defaultSubject,
        "Topik Materi": secondTopic,
        "Tingkat Kesulitan": "SEDANG",
        "Teks Soal": "Stratifikasi sosial terbuka memberikan kesempatan bagi setiap anggota masyarakat untuk...",
        "Opsi A": "Mempertahankan status sosial secara turun-temurun",
        "Opsi B": "Melakukan mobilitas sosial vertikal naik berdasarkan prestasi",
        "Opsi C": "Menolak aturan norma hukum yang berlaku",
        "Opsi D": "Menghapus sepenuhnya diferensiasi pekerjaan",
        "Opsi E": "Menguasai seluruh sumber daya ekonomi secara monopoli",
        "Kunci Jawaban": "B",
        "Pembahasan": "Sistem pelapisan terbuka (open stratification) memungkinkan mobilitas sosial vertikal berdasarkan pencapaian atau usaha individu (achieved status).",
      },
      {
        "No": 3,
        "Mata Pelajaran": defaultSubject,
        "Topik Materi": secondTopic,
        "Tingkat Kesulitan": "SULIT",
        "Teks Soal": "Metode resolusi konflik sosial di mana pihak ketiga berwenang mengambil keputusan yang mengikat para pihak yang bersengketa dinamakan...",
        "Opsi A": "Mediasi",
        "Opsi B": "Konsiliasi",
        "Opsi C": "Arbitrase",
        "Opsi D": "Ajudikasi",
        "Opsi E": "Kompromi",
        "Kunci Jawaban": "C",
        "Pembahasan": "Dalam proses arbitrase, pihak ketiga (arbiter) memiliki kewenangan untuk memutuskan penyelesaian konflik dan keputusannya bersifat mengikat bagi kedua belah pihak.",
      },
    ];

    const wb = XLSX.utils.book_new();

    // Buat Sheet 1: Template Soal
    const wsTemplate = XLSX.utils.json_to_sheet(sampleRows);

    // Atur lebar kolom agar nyaman dibaca di Excel
    wsTemplate["!cols"] = [
      { wch: 5 },  // No
      { wch: 18 }, // Mata Pelajaran
      { wch: 30 }, // Topik Materi
      { wch: 16 }, // Tingkat Kesulitan
      { wch: 60 }, // Teks Soal
      { wch: 25 }, // Opsi A
      { wch: 25 }, // Opsi B
      { wch: 25 }, // Opsi C
      { wch: 25 }, // Opsi D
      { wch: 25 }, // Opsi E
      { wch: 14 }, // Kunci Jawaban
      { wch: 50 }, // Pembahasan
    ];

    XLSX.utils.book_append_sheet(wb, wsTemplate, "Template Soal");

    // 2. Data untuk Sheet 2: "Panduan & Daftar Topik"
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
   * Mengimpor soal pilihan ganda dari file Excel (.xlsx / .xls / .csv)
   */
  static async importQuestionsFromExcel(
    userId: string,
    fileBuffer: Buffer | ArrayBuffer,
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

    // Ambil data referensi subject & topic untuk validasi relasi
    const subjects = await prisma.subject.findMany({
      include: { topics: true },
    });

    // Peta lookup case-insensitive: "subjectNameLower" -> Map("topicNameLower" -> topic)
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
      content: string;
      difficulty: DifficultyLevel;
      explanation: string | null;
      options: Array<{
        label: string;
        content: string;
        isCorrect: boolean;
      }>;
    }> = [];

    rawRows.forEach((row, index) => {
      const rowNumber = index + 2; // Baris 1 adalah header di Excel

      // Ambil nilai kolom dengan toleransi variasi penamaan header
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

      const correctKey = String(
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

      // Validasi 4: Pilihan Jawaban (A-E)
      if (!optA || !optB || !optC || !optD || !optE) {
        errors.push({
          row: rowNumber,
          error: "Opsi jawaban A, B, C, D, dan E seluruhnya wajib diisi.",
        });
        return;
      }

      // Validasi 5: Kunci Jawaban
      if (!["A", "B", "C", "D", "E"].includes(correctKey)) {
        errors.push({
          row: rowNumber,
          error: `Kunci Jawaban "${correctKey}" tidak valid. Harus salah satu dari A, B, C, D, atau E.`,
        });
        return;
      }

      // Validasi 6: Tingkat Kesulitan
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
        content,
        difficulty,
        explanation: explanation || null,
        options: [
          { label: "A", content: optA, isCorrect: correctKey === "A" },
          { label: "B", content: optB, isCorrect: correctKey === "B" },
          { label: "C", content: optC, isCorrect: correctKey === "C" },
          { label: "D", content: optD, isCorrect: correctKey === "D" },
          { label: "E", content: optE, isCorrect: correctKey === "E" },
        ],
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
