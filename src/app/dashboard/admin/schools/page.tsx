"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  Plus,
  ArrowLeft,
  Search,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Users,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SchoolItem {
  id: string;
  name: string;
  npsn: string | null;
  city: string | null;
  _count: {
    users: number;
  };
}

export default function AdminSchoolsPage() {
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    npsn: "",
    city: "",
  });

  const fetchSchools = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/schools");
      const json = await res.json();
      if (json.success && json.data) {
        setSchools(json.data);
      }
    } catch {
      setFeedback({ type: "error", text: "Gagal memuat daftar sekolah." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setForm({ name: "", npsn: "", city: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (s: SchoolItem) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      npsn: s.npsn || "",
      city: s.city || "",
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      const url = editingId ? `/api/admin/schools/${editingId}` : "/api/admin/schools";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setFeedback({ type: "error", text: json.error?.message || "Gagal menyimpan sekolah." });
        setIsSaving(false);
        return;
      }

      setFeedback({
        type: "success",
        text: editingId ? "Data sekolah berhasil diperbarui." : "Sekolah baru berhasil ditambahkan.",
      });
      setIsModalOpen(false);
      setIsSaving(false);
      fetchSchools();
    } catch {
      setFeedback({ type: "error", text: "Terjadi gangguan jaringan saat menyimpan sekolah." });
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus sekolah "${name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/schools/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setFeedback({ type: "error", text: json.error?.message || "Gagal menghapus sekolah." });
        return;
      }

      setFeedback({ type: "success", text: "Sekolah berhasil dihapus." });
      fetchSchools();
    } catch {
      setFeedback({ type: "error", text: "Terjadi kesalahan saat menghapus sekolah." });
    }
  };

  const filteredSchools = schools.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.city && s.city.toLowerCase().includes(search.toLowerCase())) ||
      (s.npsn && s.npsn.includes(search))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <Link
            href="/dashboard/admin"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Panel Admin</span>
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            Manajemen Sekolah & Instansi
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Daftar data master sekolah asal peserta didik dan instansi penyelenggara tryout.
          </p>
        </div>

        <Button onClick={openCreateModal} variant="primary" className="gap-2 shrink-0 text-xs font-bold">
          <Plus className="w-4 h-4" />
          <span>Tambah Sekolah Baru</span>
        </Button>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-3 border ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          )}
          <span className="font-medium">{feedback.text}</span>
        </div>
      )}

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Cari nama sekolah, kota, atau NPSN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 shadow-xs transition-colors"
        />
      </div>

      {/* Tabel Sekolah */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Nama Sekolah</th>
                  <th className="py-3 px-4 text-center">NPSN</th>
                  <th className="py-3 px-4">Kabupaten / Kota</th>
                  <th className="py-3 px-4 text-center">Total Pengguna</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                      Memuat data sekolah...
                    </td>
                  </tr>
                ) : filteredSchools.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                      Tidak ada sekolah yang ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredSchools.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{s.name}</td>
                      <td className="py-3.5 px-4 text-center text-slate-500 font-mono text-[11px]">
                        {s.npsn || "—"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{s.city || "—"}</td>
                      <td className="py-3.5 px-4 text-center text-slate-600">
                        <span className="font-bold text-blue-600">{s._count.users}</span> Siswa/Guru
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(s)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="Edit Sekolah"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(s.id, s.name)}
                            disabled={s._count.users > 0}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            title={s._count.users > 0 ? "Tidak bisa dihapus (memiliki siswa)" : "Hapus Sekolah"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal: Tambah / Edit Sekolah */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                {editingId ? "Edit Data Sekolah" : "Tambah Sekolah Baru"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <Input
                label="Nama Sekolah / Madrasah"
                required
                placeholder="Contoh: SMA Negeri 1 Yogyakarta"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />

              <Input
                label="NPSN (Nomor Pokok Sekolah Nasional)"
                placeholder="Contoh: 20403123 (Opsional)"
                value={form.npsn}
                onChange={(e) => setForm({ ...form, npsn: e.target.value })}
              />

              <Input
                label="Kabupaten / Kota"
                placeholder="Contoh: Kota Yogyakarta"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isSaving}>
                  {editingId ? "Simpan Perubahan" : "Tambah Sekolah"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
