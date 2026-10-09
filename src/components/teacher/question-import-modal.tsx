"use client";

import React, { useState, useRef } from "react";
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface RowError {
  row: number;
  error: string;
}

interface ImportResult {
  totalRows: number;
  successCount: number;
  failedCount: number;
  errors: RowError[];
}

interface QuestionImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function QuestionImportModal({
  isOpen,
  onClose,
  onSuccess,
}: QuestionImportModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    setErrorMessage("");
    setResult(null);

    const validExtensions = [".xlsx", ".xls", ".csv"];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

    if (!validExtensions.includes(ext)) {
      setErrorMessage("Format file tidak didukung. Harap gunakan format .xlsx, .xls, atau .csv.");
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setErrorMessage("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/teacher/questions/import", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setErrorMessage(json.error?.message || "Gagal mengimpor file Excel.");
        setIsUploading(false);
        return;
      }

      setResult(json.data);
      if (json.data.successCount > 0) {
        onSuccess();
      }
    } catch {
      setErrorMessage("Terjadi kesalahan jaringan saat mengunggah file.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResult(null);
    setErrorMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Import Soal dari Excel</h2>
              <p className="text-xs text-slate-500">
                Unggah banyak soal sekaligus menggunakan template resmi TryoutKu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Box Unduh Template */}
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-blue-900 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                Template Resmi Excel (.xlsx)
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Dilengkapi contoh pengisian data valid dan daftar nama topik aktif di database.
              </p>
            </div>
            <a
              href="/api/teacher/questions/template"
              download="Template_Import_Soal_TryoutKu.xlsx"
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-xs active:scale-95 shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Download Template
            </a>
          </div>

          {/* Error Banner Global */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1">
                <p className="font-semibold">Terjadi Kesalahan</p>
                <p className="text-xs text-rose-700 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Area Drag & Drop File */}
          {!result && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
              />

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-blue-500 bg-blue-50"
                    : selectedFile
                    ? "border-emerald-500/50 bg-emerald-50/50 hover:border-emerald-500"
                    : "border-slate-300 bg-slate-50/50 hover:border-blue-400 hover:bg-blue-50/20"
                }`}
              >
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      selectedFile
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-500 border border-slate-200"
                    }`}
                  >
                    {selectedFile ? <FileText className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
                  </div>
                  <div>
                    {selectedFile ? (
                      <>
                        <p className="text-sm font-bold text-emerald-800">{selectedFile.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Ukuran: {formatFileSize(selectedFile.size)} &bull; Klik untuk mengganti file
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-slate-700">
                          Tarik & jatuhkan file Excel di sini, atau{" "}
                          <span className="text-blue-600 underline underline-offset-2">pilih file</span>
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Mendukung format .xlsx, .xls, atau .csv (maks. 5MB)
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Ketentuan Ringkas */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-700">Tips Pengisian:</p>
                <ul className="list-disc pl-4 space-y-0.5 text-slate-500">
                  <li>Pastikan nama <strong>Mata Pelajaran</strong> dan <strong>Topik Materi</strong> sesuai dengan data yang terdaftar.</li>
                  <li>Tingkat kesulitan diisi dengan <strong>MUDAH</strong>, <strong>SEDANG</strong>, atau <strong>SULIT</strong>.</li>
                  <li>Kunci jawaban diisi dengan huruf kapital (<strong>A</strong>, <strong>B</strong>, <strong>C</strong>, <strong>D</strong>, atau <strong>E</strong>).</li>
                </ul>
              </div>
            </div>
          )}

          {/* Tampilan Hasil Import */}
          {result && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Statistik Hasil */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-xs text-slate-500">Total Baris</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{result.totalRows}</p>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <p className="text-xs text-emerald-700 font-medium">Berhasil Masuk</p>
                  <p className="text-2xl font-black text-emerald-700 mt-1">{result.successCount}</p>
                </div>
                <div
                  className={`p-4 rounded-xl border col-span-2 sm:col-span-1 ${
                    result.failedCount > 0
                      ? "bg-rose-50 border-rose-200 text-rose-800"
                      : "bg-slate-50 border-slate-200 text-slate-500"
                  }`}
                >
                  <p className="text-xs">Baris Gagal</p>
                  <p
                    className={`text-2xl font-black mt-1 ${
                      result.failedCount > 0 ? "text-rose-600" : "text-slate-400"
                    }`}
                  >
                    {result.failedCount}
                  </p>
                </div>
              </div>

              {/* Status Sukses Penuh */}
              {result.failedCount === 0 && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-sm font-bold">Impor Sempurna!</p>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      Seluruh {result.successCount} butir soal telah berhasil disimpan ke dalam Bank Soal.
                    </p>
                  </div>
                </div>
              )}

              {/* Daftar Error Per Baris (Jika Ada) */}
              {result.failedCount > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-rose-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Daftar Baris yang Perlu Diperbaiki ({result.errors.length} baris):
                  </p>
                  <div className="max-h-56 overflow-y-auto rounded-xl border border-rose-200 bg-rose-50/50 divide-y divide-rose-100">
                    {result.errors.map((err, idx) => (
                      <div key={idx} className="p-3 text-xs flex items-start gap-2.5">
                        <span className="px-2 py-0.5 rounded font-mono font-bold bg-rose-200 text-rose-900 shrink-0">
                          Baris {err.row}
                        </span>
                        <span className="text-slate-700 flex-1">{err.error}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    * Baris yang gagal tidak dimasukkan ke database. Perbaiki data pada baris di atas pada Excel Anda, lalu unggah kembali.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
          {result ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="gap-2 text-xs shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Upload File Lain</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={onClose}
                className="gap-2 text-xs shadow-xs"
              >
                <span>Selesai & Tutup</span>
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                disabled={isUploading}
                className="text-xs text-slate-500 hover:text-slate-900"
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="gap-2 text-xs sm:text-sm font-semibold shadow-xs"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Memproses Soal...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Unggah & Impor Soal</span>
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
