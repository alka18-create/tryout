/**
 * Helper & Types untuk Tipe Soal Matriks / Tabel Kategori Pernyataan (Matrix Question)
 * Digunakan secara terpadu di Ujian Siswa (ExamRoom), Form Guru (QuestionForm),
 * Pembahasan (DiscussionViewer), Penilaian (ScoringService), dan Import Excel.
 *
 * Format label opsi: `${rowNumber}:${columnIndex}:${columnName}`
 * Contoh: "1:1:Sesuai", "1:2:Tidak Sesuai", "2:1:Sesuai".
 * `columnIndex` disimpan eksplisit agar urutan kolom tetap konsisten meskipun
 * nama kolom mengandung karakter khusus atau jumlah baris lebih dari 9.
 */

export interface MatrixColumnItem {
  columnIndex: number;
  columnName: string;
  optionId: string;
  isCorrect?: boolean;
}

export interface MatrixRowItem {
  rowNumber: number;
  statement: string;
  imageUrl?: string | null;
  columns: MatrixColumnItem[];
}

export interface ParsedMatrixQuestion {
  columnNames: string[];
  rows: MatrixRowItem[];
}

export interface MatrixOptionLike {
  id: string;
  label: string;
  content: string;
  imageUrl?: string | null;
  isCorrect?: boolean;
}

/**
 * Mengurai label opsi matriks. Mendukung format baru `row:columnIndex:name`
 * sekaligus format lama `row:name` agar data lama tetap terbaca.
 */
export function parseMatrixLabel(label: string): {
  rowNumber: number;
  columnIndex: number;
  columnName: string;
} {
  const raw = (label || "").trim();
  const parts = raw.split(":");

  const rowNumber = Math.max(1, parseInt(parts[0], 10) || 1);

  if (parts.length >= 3) {
    const columnIndex = Math.max(1, parseInt(parts[1], 10) || 1);
    return {
      rowNumber,
      columnIndex,
      columnName: parts.slice(2).join(":").trim() || `Kolom ${columnIndex}`,
    };
  }

  return {
    rowNumber,
    columnIndex: 1,
    columnName: (parts[1] || "").trim() || "Pilihan",
  };
}

/** Menyusun label opsi matriks yang menyimpan nomor baris, indeks, dan nama kolom. */
export function buildMatrixLabel(
  rowNumber: number,
  columnIndex: number,
  columnName: string,
): string {
  return `${rowNumber}:${columnIndex}:${columnName.trim()}`;
}

/**
 * Mengurutkan opsi matriks berdasarkan nomor baris lalu indeks kolom.
 * Dipakai agar urutan tabel selalu sama antara lembar ujian dan pembahasan.
 */
export function sortMatrixOptions<T extends { label: string }>(options: T[]): T[] {
  return [...options].sort((a, b) => {
    const left = parseMatrixLabel(a.label);
    const right = parseMatrixLabel(b.label);
    if (left.rowNumber !== right.rowNumber) return left.rowNumber - right.rowNumber;
    return left.columnIndex - right.columnIndex;
  });
}

/**
 * Mengubah label opsi matriks menjadi teks yang ramah dibaca, mis. "1. Sesuai".
 * Label non-matriks (A–E) dikembalikan apa adanya.
 */
export function formatMatrixOptionLabel(label: string): string {
  const raw = (label || "").trim();
  if (!/^\d+:\d+:/.test(raw)) return raw;
  const { rowNumber, columnName } = parseMatrixLabel(raw);
  return `${rowNumber}. ${columnName}`;
}

/**
 * Mengurai array opsi pertanyaan menjadi struktur baris & kolom matriks terorganisir.
 */
export function parseMatrixQuestion(options: MatrixOptionLike[]): ParsedMatrixQuestion {
  const columnNames: string[] = [];
  const rowsMap = new Map<number, MatrixRowItem>();

  for (const opt of options) {
    const { rowNumber, columnIndex, columnName } = parseMatrixLabel(opt.label);

    if (!columnNames.includes(columnName)) {
      columnNames.push(columnName);
    }

    let row = rowsMap.get(rowNumber);
    if (!row) {
      row = {
        rowNumber,
        statement: opt.content,
        imageUrl: opt.imageUrl ?? null,
        columns: [],
      };
      rowsMap.set(rowNumber, row);
    }

    if (!row.statement && opt.content) {
      row.statement = opt.content;
    }

    row.columns.push({
      columnIndex,
      columnName,
      optionId: opt.id,
      isCorrect: opt.isCorrect,
    });
  }

  const rows = Array.from(rowsMap.values()).sort((a, b) => a.rowNumber - b.rowNumber);
  rows.forEach((row) => row.columns.sort((a, b) => a.columnIndex - b.columnIndex));

  // Urutan kolom mengikuti baris pertama, lalu lengkapi dari kolom lain yang belum tercatat.
  const orderedColumns: string[] = [];
  for (const column of rows[0]?.columns ?? []) {
    if (!orderedColumns.includes(column.columnName)) orderedColumns.push(column.columnName);
  }
  for (const columnName of columnNames) {
    if (!orderedColumns.includes(columnName)) orderedColumns.push(columnName);
  }

  return { columnNames: orderedColumns, rows };
}

/**
 * Menyusun baris pernyataan dan daftar kolom menjadi array opsi standar TryoutKu.
 */
export function buildMatrixOptions(
  rows: Array<{
    statement: string;
    correctColumn: string;
    imageUrl?: string | null;
  }>,
  columnNames: string[],
): Array<{
  label: string;
  content: string;
  isCorrect: boolean;
  imageUrl?: string | null;
}> {
  const options: Array<{
    label: string;
    content: string;
    isCorrect: boolean;
    imageUrl?: string | null;
  }> = [];

  rows.forEach((row, rowIdx) => {
    const rowNumber = rowIdx + 1;
    columnNames.forEach((columnName, columnIdx) => {
      options.push({
        label: buildMatrixLabel(rowNumber, columnIdx + 1, columnName),
        content: row.statement.trim(),
        isCorrect: row.correctColumn === columnName,
        imageUrl: row.imageUrl || undefined,
      });
    });
  });

  return options;
}

/**
 * Mengecek apakah seluruh baris matriks sudah dipilih (satu pilihan per baris).
 */
export function isMatrixFullyAnswered(
  options: MatrixOptionLike[],
  selectedOptionIds: string[] | undefined | null,
): boolean {
  const selected = new Set(selectedOptionIds ?? []);
  const { rows } = parseMatrixQuestion(options);
  if (rows.length === 0) return false;

  return rows.every((row) => row.columns.some((column) => selected.has(column.optionId)));
}
