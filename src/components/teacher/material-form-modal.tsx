"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Link as LinkIcon,
  Video,
  FileText,
  Globe,
  AlertCircle,
  Save,
  CheckCircle2,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { detectMaterialType } from "@/modules/learning-material/learning-material.schema";

interface TopicOption {
  id: string;
  name: string;
}

export interface LearningMaterialItem {
  id: string;
  title: string;
  description: string | null;
  url: string;
  type: string;
  subjectId: string;
  topicId: string | null;
  subject: {
    id: string;
    name: string;
    code?: string | null;
  };
  topic?: {
    id: string;
    name: string;
  } | null;
  author: {
    id: string;
    name: string;
    email: string;
  };
  isActive: boolean;
  createdAt: string;
}

interface MaterialFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editItem?: LearningMaterialItem | null;
  subjects: Array<{ id: string; name: string }>;
}

export function MaterialFormModal({
  isOpen,
  onClose,
  onSuccess,
  editItem,
  subjects,
}: MaterialFormModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [type, setType] = useState("AUTO");
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate data when opening modal for edit or create
  useEffect(() => {
    if (editItem) {
      setTitle(editItem.title);
      setDescription(editItem.description || "");
      setUrl(editItem.url);
      setSubjectId(editItem.subjectId);
      setTopicId(editItem.topicId || "");
      setType(editItem.type || "AUTO");
    } else {
      setTitle("");
      setDescription("");
      setUrl("");
      setSubjectId(subjects[0]?.id || "");
      setTopicId("");
      setType("AUTO");
    }
    setError(null);
  }, [editItem, subjects, isOpen]);

  // Fetch topics when subjectId changes
  useEffect(() => {
    if (!subjectId) {
      setTopics([]);
      return;
    }

    const fetchTopics = async () => {
      setIsLoadingTopics(true);
      try {
        const res = await fetch(`/api/teacher/topics?subjectId=${encodeURIComponent(subjectId)}`);
        const json = await res.json();
        if (json.success && json.data) {
          setTopics(json.data);
        } else {
          setTopics([]);
        }
      } catch {
        setTopics([]);
      } finally {
        setIsLoadingTopics(false);
      }
    };

    fetchTopics();
  }, [subjectId]);

  if (!isOpen) return null;

  const detectedAutoType = detectMaterialType(url);
  const effectiveType = type === "AUTO" ? detectedAutoType : type;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Judul materi wajib diisi.");
      return;
    }
    if (!url.trim()) {
      setError("Link tautan materi wajib diisi.");
      return;
    }
    if (!subjectId) {
      setError("Mata pelajaran wajib dipilih.");
      return;
    }

    try {
      new URL(url);
    } catch {
      setError("Format URL tidak valid. Pastikan diawali dengan http:// atau https://");
      return;
    }

    setIsSubmitting(true);

    try {
      const endpoint = editItem
        ? `/api/materials/${editItem.id}`
        : "/api/materials";
      const method = editItem ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          url: url.trim(),
          subjectId,
          topicId: topicId || undefined,
          type: effectiveType,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error?.message || "Gagal menyimpan materi pembelajaran.");
        setIsSubmitting(false);
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setError("Terjadi kesalahan jaringan saat menyimpan materi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeLabel = (t: string) => {
    switch (t) {
      case "YOUTUBE":
        return { label: "Video YouTube", icon: <Video className="w-4 h-4 text-rose-500" /> };
      case "GOOGLE_DRIVE":
        return { label: "Google Drive / Docs", icon: <FolderOpen className="w-4 h-4 text-emerald-600" /> };
      case "DOCUMENT":
        return { label: "Dokumen / PDF", icon: <FileText className="w-4 h-4 text-amber-500" /> };
      case "ARTICLE":
        return { label: "Artikel / Bacaan Web", icon: <Globe className="w-4 h-4 text-blue-500" /> };
      default:
        return { label: "Tautan Web", icon: <LinkIcon className="w-4 h-4 text-slate-500" /> };
    }
  };

  const currentTypeInfo = getTypeLabel(effectiveType);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 sm:p-7 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {editItem ? "Edit Link Materi Pembelajaran" : "Tambah Link Materi Baru"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tempelkan link bahan ajar (Google Drive, YouTube, Docs, dll) untuk siswa
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Judul Materi */}
          <Input
            label="Judul Materi Belajar"
            required
            placeholder="Contoh: Rangkuman Lengkap Konflik Sosial (PDF)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          {/* URL Materi */}
          <div>
            <Input
              label="Tautan / Link Materi (URL)"
              required
              type="url"
              placeholder="https://drive.google.com/... atau https://youtube.com/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              helperText="Tempelkan link Google Drive, Docs, YouTube, Notion, atau web artikel"
            />
            {url.trim() && (
              <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200">
                <span className="text-slate-400">Deteksi Tipe:</span>
                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                  {currentTypeInfo.icon}
                  <span>{currentTypeInfo.label}</span>
                </div>
              </div>
            )}
          </div>

          {/* Mata Pelajaran & Topik */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Mata Pelajaran <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={subjectId}
                onChange={(e) => {
                  setSubjectId(e.target.value);
                  setTopicId("");
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900 text-xs outline-none shadow-2xs transition-colors"
              >
                <option value="">-- Pilih Mata Pelajaran --</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Topik Materi (Opsional)
              </label>
              <select
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                disabled={isLoadingTopics || topics.length === 0}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900 text-xs outline-none shadow-2xs transition-colors disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">-- Semua Topik (Umum) --</option>
                {topics.map((top) => (
                  <option key={top.id} value={top.id}>
                    {top.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Kategori Manual Tipe */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Format / Jenis Media
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900 text-xs outline-none shadow-2xs transition-colors"
            >
              <option value="AUTO">Otomatis Deteksi dari Link</option>
              <option value="GOOGLE_DRIVE">Google Drive / Google Docs</option>
              <option value="YOUTUBE">Video YouTube</option>
              <option value="DOCUMENT">Dokumen Modul / PDF Eksternal</option>
              <option value="ARTICLE">Artikel / Web Bacaan</option>
              <option value="LINK">Tautan Web Umum</option>
            </select>
          </div>

          {/* Deskripsi */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Ringkasan / Petunjuk Belajar
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan ringkas apa yang dipelajari pada link ini atau petunjuk khusus untuk siswa..."
              className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900 text-xs outline-none resize-y shadow-2xs transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              className="gap-2 font-bold shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>{editItem ? "Simpan Perubahan" : "Simpan Link Materi"}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
