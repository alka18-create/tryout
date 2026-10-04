"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  BookOpen,
  Clock,
  HelpCircle,
  MoreVertical,
  Edit,
  Trash2,
  ListOrdered,
  Eye,
  CheckCircle,
  Archive,
  AlertCircle,
  FileQuestion,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

interface TryoutItem {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  passingScore: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  discussionVisibility: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  subject: {
    id: string;
    name: string;
    code: string;
  };
  author: {
    name: string;
    email: string;
  };
  _count: {
    tryoutQuestions: number;
    examSessions: number;
  };
}

export default function TeacherTryoutsPage() {
  const [tryouts, setTryouts] = useState<TryoutItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [previewTryout, setPreviewTryout] = useState<TryoutItem | null>(null);

  const fetchTryouts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (search) params.append("search", search);

      const res = await fetch(`/api/teacher/tryouts?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setTryouts(json.data);
      }
    } catch {
      setFeedback({ type: "error", text: "Gagal memuat daftar tryout." });
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTryouts();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchTryouts]);

  const handleStatusChange = async (id: string, newStatus: "DRAFT" | "PUBLISHED" | "ARCHIVED") => {
    setFeedback(null);
    try {
      const res = await fetch(`/api/teacher/tryouts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setFeedback({
          type: "error",
          text: json.error?.message || "Gagal memperbarui status tryout.",
        });
        return;
      }

      setFeedback({
        type: "success",
        text: `Status tryout berhasil diubah menjadi ${newStatus}.`,
      });
      fetchTryouts();
    } catch {
      setFeedback({ type: "error", text: "Terjadi kesalahan saat mengubah status." });
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus atau mengarsipkan tryout "${title}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/teacher/tryouts/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setFeedback({
          type: "error",
          text: json.error?.message || "Gagal menghapus tryout.",
        });
        return;
      }

      setFeedback({
        type: "success",
        text: json.message || "Tryout berhasil dihapus/diarsipkan.",
      });
      fetchTryouts();
    } catch {
      setFeedback({ type: "error", text: "Terjadi kesalahan jaringan saat menghapus tryout." });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-400" />
            Manajemen Paket Tryout
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Kelola paket ujian, atur susunan soal, dan publikasikan tryout ke peserta didik.
          </p>
        </div>
        <Link href="/dashboard/teacher/tryouts/new">
          <Button variant="primary" className="gap-2 shrink-0">
            <Plus className="w-4 h-4" />
            <span>Buat Tryout Baru</span>
          </Button>
        </Link>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-3 border ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari judul tryout..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {["ALL", "PUBLISHED", "DRAFT", "ARCHIVED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              {st === "ALL" ? "Semua Status" : st}
            </button>
          ))}
        </div>
      </div>

      {/* Tryouts List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse space-y-3"
            >
              <div className="h-5 bg-slate-800 rounded w-3/4" />
              <div className="h-4 bg-slate-800 rounded w-1/2" />
              <div className="h-10 bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      ) : tryouts.length === 0 ? (
        <EmptyState
          icon={<FileQuestion className="w-10 h-10 text-slate-500" />}
          title="Belum Ada Paket Tryout"
          description="Anda belum membuat paket tryout atau tidak ada tryout yang cocok dengan filter pencarian saat ini."
          action={
            <Link href="/dashboard/teacher/tryouts/new">
              <Button variant="primary">Buat Tryout Baru</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tryouts.map((tryout) => {
            const hasSessions = tryout._count.examSessions > 0;
            return (
              <Card
                key={tryout.id}
                className="flex flex-col justify-between hover:border-slate-700 transition-colors"
              >
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <Badge variant="info">{tryout.subject.name}</Badge>
                    <Badge
                      variant={
                        tryout.status === "PUBLISHED"
                          ? "success"
                          : tryout.status === "DRAFT"
                          ? "warning"
                          : "default"
                      }
                    >
                      {tryout.status}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="font-bold text-lg text-white group-hover:text-indigo-400 transition-colors line-clamp-2">
                      {tryout.title}
                    </h3>
                    {tryout.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {tryout.description}
                      </p>
                    )}
                  </div>

                  {/* Meta Specs */}
                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-800/80 text-center">
                    <div>
                      <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        Durasi
                      </div>
                      <div className="text-xs font-bold text-slate-200 mt-0.5">
                        {tryout.durationMinutes} mnt
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                        <HelpCircle className="w-3 h-3 text-slate-500" />
                        Soal
                      </div>
                      <div className="text-xs font-bold text-slate-200 mt-0.5">
                        {tryout._count.tryoutQuestions} butir
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                        Peserta
                      </div>
                      <div className="text-xs font-bold text-indigo-300 mt-0.5">
                        {tryout._count.examSessions} sesi
                      </div>
                    </div>
                  </div>

                  {hasSessions && (
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Sudah ada peserta yang mengerjakan (Soal terkunci).</span>
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="p-4 bg-slate-950/40 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* Kelola Soal */}
                    <Link href={`/dashboard/teacher/tryouts/${tryout.id}/questions`}>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-xs gap-1.5 hover:border-indigo-500/50"
                        title="Susun Soal Tryout"
                      >
                        <ListOrdered className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Kelola Soal</span>
                      </Button>
                    </Link>

                    {/* Preview Modal Trigger */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewTryout(tryout)}
                      className="text-xs text-slate-400 hover:text-white"
                      title="Preview Tryout"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Toggle Status Buttons */}
                    {tryout.status === "DRAFT" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStatusChange(tryout.id, "PUBLISHED")}
                        className="text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                        title="Publikasikan Tryout"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline ml-1">Publish</span>
                      </Button>
                    ) : tryout.status === "PUBLISHED" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStatusChange(tryout.id, "DRAFT")}
                        className="text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                        title="Tarik kembali ke Draft"
                      >
                        Unpublish
                      </Button>
                    ) : null}

                    {/* Edit Metadata */}
                    <Link href={`/dashboard/teacher/tryouts/${tryout.id}/edit`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-slate-400 hover:text-white p-2"
                        title="Edit Info Tryout"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                    </Link>

                    {/* Delete / Archive */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(tryout.id, tryout.title)}
                      className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 p-2"
                      title={hasSessions ? "Arsipkan Tryout" : "Hapus Tryout"}
                    >
                      {hasSessions ? (
                        <Archive className="w-3.5 h-3.5" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Preview Tryout */}
      {previewTryout && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div>
                <Badge variant="info" className="mb-2">
                  {previewTryout.subject.name}
                </Badge>
                <h3 className="text-xl font-bold text-white">{previewTryout.title}</h3>
              </div>
              <Badge
                variant={
                  previewTryout.status === "PUBLISHED"
                    ? "success"
                    : previewTryout.status === "DRAFT"
                    ? "warning"
                    : "default"
                }
              >
                {previewTryout.status}
              </Badge>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              {previewTryout.description || "Tidak ada deskripsi/petunjuk pengerjaan khusus."}
            </p>

            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-sm">
              <div>
                <span className="text-slate-400 text-xs">Durasi Ujian:</span>
                <p className="font-semibold text-white">{previewTryout.durationMinutes} Menit</p>
              </div>
              <div>
                <span className="text-slate-400 text-xs">Standar KKM:</span>
                <p className="font-semibold text-emerald-400">{previewTryout.passingScore} / 100</p>
              </div>
              <div>
                <span className="text-slate-400 text-xs">Jumlah Butir Soal:</span>
                <p className="font-semibold text-white">
                  {previewTryout._count.tryoutQuestions} Butir Soal
                </p>
              </div>
              <div>
                <span className="text-slate-400 text-xs">Pembahasan:</span>
                <p className="font-semibold text-indigo-300">
                  {previewTryout.discussionVisibility === "AFTER_SUBMIT"
                    ? "Setelah Submit"
                    : previewTryout.discussionVisibility}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Link href={`/dashboard/teacher/tryouts/${previewTryout.id}/questions`}>
                <Button variant="secondary" size="sm" className="gap-2">
                  <ListOrdered className="w-4 h-4" />
                  <span>Lihat Detail Soal</span>
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={() => setPreviewTryout(null)}>
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
