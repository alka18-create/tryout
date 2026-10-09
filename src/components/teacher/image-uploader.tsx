"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  X,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  ExternalLink,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageUploaderProps {
  value?: string | null;
  onChange: (url: string) => void;
  label?: string;
  description?: string;
  compact?: boolean;
}

export function ImageUploader({
  value,
  onChange,
  label,
  description = "Format JPG, PNG, WebP (Maksimal 1 MB)",
  compact = false,
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    setErrorMessage(null);

    // 1. Validasi ukuran di client (maks 1 MB)
    if (file.size > 1 * 1024 * 1024) {
      setErrorMessage(
        `Ukuran file (${(file.size / (1024 * 1024)).toFixed(2)} MB) melebihi batas maksimal 1 MB.`,
      );
      return;
    }

    // 2. Validasi tipe file
    const validMimes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/svg+xml",
    ];
    if (!validMimes.includes(file.type.toLowerCase())) {
      setErrorMessage("Harap unggah file gambar (JPG, PNG, WebP, GIF, atau SVG).");
      return;
    }

    // 3. Upload ke API
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/teacher/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Gagal mengunggah gambar");
      }

      onChange(json.data.url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat mengunggah gambar.";
      setErrorMessage(msg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleManualUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualUrl.trim()) {
      onChange(manualUrl.trim());
      setShowUrlInput(false);
      setManualUrl("");
    }
  };

  const handleRemove = () => {
    onChange("");
    setErrorMessage(null);
  };

  // ─── Tampilan Jika Gambar Sudah Ada ───
  if (value) {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
            {label}
          </label>
        )}
        <div
          className={`relative rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center gap-3 p-2.5 transition-all ${
            compact ? "max-w-md" : "w-full"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Lampiran"
            className="w-16 h-16 rounded-lg object-contain bg-white border border-slate-200 shrink-0"
          />

          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-800 truncate" title={value}>
              {value.startsWith("/") ? value.split("/").pop() : value}
            </p>
            <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
              <span>●</span> Gambar Terlampir
            </p>
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 hover:underline mt-1"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Buka Ukuran Penuh</span>
            </a>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
            >
              Ganti
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
              title="Hapus gambar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
            }}
          />
        </div>
      </div>
    );
  }

  // ─── Tampilan Compact (Misal di samping / bawah pilihan opsi A-E) ───
  if (compact) {
    return (
      <div className="space-y-1">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
          }}
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-blue-600 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg transition-colors cursor-pointer"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>Mengunggah...</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-3.5 h-3.5" />
                <span>+ Gambar Opsi (Maks 1MB)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
            title="Tempel URL Gambar"
          >
            <Link2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {showUrlInput && (
          <div className="flex items-center gap-1.5 pt-1">
            <input
              type="url"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="https://.../gambar.png"
              className="text-xs px-2 py-1 rounded border border-slate-200 bg-white w-48 outline-none focus:border-blue-500"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleManualUrlSubmit}
              className="text-xs py-1 px-2 h-7"
            >
              OK
            </Button>
            <button
              type="button"
              onClick={() => setShowUrlInput(false)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {errorMessage && (
          <p className="text-[11px] text-rose-600 flex items-center gap-1 mt-1">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>{errorMessage}</span>
          </p>
        )}
      </div>
    );
  }

  // ─── Tampilan Dropzone Standar (Untuk Soal & Pembahasan) ───
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
          {label}
        </label>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
        }}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-4 transition-all text-center ${
          isDragging
            ? "border-blue-500 bg-blue-50/50"
            : "border-slate-200 bg-slate-50/40 hover:bg-slate-50/80 hover:border-slate-300"
        }`}
      >
        {isUploading ? (
          <div className="py-3 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <p className="text-xs font-medium text-slate-600">Mengunggah file gambar...</p>
          </div>
        ) : (
          <div className="py-2 flex flex-col items-center justify-center gap-1.5">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-0.5">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
              >
                Pilih file gambar
              </button>
              <span className="text-slate-500">atau tarik file ke sini</span>
            </div>
            <p className="text-[11px] text-slate-400">{description}</p>

            <div className="pt-1.5">
              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="text-[11px] text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
              >
                <Link2 className="w-3 h-3" />
                <span>Atau gunakan URL tautan gambar</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {showUrlInput && (
        <form onSubmit={handleManualUrlSubmit} className="flex items-center gap-2 pt-1">
          <input
            type="url"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="https://domain.com/path-ke-gambar.jpg"
            className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-500 shadow-xs"
          />
          <Button type="submit" size="sm" variant="primary" className="text-xs">
            Gunakan URL
          </Button>
          <button
            type="button"
            onClick={() => setShowUrlInput(false)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </form>
      )}

      {errorMessage && (
        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
