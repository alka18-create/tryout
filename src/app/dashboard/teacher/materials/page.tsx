"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  GraduationCap,
  Plus,
  Search,
  ExternalLink,
  Video,
  FileText,
  FolderOpen,
  Globe,
  Link as LinkIcon,
  Trash2,
  Edit,
  Filter,
  CheckCircle2,
  AlertCircle,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  MaterialFormModal,
  LearningMaterialItem,
} from "@/components/teacher/material-form-modal";

export default function TeacherMaterialsPage() {
  const [materials, setMaterials] = useState<LearningMaterialItem[]>([]);
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LearningMaterialItem | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchSubjects = useCallback(async () => {
    try {
      const res = await fetch("/api/teacher/subjects");
      const json = await res.json();
      if (json.success && json.data) {
        setSubjects(json.data);
      }
    } catch {
      console.error("Gagal memuat mata pelajaran");
    }
  }, []);

  const fetchMaterials = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/materials");
      const json = await res.json();
      if (json.success && json.data) {
        setMaterials(json.data);
      }
    } catch {
      console.error("Gagal memuat materi pembelajaran");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubjects();
    fetchMaterials();
  }, [fetchSubjects, fetchMaterials]);

  const handleDelete = async (item: LearningMaterialItem) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus materi "${item.title}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/materials/${item.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback({ type: "success", message: "Materi berhasil dihapus." });
        fetchMaterials();
      } else {
        setFeedback({ type: "error", message: json.error?.message || "Gagal menghapus materi." });
      }
    } catch {
      setFeedback({ type: "error", message: "Terjadi kesalahan jaringan saat menghapus materi." });
    }

    setTimeout(() => setFeedback(null), 4000);
  };

  const filteredMaterials = materials.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      (m.description && m.description.toLowerCase().includes(search.toLowerCase())) ||
      m.url.toLowerCase().includes(search.toLowerCase()) ||
      (m.topic?.name && m.topic.name.toLowerCase().includes(search.toLowerCase()));

    const matchesSubject = subjectFilter === "ALL" || m.subjectId === subjectFilter;
    const matchesType = typeFilter === "ALL" || m.type === typeFilter;

    return matchesSearch && matchesSubject && matchesType;
  });

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "YOUTUBE":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <Video className="w-3 h-3 text-rose-500" />
            YouTube
          </span>
        );
      case "GOOGLE_DRIVE":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <FolderOpen className="w-3 h-3 text-emerald-600" />
            Drive / Docs
          </span>
        );
      case "DOCUMENT":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <FileText className="w-3 h-3 text-amber-600" />
            Dokumen / PDF
          </span>
        );
      case "ARTICLE":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Globe className="w-3 h-3 text-blue-600" />
            Artikel Web
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <LinkIcon className="w-3 h-3 text-slate-500" />
            Link Tautan
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-blue-600" />
            Kelola Materi Pembelajaran
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Sematkan tautan materi eksternal (Google Drive, YouTube, Modul Web) untuk belajar siswa tanpa membebani penyimpanan VPS.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => {
            setEditingItem(null);
            setIsModalOpen(true);
          }}
          className="gap-2 shrink-0 font-bold shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Link Materi</span>
        </Button>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center gap-2 border animate-in fade-in ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span className="font-medium">{feedback.message}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari judul materi, topik, atau tautan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs"
          />
        </div>

        {/* Filter Mapel */}
        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-blue-600 shadow-2xs"
        >
          <option value="ALL">Semua Mata Pelajaran</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {/* Filter Tipe Media */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-blue-600 shadow-2xs"
        >
          <option value="ALL">Semua Jenis Media</option>
          <option value="YOUTUBE">YouTube Video</option>
          <option value="GOOGLE_DRIVE">Google Drive / Docs</option>
          <option value="DOCUMENT">Dokumen / PDF</option>
          <option value="ARTICLE">Artikel Web</option>
          <option value="LINK">Tautan Umum</option>
        </select>
      </div>

      {/* List / Cards Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-white border border-slate-200 animate-pulse space-y-3 shadow-2xs"
            >
              <div className="h-5 bg-slate-200 rounded w-1/3" />
              <div className="h-6 bg-slate-200 rounded w-3/4" />
              <div className="h-12 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : filteredMaterials.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="w-10 h-10 text-slate-400" />}
          title="Belum Ada Link Materi"
          description={
            materials.length === 0
              ? "Tambahkan link materi pembelajaran pertama Anda agar siswa dapat mempelajarinya."
              : "Tidak ada materi yang cocok dengan kata kunci atau filter yang Anda pilih."
          }
          action={
            materials.length === 0 ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setEditingItem(null);
                  setIsModalOpen(true);
                }}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Link Materi Sekarang</span>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
          {filteredMaterials.map((m) => (
            <Card
              key={m.id}
              className="flex flex-col justify-between hover:border-blue-400 hover:shadow-md transition-all group bg-white border-slate-200/90"
            >
              <div className="p-5 space-y-3">
                {/* Header Badge */}
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="info" className="text-[10px]">
                    {m.subject.name}
                  </Badge>
                  {getTypeBadge(m.type)}
                </div>

                {/* Judul & Topik */}
                <div>
                  <h3 className="font-bold text-base text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                    {m.title}
                  </h3>
                  {m.topic && (
                    <span className="inline-block mt-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                      Topik: {m.topic.name}
                    </span>
                  )}
                </div>

                {/* Deskripsi */}
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {m.description || "Tautan materi pendukung untuk dipelajari mandiri oleh siswa."}
                </p>

                {/* Info Penulis & Tanggal */}
                <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="truncate">Oleh: {m.author.name}</span>
                  <span className="shrink-0">
                    {new Date(m.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                <a
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Link</span>
                </a>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingItem(m);
                      setIsModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-white border border-transparent hover:border-slate-200 transition-colors"
                    title="Edit materi"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(m)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-white border border-transparent hover:border-slate-200 transition-colors"
                    title="Hapus materi"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Tambah / Edit */}
      <MaterialFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        onSuccess={() => {
          fetchMaterials();
          setFeedback({
            type: "success",
            message: editingItem
              ? "Perubahan materi berhasil disimpan!"
              : "Link materi baru berhasil ditambahkan!",
          });
          setTimeout(() => setFeedback(null), 4000);
        }}
        editItem={editingItem}
        subjects={subjects}
      />
    </div>
  );
}
