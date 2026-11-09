"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Plus,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  KeyRound,
  Trash2,
  Copy,
  RefreshCw,
  Shield,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/ui/custom-select";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
  schoolName: string;
  schoolClass: string;
  sessionCount: number;
  tryoutCreatedCount: number;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal Buat Akun
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "TryoutKu@2026",
    role: "TEACHER" as "TEACHER" | "ADMIN" | "STUDENT",
  });

  // Modal Reset Password
  const [resetTarget, setResetTarget] = useState<UserItem | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [resetMode, setResetMode] = useState<"auto" | "manual">("auto");
  const [resetResult, setResetResult] = useState<{ newPassword?: string } | null>(null);

  // Modal Hapus Pengguna
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (roleFilter !== "ALL") params.append("role", roleFilter);
      if (search) params.append("search", search);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setUsers(json.data.users);
      }
    } catch {
      setFeedback({ type: "error", text: "Gagal memuat daftar pengguna." });
    } finally {
      setIsLoading(false);
    }
  }, [roleFilter, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  // Ubah Role Pengguna
  const handleRoleChange = async (userId: string, newRole: "STUDENT" | "TEACHER" | "ADMIN") => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback({ type: "success", text: "Role pengguna berhasil diperbarui." });
        fetchUsers();
      } else {
        setFeedback({ type: "error", text: json.error?.message || "Gagal mengubah role." });
      }
    } catch {
      setFeedback({ type: "error", text: "Terjadi kesalahan jaringan." });
    }
  };

  // Submit Buat Akun
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setFeedback({ type: "error", text: json.error?.message || "Gagal membuat akun pengguna." });
        setIsCreating(false);
        return;
      }

      setFeedback({
        type: "success",
        text: `Akun ${createForm.role} "${createForm.name}" berhasil dibuat dengan kata sandi default!`,
      });
      setIsCreateModalOpen(false);
      setCreateForm({ name: "", email: "", password: "TryoutKu@2026", role: "TEACHER" });
      setIsCreating(false);
      fetchUsers();
    } catch {
      setFeedback({ type: "error", text: "Terjadi kesalahan saat membuat akun." });
      setIsCreating(false);
    }
  };

  // Buka modal reset password
  const openResetModal = (user: UserItem) => {
    setResetTarget(user);
    setResetMode("auto");
    setResetPassword("");
    setResetResult(null);
    setCopied(false);
  };

  // Submit Reset Password
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;

    setIsResetting(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/users/${resetTarget.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: resetMode === "manual" ? resetPassword.trim() : undefined,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setFeedback({ type: "error", text: json.error?.message || "Gagal mereset password." });
        setIsResetting(false);
        return;
      }

      if (json.data?.newPassword) {
        // Password sementara dibuat server — tampilkan satu kali
        setResetResult({ newPassword: json.data.newPassword });
        setFeedback({
          type: "success",
          text: `Password "${resetTarget.name}" berhasil direset. Salin password sementara lalu teruskan ke pengguna.`,
        });
      } else {
        setFeedback({ type: "success", text: `Password "${resetTarget.name}" berhasil direset.` });
        setResetTarget(null);
        setResetResult(null);
      }
      setIsResetting(false);
    } catch {
      setFeedback({ type: "error", text: "Terjadi kesalahan jaringan saat mereset password." });
      setIsResetting(false);
    }
  };

  const copyResetPassword = async () => {
    if (!resetResult?.newPassword) return;
    try {
      await navigator.clipboard.writeText(resetResult.newPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setFeedback({ type: "error", text: "Gagal menyalin password. Salin secara manual." });
    }
  };

  const closeResetModal = () => {
    setResetTarget(null);
    setResetResult(null);
    fetchUsers();
  };

  // Submit Hapus Pengguna
  const handleDeleteUser = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setFeedback({ type: "error", text: json.error?.message || "Gagal menghapus pengguna." });
        setIsDeleting(false);
        return;
      }

      setFeedback({ type: "success", text: `Pengguna "${deleteTarget.name}" berhasil dihapus.` });
      setDeleteTarget(null);
      setIsDeleting(false);
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
    } catch {
      setFeedback({ type: "error", text: "Terjadi kesalahan jaringan saat menghapus pengguna." });
      setIsDeleting(false);
    }
  };

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
            <Users className="w-6 h-6 text-blue-600" />
            Manajemen Pengguna
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Kelola hak akses pengguna, penugasan role guru/admin, dan pengawasan akun.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsCreateModalOpen(true)}
          className="gap-2 shrink-0 text-xs font-bold"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Akun Baru</span>
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

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama atau email pengguna..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 shadow-xs transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {["ALL", "STUDENT", "TEACHER", "ADMIN"].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                roleFilter === r
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 shadow-xs"
              }`}
            >
              {r === "ALL" ? "Semua Role" : r}
            </button>
          ))}
        </div>
      </div>

      {/* Tabel Pengguna */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Nama Lengkap</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4 text-center">Role Akses</th>
                  <th className="py-3 px-4">Sekolah / Instansi</th>
                  <th className="py-3 px-4 text-center">Aktivitas</th>
                  <th className="py-3 px-4 text-center">Ubah Hak Role</th>
                  <th className="py-3 px-4 text-right">Terdaftar</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                      Memuat data pengguna...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                      Tidak ada pengguna yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{u.name}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">{u.email}</td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge
                          variant={
                            u.role === "ADMIN"
                              ? "danger"
                              : u.role === "TEACHER"
                              ? "warning"
                              : "info"
                          }
                          className="text-[10px]"
                        >
                          {u.role}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {u.schoolName}
                        {u.schoolClass !== "-" && (
                          <span className="text-[11px] text-slate-400 block">
                            Kelas: {u.schoolClass}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-600 text-[11px]">
                        {u.role === "STUDENT"
                          ? `${u.sessionCount} Ujian`
                          : `${u.tryoutCreatedCount} Tryout`}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as any)}
                          className="px-2 py-1 rounded bg-white border border-slate-200 text-[11px] text-slate-800 outline-none focus:border-blue-600 shadow-xs"
                        >
                          <option value="STUDENT">STUDENT</option>
                          <option value="TEACHER">TEACHER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-500 text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {u.role !== "ADMIN" ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="px-2 py-1"
                              title="Reset password"
                              onClick={() => openResetModal(u)}
                            >
                              <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                              <span className="hidden md:inline">Reset</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="px-2 py-1 hover:border-rose-300 hover:bg-rose-50"
                              title="Hapus pengguna"
                              onClick={() => setDeleteTarget(u)}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              <span className="hidden md:inline">Hapus</span>
                            </Button>
                          </div>
                        ) : (
                          <span className="text-slate-300">
                            <Shield className="w-4 h-4 inline-block" />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal: Buat Akun Baru */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-600" />
                Tambah Akun Pengguna Baru
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <Input
                label="Nama Lengkap"
                required
                placeholder="Contoh: Budi Santoso, M.Pd"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              />

              <Input
                label="Alamat Email"
                type="email"
                required
                placeholder="email@sekolah.sch.id"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              />

              <Input
                label="Kata Sandi Default"
                type="text"
                required
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                helperText="Dapat diubah oleh pengguna setelah login"
              />

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Role Akses
                </label>
                <CustomSelect
                  value={createForm.role}
                  onChange={(val) => setCreateForm({ ...createForm, role: val as any })}
                  placeholder="Pilih Role"
                  options={[
                    { value: "TEACHER", label: "Guru (TEACHER) — Kelola Bank Soal & Tryout" },
                    { value: "ADMIN", label: "Administrator (ADMIN) — Hak Akses Penuh Sistem" },
                    { value: "STUDENT", label: "Peserta Didik (STUDENT)" },
                  ]}
                  triggerClassName="py-2.5 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isCreating}>
                  Buat Pengguna
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Password */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-blue-600" />
                Reset Password
              </h3>
              <button
                onClick={closeResetModal}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs">
              <p className="font-bold text-slate-900">{resetTarget.name}</p>
              <p className="text-slate-600 font-mono text-[11px] mt-0.5">{resetTarget.email}</p>
              <Badge
                variant={resetTarget.role === "TEACHER" ? "warning" : "info"}
                className="text-[10px] mt-1.5"
              >
                {resetTarget.role}
              </Badge>
            </div>

            {resetResult?.newPassword ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-bold text-emerald-800 mb-2">
                    Password sementara untuk pengguna ini:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white border border-emerald-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 break-all">
                      {resetResult.newPassword}
                    </code>
                    <Button
                      variant={copied ? "success" : "primary"}
                      size="sm"
                      onClick={copyResetPassword}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copied ? "Tersalin" : "Salin"}
                    </Button>
                  </div>
                </div>
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 leading-relaxed">
                  <AlertCircle className="w-3.5 h-3.5 inline-block mr-1" />
                  Password hanya ditampilkan sekali. Teruskan ke pengguna secara aman (WhatsApp/lisan).
                  Pengguna sebaiknya mengganti password setelah login.
                </p>
                <div className="flex justify-end">
                  <Button variant="primary" size="sm" onClick={closeResetModal}>
                    Selesai
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Cara Reset
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setResetMode("auto")}
                      className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-colors flex items-center justify-center gap-1.5 ${
                        resetMode === "auto"
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Buat Otomatis
                    </button>
                    <button
                      type="button"
                      onClick={() => setResetMode("manual")}
                      className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${
                        resetMode === "manual"
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      Tentukan Sendiri
                    </button>
                  </div>
                </div>

                {resetMode === "manual" && (
                  <Input
                    label="Password Baru"
                    type="text"
                    required
                    minLength={6}
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    helperText="Minimal 6 karakter"
                  />
                )}

                {resetMode === "auto" && (
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Server akan membuat password acak yang aman (12 karakter), lalu menampilkannya
                    sekali untuk Anda teruskan ke pengguna.
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={closeResetModal}
                  >
                    Batal
                  </Button>
                  <Button type="submit" variant="primary" size="sm" isLoading={isResetting}>
                    <KeyRound className="w-3.5 h-3.5" />
                    Reset Sekarang
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Hapus Pengguna */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" />
                Hapus Pengguna
              </h3>
              <button
                onClick={() => setDeleteTarget(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs leading-relaxed">
              <p className="font-bold text-slate-900">{deleteTarget.name}</p>
              <p className="text-slate-600 font-mono text-[11px] mt-0.5">{deleteTarget.email}</p>
              <p className="text-rose-800 mt-3 flex items-start gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Tindakan ini <b>permanen</b>. Seluruh sesi ujian, jawaban, dan hasil{" "}
                  {deleteTarget.role === "STUDENT"
                    ? "milik siswa ini"
                    : "yang terkait akun ini"}{" "}
                  akan ikut terhapus dan tidak dapat dikembalikan.
                </span>
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
                Batal
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={isDeleting}
                onClick={handleDeleteUser}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus Pengguna
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
