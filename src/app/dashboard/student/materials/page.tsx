"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  GraduationCap,
  Search,
  ExternalLink,
  Video,
  FileText,
  FolderOpen,
  Globe,
  Link as LinkIcon,
  Filter,
  Check,
  ChevronDown,
  BookOpen,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LearningMaterialItem } from "@/components/teacher/material-form-modal";

export default function StudentMaterialsPage() {
  const [materials, setMaterials] = useState<LearningMaterialItem[]>([]);
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const fetchMaterials = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/materials");
      const json = await res.json();
      if (json.success && json.data) {
        setMaterials(json.data);

        // Ambil daftar unik mata pelajaran
        const subsMap = new Map<string, string>();
        json.data.forEach((m: LearningMaterialItem) => {
          subsMap.set(m.subject.id, m.subject.name);
        });
        const subsArray = Array.from(subsMap.entries()).map(([id, name]) => ({ id, name }));
        setSubjects(subsArray);
      }
    } catch {
      console.error("Gagal memuat materi");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const filteredMaterials = materials.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      (m.description && m.description.toLowerCase().includes(search.toLowerCase())) ||
      (m.topic?.name && m.topic.name.toLowerCase().includes(search.toLowerCase()));

    const matchesSubject = subjectFilter === "ALL" || m.subjectId === subjectFilter;
    const matchesType = typeFilter === "ALL" || m.type === typeFilter;

    return matchesSearch && matchesSubject && matchesType;
  });

  const selectedSubjectObj = subjects.find((s) => s.id === subjectFilter);
  const selectedSubjectLabel =
    subjectFilter === "ALL"
      ? "Semua Mata Pelajaran"
      : selectedSubjectObj?.name || "Pilih Mata Pelajaran";

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "YOUTUBE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <Video className="w-3.5 h-3.5 text-rose-500" />
            Video Pembahasan
          </span>
        );
      case "GOOGLE_DRIVE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <FolderOpen className="w-3.5 h-3.5 text-emerald-600" />
            Google Drive / Docs
          </span>
        );
      case "DOCUMENT":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <FileText className="w-3.5 h-3.5 text-amber-600" />
            Dokumen / PDF
          </span>
        );
      case "ARTICLE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            Artikel Bacaan
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <LinkIcon className="w-3.5 h-3.5 text-slate-500" />
            Tautan Web
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-blue-600" />
            Materi Pembelajaran
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kumpulan link bahan ajar, modul Google Drive, video YouTube, dan rangkuman topik dari guru untuk persiapan tryout.
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari materi atau topik pelajaran..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors shadow-2xs"
          />
        </div>

        {/* Filter Mapel Dropdown */}
        {subjects.length > 0 && (
          <div className="relative shrink-0" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="w-full sm:w-auto min-w-[210px] px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-sm text-slate-800 flex items-center justify-between gap-3 transition-colors cursor-pointer select-none focus:outline-none focus:border-blue-600 shadow-2xs"
            >
              <div className="flex items-center gap-2 truncate">
                <Filter className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="truncate font-medium">{selectedSubjectLabel}</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                  isDropdownOpen ? "rotate-180 text-blue-600" : ""
                }`}
              />
            </button>

            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 sm:right-auto sm:min-w-[240px] mt-1.5 z-30 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                  Pilih Mata Pelajaran
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSubjectFilter("ALL");
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    subjectFilter === "ALL"
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="truncate">Semua Mata Pelajaran</span>
                  {subjectFilter === "ALL" && <Check className="w-4 h-4 text-blue-600 shrink-0 ml-2" />}
                </button>

                {subjects.map((sub) => {
                  const isSelected = subjectFilter === sub.id;
                  const count = materials.filter((m) => m.subject.id === sub.id).length;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        setSubjectFilter(sub.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-blue-50 text-blue-700 font-semibold"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span className="truncate">{sub.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                          {count}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Filter Jenis Media */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-blue-600 shadow-2xs"
        >
          <option value="ALL">Semua Jenis Media</option>
          <option value="YOUTUBE">Video Pembahasan (YouTube)</option>
          <option value="GOOGLE_DRIVE">Google Drive / Docs</option>
          <option value="DOCUMENT">Dokumen / Modul PDF</option>
          <option value="ARTICLE">Artikel Web</option>
        </select>
      </div>

      {/* Materials Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-white border border-slate-200 animate-pulse space-y-4 shadow-2xs"
            >
              <div className="h-5 bg-slate-200 rounded w-1/3" />
              <div className="h-6 bg-slate-200 rounded w-3/4" />
              <div className="h-14 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : filteredMaterials.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-10 h-10 text-slate-400" />}
          title="Tidak Ada Materi Pembelajaran"
          description={
            materials.length === 0
              ? "Guru belum mengunggah link materi pembelajaran saat ini."
              : "Tidak ada materi yang sesuai dengan pencarian atau filter yang Anda pilih."
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMaterials.map((m) => (
            <Card
              key={m.id}
              className="flex flex-col justify-between hover:border-blue-400 hover:shadow-md transition-all group bg-white border-slate-200/90"
            >
              <div className="p-5 space-y-3.5">
                {/* Header Badge */}
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="info">{m.subject.name}</Badge>
                  {getTypeBadge(m.type)}
                </div>

                {/* Judul & Topik */}
                <div>
                  <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                    {m.title}
                  </h3>
                  {m.topic && (
                    <span className="inline-block mt-1 text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">
                      Topik: {m.topic.name}
                    </span>
                  )}
                </div>

                {/* Deskripsi */}
                <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                  {m.description || "Pelajari materi ini untuk memperkuat pemahaman konsep materi Anda."}
                </p>

                {/* Info Penulis & Tanggal */}
                <div className="text-[11px] text-slate-400 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span>Oleh: {m.author.name}</span>
                  <span>
                    {new Date(m.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {/* Action Button: Buka Materi */}
              <div className="p-4 bg-slate-50/70 border-t border-slate-100">
                <a
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full"
                >
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full gap-2 font-bold shadow-xs text-xs"
                  >
                    <span>Buka Materi Pembelajaran</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
