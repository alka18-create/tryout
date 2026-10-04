"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  Lock,
  Layers,
  HelpCircle,
  Search,
  Filter,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface QuestionOption {
  id: string;
  label: string;
  content: string;
  isCorrect: boolean;
  imageUrl?: string | null;
}

interface Question {
  id: string;
  content: string;
  imageUrl?: string | null;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  topicId: string;
  topic: {
    id: string;
    name: string;
  };
  explanation?: string | null;
  options: QuestionOption[];
}

interface AttachedQuestion {
  questionId: string;
  orderNumber: number;
  weight: number;
  question: Question;
}

interface TryoutDetail {
  id: string;
  title: string;
  durationMinutes: number;
  passingScore: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  subjectId: string;
  subject: {
    id: string;
    name: string;
  };
  isLocked: boolean;
  tryoutQuestions: AttachedQuestion[];
}

export function TryoutQuestionManager({ initialTryout }: { initialTryout: TryoutDetail }) {
  const [tryout, setTryout] = useState<TryoutDetail>(initialTryout);
  const [questions, setQuestions] = useState<AttachedQuestion[]>(
    initialTryout.tryoutQuestions.sort((a, b) => a.orderNumber - b.orderNumber)
  );

  // Bank Soal picker state
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [isFetchingBank, setIsFetchingBank] = useState(false);
  const [bankSearch, setBankSearch] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<string>("ALL");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("ALL");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());

  // Preview modal state
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [isFullPreviewOpen, setIsFullPreviewOpen] = useState(false);
  const [previewActiveIndex, setPreviewActiveIndex] = useState(0);

  // Feedback & Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Ambil bank soal ketika modal dibuka
  const openBankModal = async () => {
    setIsBankModalOpen(true);
    setIsFetchingBank(true);
    try {
      const res = await fetch(`/api/teacher/questions?subjectId=${tryout.subjectId}&limit=100`);
      const json = await res.json();
      if (json.success && json.data) {
        // Filter out questions that are already in this tryout
        const existingIds = new Set(questions.map((q) => q.questionId));
        const filtered = (json.data as Question[]).filter((q) => !existingIds.has(q.id));
        setAvailableQuestions(filtered);
      }
    } catch {
      setFeedback({ type: "error", text: "Gagal mengambil bank soal." });
    } finally {
      setIsFetchingBank(false);
    }
  };

  // Move Question Up
  const moveUp = (index: number) => {
    if (index === 0 || tryout.isLocked) return;
    const newItems = [...questions];
    const temp = newItems[index];
    newItems[index] = newItems[index - 1];
    newItems[index - 1] = temp;
    // Recalculate orderNumber
    const reordered = newItems.map((item, idx) => ({
      ...item,
      orderNumber: idx + 1,
    }));
    setQuestions(reordered);
  };

  // Move Question Down
  const moveDown = (index: number) => {
    if (index === questions.length - 1 || tryout.isLocked) return;
    const newItems = [...questions];
    const temp = newItems[index];
    newItems[index] = newItems[index + 1];
    newItems[index + 1] = temp;
    // Recalculate orderNumber
    const reordered = newItems.map((item, idx) => ({
      ...item,
      orderNumber: idx + 1,
    }));
    setQuestions(reordered);
  };

  // Remove Question
  const removeQuestion = (questionId: string) => {
    if (tryout.isLocked) return;
    const newItems = questions
      .filter((q) => q.questionId !== questionId)
      .map((item, idx) => ({
        ...item,
        orderNumber: idx + 1,
      }));
    setQuestions(newItems);
  };

  // Change Weight
  const updateWeight = (questionId: string, weight: number) => {
    if (tryout.isLocked) return;
    setQuestions((prev) =>
      prev.map((item) =>
        item.questionId === questionId ? { ...item, weight: Math.max(0.1, weight) } : item
      )
    );
  };

  // Add Selected from Bank Soal
  const handleAddSelectedQuestions = () => {
    const toAdd = availableQuestions.filter((q) => selectedQuestionIds.has(q.id));
    const nextOrder = questions.length + 1;

    const newAttached: AttachedQuestion[] = toAdd.map((q, idx) => ({
      questionId: q.id,
      orderNumber: nextOrder + idx,
      weight: 1.0,
      question: q,
    }));

    setQuestions([...questions, ...newAttached]);
    setSelectedQuestionIds(new Set());
    setIsBankModalOpen(false);
  };

  // Save Questions via API
  const handleSave = async () => {
    if (tryout.isLocked) return;
    setIsSaving(true);
    setFeedback(null);

    try {
      const payload = {
        questions: questions.map((q) => ({
          questionId: q.questionId,
          orderNumber: q.orderNumber,
          weight: q.weight,
        })),
      };

      const res = await fetch(`/api/teacher/tryouts/${tryout.id}/questions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setFeedback({
          type: "error",
          text: json.error?.message || "Gagal menyimpan susunan soal.",
        });
        setIsSaving(false);
        return;
      }

      setFeedback({
        type: "success",
        text: `Susunan soal berhasil disimpan! Total: ${questions.length} butir soal.`,
      });
      setIsSaving(false);
    } catch {
      setFeedback({ type: "error", text: "Terjadi kesalahan saat menyimpan susunan soal." });
      setIsSaving(false);
    }
  };

  const totalWeight = questions.reduce((acc, cur) => acc + cur.weight, 0);

  // Unique topics from available bank questions
  const availableTopics = Array.from(
    new Set(availableQuestions.map((q) => q.topic?.name).filter(Boolean))
  );

  const filteredBankQuestions = availableQuestions.filter((q) => {
    const matchesSearch = q.content.toLowerCase().includes(bankSearch.toLowerCase());
    const matchesTopic = selectedTopic === "ALL" || q.topic?.name === selectedTopic;
    const matchesDiff = selectedDifficulty === "ALL" || q.difficulty === selectedDifficulty;
    return matchesSearch && matchesTopic && matchesDiff;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <Link
            href="/dashboard/teacher/tryouts"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Paket Tryout</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">{tryout.title}</h1>
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
          <p className="text-sm text-slate-400">
            Atur urutan nomor soal, bobot nilai, atau tambahkan butir soal baru dari bank soal.
          </p>
        </div>

        {/* Action Header Buttons */}
        <div className="flex items-center gap-2">
          {questions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPreviewActiveIndex(0);
                setIsFullPreviewOpen(true);
              }}
              className="gap-1.5 text-xs"
            >
              <Eye className="w-3.5 h-3.5 text-indigo-400" />
              <span>Preview Simulasi Siswa</span>
            </Button>
          )}

          {!tryout.isLocked && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              isLoading={isSaving}
              className="gap-1.5 text-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Susunan ({questions.length})</span>
            </Button>
          )}
        </div>
      </div>

      {/* Locked Notice Banner */}
      {tryout.isLocked && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm flex items-start gap-3">
          <Lock className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <h4 className="font-bold">Susunan Soal Dikunci</h4>
            <p className="text-xs text-amber-300/80 mt-0.5">
              Paket tryout ini sudah memiliki sesi ujian peserta. Urutan dan pilihan soal dikunci secara
              permanen untuk mencegah ketidaksesuaian data nilai historis peserta.
            </p>
          </div>
        </div>
      )}

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
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <span className="text-xs text-slate-400 font-medium">Total Soal</span>
          <div className="text-2xl font-extrabold text-white mt-1">{questions.length} Butir</div>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-slate-400 font-medium">Total Bobot Nilai</span>
          <div className="text-2xl font-extrabold text-indigo-400 mt-1">{totalWeight} Poin</div>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-slate-400 font-medium">Durasi Ujian</span>
          <div className="text-2xl font-extrabold text-emerald-400 mt-1">
            {tryout.durationMinutes} Menit
          </div>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-slate-400 font-medium">Standar KKM</span>
          <div className="text-2xl font-extrabold text-amber-400 mt-1">
            {tryout.passingScore} / 100
          </div>
        </Card>
      </div>

      {/* Main List of Attached Questions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-lg">Urutan Soal Tryout</CardTitle>
            <CardDescription>
              Gunakan tombol panah untuk mengubah nomor urut pengerjaan soal peserta
            </CardDescription>
          </div>
          {!tryout.isLocked && (
            <Button
              variant="secondary"
              size="sm"
              onClick={openBankModal}
              className="gap-1.5 text-xs hover:border-indigo-500"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              <span>Ambil dari Bank Soal</span>
            </Button>
          )}
        </CardHeader>

        <CardContent>
          {questions.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-slate-400">
                <HelpCircle className="w-6 h-6" />
              </div>
              <p className="text-slate-300 font-medium text-sm">
                Belum ada butir soal yang dipasang pada paket ini.
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Silakan klik tombol &quot;Ambil dari Bank Soal&quot; untuk memilih soal yang telah Anda buat di
                mata pelajaran {tryout.subject.name}.
              </p>
              {!tryout.isLocked && (
                <Button variant="primary" size="sm" onClick={openBankModal} className="mt-2 gap-2">
                  <Plus className="w-4 h-4" />
                  <span>Buka Bank Soal</span>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((item, index) => {
                const correctOpt = item.question.options?.find((o) => o.isCorrect);
                return (
                  <div
                    key={item.questionId}
                    className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition-colors"
                  >
                    {/* Number & Content Snippet */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-extrabold text-sm flex items-center justify-center shrink-0">
                        {item.orderNumber}
                      </div>
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="default" className="text-[10px]">
                            {item.question.topic?.name || "Topik Umum"}
                          </Badge>
                          <Badge
                            variant={
                              item.question.difficulty === "HARD"
                                ? "danger"
                                : item.question.difficulty === "MEDIUM"
                                ? "warning"
                                : "success"
                            }
                            className="text-[10px]"
                          >
                            {item.question.difficulty}
                          </Badge>
                          {correctOpt && (
                            <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              Kunci: {correctOpt.label}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-200 line-clamp-2 leading-relaxed">
                          {item.question.content}
                        </p>
                      </div>
                    </div>

                    {/* Weight Input & Actions */}
                    <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/60">
                      {/* Bobot */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-400">Bobot:</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0.1"
                          disabled={tryout.isLocked}
                          value={item.weight}
                          onChange={(e) => updateWeight(item.questionId, parseFloat(e.target.value) || 1)}
                          className="w-16 px-2 py-1 text-center text-xs font-bold rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                        />
                      </div>

                      {/* Preview Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviewQuestion(item.question)}
                        className="text-xs text-slate-400 hover:text-white p-2"
                        title="Lihat Detail Soal"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>

                      {/* Reorder Buttons */}
                      {!tryout.isLocked && (
                        <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
                          <button
                            type="button"
                            onClick={() => moveUp(index)}
                            disabled={index === 0}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
                            title="Pindah ke Atas"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveDown(index)}
                            disabled={index === questions.length - 1}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
                            title="Pindah ke Bawah"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeQuestion(item.questionId)}
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 ml-1"
                            title="Lepaskan dari Tryout"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: Bank Soal Picker */}
      {isBankModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-400" />
                  Pilih Soal dari Bank Soal
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Menampilkan soal aktif untuk mata pelajaran {tryout.subject.name}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBankModalOpen(false)}
                className="text-xs"
              >
                Tutup
              </Button>
            </div>

            {/* Filter Controls */}
            <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari kata kunci soal..."
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 outline-none"
              >
                <option value="ALL">Semua Topik</option>
                {availableTopics.map((top) => (
                  <option key={top} value={top}>
                    {top}
                  </option>
                ))}
              </select>

              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 outline-none"
              >
                <option value="ALL">Semua Kesulitan</option>
                <option value="EASY">Mudah (EASY)</option>
                <option value="MEDIUM">Sedang (MEDIUM)</option>
                <option value="HARD">Sulit (HARD)</option>
              </select>
            </div>

            {/* Modal Body: Available Questions List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {isFetchingBank ? (
                <div className="py-12 text-center text-slate-400 text-xs animate-pulse">
                  Memuat data bank soal...
                </div>
              ) : filteredBankQuestions.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Tidak ada soal yang tersedia atau semua soal telah dimasukkan ke tryout ini.
                </div>
              ) : (
                filteredBankQuestions.map((q) => {
                  const isChecked = selectedQuestionIds.has(q.id);
                  const correctOpt = q.options?.find((o) => o.isCorrect);

                  return (
                    <div
                      key={q.id}
                      onClick={() => {
                        const newSet = new Set(selectedQuestionIds);
                        if (newSet.has(q.id)) {
                          newSet.delete(q.id);
                        } else {
                          newSet.add(q.id);
                        }
                        setSelectedQuestionIds(newSet);
                      }}
                      className={`p-3 rounded-xl border cursor-pointer transition-colors flex items-start gap-3 ${
                        isChecked
                          ? "bg-indigo-950/30 border-indigo-500/60"
                          : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by div onClick
                        className="mt-1 accent-indigo-600 rounded"
                      />
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="default" className="text-[10px]">
                            {q.topic?.name || "Topik Umum"}
                          </Badge>
                          <Badge
                            variant={
                              q.difficulty === "HARD"
                                ? "danger"
                                : q.difficulty === "MEDIUM"
                                ? "warning"
                                : "success"
                            }
                            className="text-[10px]"
                          >
                            {q.difficulty}
                          </Badge>
                          {correctOpt && (
                            <span className="text-[10px] text-emerald-400">
                              Kunci: {correctOpt.label}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-200 line-clamp-2">{q.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-between">
              <div className="text-xs text-slate-400">
                Terpilih:{" "}
                <span className="font-bold text-white">{selectedQuestionIds.size}</span> butir soal
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBankModalOpen(false)}
                  className="text-xs"
                >
                  Batal
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={selectedQuestionIds.size === 0}
                  onClick={handleAddSelectedQuestions}
                  className="gap-1.5 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambahkan ({selectedQuestionIds.size}) Soal</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Single Question Preview */}
      {previewQuestion && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="info">{previewQuestion.topic?.name}</Badge>
                <Badge
                  variant={
                    previewQuestion.difficulty === "HARD"
                      ? "danger"
                      : previewQuestion.difficulty === "MEDIUM"
                      ? "warning"
                      : "success"
                  }
                >
                  {previewQuestion.difficulty}
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewQuestion(null)}
                className="text-xs"
              >
                Tutup
              </Button>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-slate-100 leading-relaxed font-medium">
                {previewQuestion.content}
              </p>
              {previewQuestion.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewQuestion.imageUrl}
                    alt="Lampiran Soal"
                    className="max-h-60 w-auto mx-auto object-contain"
                  />
                </div>
              )}
            </div>

            {/* Options */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Pilihan Jawaban:
              </span>
              {previewQuestion.options?.map((opt) => (
                <div
                  key={opt.id}
                  className={`p-3 rounded-xl border flex items-center gap-3 text-xs ${
                    opt.isCorrect
                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-semibold"
                      : "bg-slate-950/50 border-slate-800 text-slate-300"
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs ${
                      opt.isCorrect
                        ? "bg-emerald-500 text-slate-950"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {opt.label}
                  </span>
                  <span>{opt.content}</span>
                  {opt.isCorrect && (
                    <span className="ml-auto text-[10px] text-emerald-400 font-bold">KUNCI</span>
                  )}
                </div>
              ))}
            </div>

            {/* Explanation */}
            {previewQuestion.explanation && (
              <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                  Pembahasan Soal:
                </span>
                <p className="text-indigo-200/90 leading-relaxed">{previewQuestion.explanation}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Full Student Simulation Preview */}
      {isFullPreviewOpen && questions.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Top Bar */}
            <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="info" className="text-[10px]">
                    SIMULASI TAMPILAN PESERTA
                  </Badge>
                  <h3 className="font-bold text-white text-sm">{tryout.title}</h3>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullPreviewOpen(false)}
                className="text-xs"
              >
                Keluar Simulasi
              </Button>
            </div>

            {/* Content Split: Left Question, Right Grid */}
            <div className="flex-1 overflow-y-auto flex flex-col md:flex-row">
              {/* Question Screen */}
              <div className="flex-1 p-6 space-y-6 border-b md:border-b-0 md:border-r border-slate-800">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <span className="text-sm font-bold text-white">
                    Soal Nomor {previewActiveIndex + 1} dari {questions.length}
                  </span>
                  <Badge variant="default" className="text-xs">
                    Bobot: {questions[previewActiveIndex].weight} Poin
                  </Badge>
                </div>

                <div className="space-y-4">
                  <p className="text-base text-slate-100 leading-relaxed">
                    {questions[previewActiveIndex].question.content}
                  </p>

                  {questions[previewActiveIndex].question.imageUrl && (
                    <div className="rounded-xl overflow-hidden border border-slate-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={questions[previewActiveIndex].question.imageUrl!}
                        alt="Lampiran Soal"
                        className="max-h-64 mx-auto object-contain"
                      />
                    </div>
                  )}
                </div>

                {/* Options */}
                <div className="space-y-2.5 pt-2">
                  {questions[previewActiveIndex].question.options.map((opt) => (
                    <div
                      key={opt.id}
                      className={`p-3.5 rounded-xl border flex items-center gap-3.5 text-sm ${
                        opt.isCorrect
                          ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-200"
                          : "bg-slate-950/60 border-slate-800 text-slate-300"
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          opt.isCorrect
                            ? "bg-emerald-500 text-slate-950"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {opt.label}
                      </span>
                      <span className="leading-snug">{opt.content}</span>
                      {opt.isCorrect && (
                        <span className="ml-auto text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
                          Kunci Jawaban Guru
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Explanation */}
                {questions[previewActiveIndex].question.explanation && (
                  <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 space-y-1 mt-4">
                    <span className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                      Pembahasan & Analisis Jawaban:
                    </span>
                    <p className="text-indigo-200/90 leading-relaxed">
                      {questions[previewActiveIndex].question.explanation}
                    </p>
                  </div>
                )}
              </div>

              {/* Right Side: Number Navigator */}
              <div className="w-full md:w-64 p-5 bg-slate-950/40 space-y-4 shrink-0">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Navigasi Nomor Soal
                </span>
                <div className="grid grid-cols-5 gap-2">
                  {questions.map((q, idx) => (
                    <button
                      key={q.questionId}
                      onClick={() => setPreviewActiveIndex(idx)}
                      className={`h-9 rounded-lg font-bold text-xs transition-colors flex items-center justify-center ${
                        idx === previewActiveIndex
                          ? "bg-indigo-600 text-white ring-2 ring-indigo-400"
                          : "bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>

                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={previewActiveIndex === 0}
                    onClick={() => setPreviewActiveIndex((prev) => Math.max(0, prev - 1))}
                    className="text-xs flex-1"
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={previewActiveIndex === questions.length - 1}
                    onClick={() =>
                      setPreviewActiveIndex((prev) => Math.min(questions.length - 1, prev + 1))
                    }
                    className="text-xs flex-1"
                  >
                    Berikutnya
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
