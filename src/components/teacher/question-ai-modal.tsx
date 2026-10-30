"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  X,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  BrainCircuit,
  Settings2,
  Key,
  BookOpen,
  Folder,
  Layers,
  ChevronDown,
  ChevronUp,
  Edit2,
  Check,
  RefreshCw,
  HelpCircle,
  FileUp,
  FileQuestion,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { GeneratedQuestionItem } from "@/modules/question-bank/question-ai.schema";

interface Subject {
  id: string;
  name: string;
  code?: string | null;
}

interface Topic {
  id: string;
  name: string;
  subjectId: string;
}

interface QuestionAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialSubjectId?: string;
  initialTopicId?: string;
}

export function QuestionAiModal({
  isOpen,
  onClose,
  onSuccess,
  initialSubjectId = "",
  initialTopicId = "",
}: QuestionAiModalProps) {
  // Step state: 1 = Config/Input, 2 = Generating, 3 = Review & Select
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Metadata
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isMetaLoading, setIsMetaLoading] = useState(false);
  const [hasSystemApiKey, setHasSystemApiKey] = useState(true);

  // Form Configurations
  const [selectedSubjectId, setSelectedSubjectId] = useState(initialSubjectId);
  const [selectedTopicId, setSelectedTopicId] = useState(initialTopicId);
  const [inputMode, setInputMode] = useState<"text" | "file" | "prompt">("text");
  const [materialText, setMaterialText] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    mimeType: string;
    data: string; // Base64
  } | null>(null);

  // Assessment Settings
  const [programType, setProgramType] = useState("DAILY");
  const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD" | "MIXED">("MEDIUM");
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [optionsCount, setOptionsCount] = useState<number>(5);

  // Custom API Key
  const [useCustomKey, setUseCustomKey] = useState(false);
  const [apiKey, setApiKey] = useState("");

  // Generation Results
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestionItem[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editExplanation, setEditExplanation] = useState("");

  // Status & Error
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Metadata & System API Key Status
  useEffect(() => {
    if (!isOpen) return;

    // Reset state saat modal dibuka
    setStep(1);
    setErrorMessage("");
    setSelectedSubjectId(initialSubjectId);
    setSelectedTopicId(initialTopicId);

    // Ambil API key dari localStorage jika ada
    const savedKey = localStorage.getItem("tryoutku_gemini_key");
    if (savedKey) {
      setApiKey(savedKey);
      setUseCustomKey(true);
    }

    const loadData = async () => {
      setIsMetaLoading(true);
      try {
        const [subRes, topRes, genStatusRes] = await Promise.all([
          fetch("/api/teacher/subjects"),
          fetch("/api/teacher/topics"),
          fetch("/api/teacher/questions/generate"),
        ]);

        if (subRes.ok) {
          const subJson = await subRes.json();
          setSubjects(subJson.data || []);
        }

        if (topRes.ok) {
          const topJson = await topRes.json();
          setTopics(topJson.data || []);
        }

        if (genStatusRes.ok) {
          const genJson = await genStatusRes.json();
          setHasSystemApiKey(Boolean(genJson.data?.hasSystemApiKey));
          if (!genJson.data?.hasSystemApiKey) {
            setUseCustomKey(true);
          }
        }
      } catch (err) {
        console.error("Gagal memuat metadata AI Modal:", err);
      } finally {
        setIsMetaLoading(false);
      }
    };

    loadData();
  }, [isOpen, initialSubjectId, initialTopicId]);

  // Filter topik sesuai mata pelajaran terpilih
  const filteredTopics = topics.filter((t) => t.subjectId === selectedSubjectId);

  // Auto-select topic jika ada dan belum terpilih
  useEffect(() => {
    if (filteredTopics.length > 0 && (!selectedTopicId || !filteredTopics.some((t) => t.id === selectedTopicId))) {
      setSelectedTopicId(filteredTopics[0].id);
    }
  }, [selectedSubjectId, filteredTopics, selectedTopicId]);

  // Handle File Upload (PDF, TXT)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type) && !file.name.endsWith(".txt") && !file.name.endsWith(".pdf")) {
      setErrorMessage("Format file tidak didukung. Harap unggah dokumen PDF atau TXT.");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setErrorMessage("Ukuran file terlalu besar (maksimal 20MB).");
      return;
    }

    setErrorMessage("");

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const base64 = dataUrl.split(",")[1];
      setSelectedFile({
        name: file.name,
        mimeType: file.type || "application/pdf",
        data: base64,
      });
    };
    reader.readAsDataURL(file);
  };

  // Mulai Proses Generate Soal
  const handleGenerate = async () => {
    setErrorMessage("");

    if (!selectedSubjectId) {
      setErrorMessage("Silakan pilih Mata Pelajaran.");
      return;
    }

    if (!selectedTopicId) {
      setErrorMessage("Silakan pilih Topik Materi.");
      return;
    }

    if (useCustomKey && !apiKey.trim()) {
      setErrorMessage("Silakan masukkan Google Gemini API Key Anda.");
      return;
    }

    if (inputMode === "text" && (!materialText || materialText.trim().length < 20)) {
      setErrorMessage("Harap masukkan rangkuman materi minimal 20 karakter.");
      return;
    }

    if (inputMode === "file" && !selectedFile) {
      setErrorMessage("Harap pilih file materi PDF atau dokumen.");
      return;
    }

    // Simpan API key kustom ke localStorage jika dipakai
    if (useCustomKey && apiKey.trim()) {
      localStorage.setItem("tryoutku_gemini_key", apiKey.trim());
    }

    setStep(2); // Masuk ke tampilan loading animasi

    try {
      const payload: any = {
        subjectId: selectedSubjectId,
        topicId: selectedTopicId,
        programType,
        difficulty,
        questionCount: Number(questionCount),
        optionsCount: Number(optionsCount),
        apiKey: useCustomKey && apiKey.trim() ? apiKey.trim() : undefined,
      };

      if (inputMode === "text") {
        payload.materialText = materialText.trim();
        payload.customInstructions = customPrompt.trim() || undefined;
      } else if (inputMode === "file" && selectedFile) {
        payload.uploadedFile = {
          mimeType: selectedFile.mimeType,
          data: selectedFile.data,
          fileName: selectedFile.name,
        };
        payload.customInstructions = customPrompt.trim() || undefined;
      } else if (inputMode === "prompt") {
        payload.customInstructions = customPrompt.trim();
      }

      const res = await fetch("/api/teacher/questions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Gagal membuat soal dengan AI.");
      }

      const items: GeneratedQuestionItem[] = json.data?.questions || [];
      if (items.length === 0) {
        throw new Error("AI tidak menghasilkan butir soal. Coba ganti topik atau kurangi jumlah materi.");
      }

      setGeneratedQuestions(items);
      // Default: pilih semua soal yang dihasilkan
      setSelectedIndices(new Set(items.map((_, i) => i)));
      setStep(3); // Masuk ke preview & pemilihan
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Terjadi kesalahan saat berkomunikasi dengan AI.");
      setStep(1);
    }
  };

  // Toggle pilihan soal
  const toggleSelect = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIndices(new Set(generatedQuestions.map((_, i) => i)));
  };

  const handleDeselectAll = () => {
    setSelectedIndices(new Set());
  };

  // Simpan perubahan edit inline
  const handleSaveInlineEdit = (index: number) => {
    setGeneratedQuestions((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        content: editContent,
        explanation: editExplanation,
      };
      return next;
    });
    setEditingIndex(null);
  };

  // Simpan ke Bank Soal
  const handleSaveToBank = async () => {
    if (selectedIndices.size === 0) {
      setErrorMessage("Pilih minimal 1 soal untuk disimpan ke Bank Soal.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const chosenQuestions = generatedQuestions.filter((_, idx) => selectedIndices.has(idx));

      const res = await fetch("/api/teacher/questions/generate/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId: selectedTopicId,
          questions: chosenQuestions,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Gagal menyimpan soal ke database.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal menyimpan butir soal.");
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* ================= HEADER ================= */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50/70 via-indigo-50/40 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-200">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-lg">AI Soal Generator</h3>
                <Badge variant="outline" className="bg-purple-100/70 text-purple-700 border-purple-200 text-xs py-0.5">
                  Gemini 2.5 Flash
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                {step === 1 && "Susun konfigurasi & materi ajar untuk membuat butir soal otomatis"}
                {step === 2 && "Kecerdasan Buatan sedang memproses materi & menyusun butir soal..."}
                {step === 3 && `Tinjau & pilih ${generatedQuestions.length} butir soal untuk disimpan ke Bank Soal`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={step === 2 || isSaving}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================= PESAN ERROR ================= */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <div className="flex-1">{errorMessage}</div>
            <button onClick={() => setErrorMessage("")} className="text-rose-400 hover:text-rose-600 font-bold">
              ✕
            </button>
          </div>
        )}

        {/* ================= ISI MODAL ================= */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* ───────────────── STEP 1: FORM INPUT & KONFIGURASI ───────────────── */}
          {step === 1 && (
            <div className="space-y-6">
              {/* 1. Pemilihan Mata Pelajaran & Topik */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Mata Pelajaran <span className="text-rose-500">*</span></span>
                  </label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => {
                      setSelectedSubjectId(e.target.value);
                      setSelectedTopicId("");
                    }}
                    className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">-- Pilih Mata Pelajaran --</option>
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} {sub.code ? `(${sub.code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Folder className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Topik / Bab Materi <span className="text-rose-500">*</span></span>
                  </label>
                  <select
                    value={selectedTopicId}
                    onChange={(e) => setSelectedTopicId(e.target.value)}
                    disabled={!selectedSubjectId || filteredTopics.length === 0}
                    className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {filteredTopics.length === 0 ? (
                      <option value="">
                        {!selectedSubjectId ? "Pilih mapel terlebih dahulu" : "Belum ada topik pada mapel ini"}
                      </option>
                    ) : (
                      <>
                        <option value="">-- Pilih Topik / Bab --</option>
                        {filteredTopics.map((top) => (
                          <option key={top.id} value={top.id}>
                            {top.name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* 2. Pilihan Mode Input Materi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Sumber Acuan Materi Soal
                </label>
                <div className="grid grid-cols-3 gap-2.5 mb-3">
                  <button
                    type="button"
                    onClick={() => setInputMode("text")}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      inputMode === "text"
                        ? "bg-purple-50 border-purple-300 text-purple-700 shadow-xs"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Tempel Teks Materi</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInputMode("file")}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      inputMode === "file"
                        ? "bg-purple-50 border-purple-300 text-purple-700 shadow-xs"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    <span>Unggah Dokumen / PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInputMode("prompt")}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      inputMode === "prompt"
                        ? "bg-purple-50 border-purple-300 text-purple-700 shadow-xs"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Lightbulb className="w-4 h-4" />
                    <span>Instruksi Langsung</span>
                  </button>
                </div>

                {/* Input Mode 1: Tempel Teks */}
                {inputMode === "text" && (
                  <div className="space-y-2">
                    <textarea
                      value={materialText}
                      onChange={(e) => setMaterialText(e.target.value)}
                      placeholder="Tempelkan atau ketik ringkasan materi, modul ajar, artikel, atau paragraf bacaan di sini..."
                      rows={5}
                      className="w-full text-xs rounded-xl border border-slate-300 p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 font-sans"
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Semakin lengkap materi bacaan, semakin kontekstual soal yang dihasilkan.</span>
                      <span>{materialText.length} karakter</span>
                    </div>
                  </div>
                )}

                {/* Input Mode 2: Upload File PDF */}
                {inputMode === "file" && (
                  <div className="space-y-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.txt"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-purple-200 hover:border-purple-400 bg-purple-50/30 hover:bg-purple-50/70 p-6 rounded-xl text-center cursor-pointer transition-colors group"
                    >
                      <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform">
                        <FileUp className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-slate-800">
                        {selectedFile ? selectedFile.name : "Klik untuk memilih dokumen materi"}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Format PDF atau TXT (maks. 20MB). Gemini AI akan membaca langsung konten dokumen.
                      </p>
                      {selectedFile && (
                        <Badge variant="outline" className="mt-2 text-emerald-700 bg-emerald-50 border-emerald-300 text-[10px]">
                          ✓ Dokumen Terlampir Siap Diproses
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Input Mode 3 / Tambahan Instruksi Khusus */}
                <div className="mt-3">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Instruksi Khusus Tambahan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Contoh: Fokus pada soal HOTS tingkat analisis, atau sertakan kasus kontekstual sehari-hari"
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* 3. Parameter Konfigurasi Soal */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Jumlah Soal
                  </label>
                  <select
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-purple-500"
                  >
                    {[1, 3, 5, 10, 15, 20].map((num) => (
                      <option key={num} value={num}>
                        {num} Butir Soal
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Tingkat Kesulitan
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="MEDIUM">Sedang (Standar)</option>
                    <option value="EASY">Mudah (Dasar)</option>
                    <option value="HARD">Sukar / HOTS</option>
                    <option value="MIXED">Campuran / Proporsional</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Format Pilihan
                  </label>
                  <select
                    value={optionsCount}
                    onChange={(e) => setOptionsCount(Number(e.target.value))}
                    className="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-purple-500"
                  >
                    <option value={5}>5 Opsi (A, B, C, D, E)</option>
                    <option value={4}>4 Opsi (A, B, C, D)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Tipe Program
                  </label>
                  <select
                    value={programType}
                    onChange={(e) => setProgramType(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="DAILY">Ulangan Harian</option>
                    <option value="MID_TERM">Asesmen Tengah Smt</option>
                    <option value="FINAL">Asesmen Akhir Smt</option>
                    <option value="AKM">AKM Literasi/Numerasi</option>
                    <option value="DIAGNOSTIC">Diagnostik Awal</option>
                    <option value="GENERAL">Latihan Bebas</option>
                  </select>
                </div>
              </div>

              {/* 4. Pengaturan API Key */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-semibold text-slate-700">Google Gemini API Key</span>
                    {hasSystemApiKey && (
                      <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-300 text-[10px] py-0">
                        ✓ API Key Sistem Tersedia
                      </Badge>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setUseCustomKey(!useCustomKey)}
                    className="text-[11px] font-bold text-purple-600 hover:text-purple-700 hover:underline"
                  >
                    {useCustomKey ? "Gunakan Default Server" : "Gunakan API Key Pribadi"}
                  </button>
                </div>

                {useCustomKey && (
                  <div className="mt-2.5 space-y-1">
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Masukkan Google Gemini API Key Anda (AIzaSy...)"
                      className="w-full text-xs rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-slate-800 focus:ring-2 focus:ring-purple-500"
                    />
                    <p className="text-[10px] text-slate-400">
                      Kunci ini disimpan secara lokal di browser Anda dan hanya digunakan untuk membuat soal.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ───────────────── STEP 2: ANIMASI LOADING GENERATING ───────────────── */}
          {step === 2 && (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-xl shadow-purple-200 animate-bounce">
                  <BrainCircuit className="w-10 h-10" />
                </div>
                <div className="absolute -inset-2 rounded-2xl border-2 border-purple-400/40 animate-ping" />
              </div>

              <div>
                <h4 className="text-lg font-bold text-slate-800">Menganalisis Materi & Menyusun Butir Soal</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Google Gemini sedang memformulasikan pertanyaan, pilihan distraktor, serta pembahasan konsep yang mendalam...
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-purple-600 font-semibold bg-purple-50 px-3 py-1.5 rounded-full border border-purple-200">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Harap tunggu beberapa detik...</span>
              </div>
            </div>
          )}

          {/* ───────────────── STEP 3: PREVIEW HASIL & SELEKSI ───────────────── */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Toolbar Kontrol Seleksi */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">
                    {selectedIndices.size} dari {generatedQuestions.length} Soal Dipilih
                  </span>
                  <Badge variant="outline" className="text-purple-700 bg-purple-50 border-purple-200 text-xs">
                    {selectedIndices.size === generatedQuestions.length ? "Semua Terpilih" : "Sebagian Terpilih"}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleSelectAll} className="text-xs h-7">
                    Pilih Semua
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDeselectAll} className="text-xs h-7">
                    Batal Pilih
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStep(1)}
                    className="text-xs h-7 text-slate-600"
                  >
                    Atur Ulang
                  </Button>
                </div>
              </div>

              {/* Daftar Butir Soal */}
              <div className="space-y-3.5">
                {generatedQuestions.map((q, idx) => {
                  const isSelected = selectedIndices.has(idx);
                  const isEditing = editingIndex === idx;

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border transition-all ${
                        isSelected
                          ? "bg-white border-purple-300 shadow-xs"
                          : "bg-slate-50/70 border-slate-200 opacity-70"
                      }`}
                    >
                      {/* Baris Atas: Checkbox, Nomor, Badge Kesulitan, Tombol Edit */}
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(idx)}
                            className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                          />
                          <span className="font-bold text-slate-900 text-sm">
                            Soal #{idx + 1}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-semibold py-0 ${
                              q.difficulty === "EASY"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                : q.difficulty === "HARD"
                                ? "bg-rose-50 text-rose-700 border-rose-300"
                                : "bg-amber-50 text-amber-700 border-amber-300"
                            }`}
                          >
                            {q.difficulty === "EASY" ? "Mudah" : q.difficulty === "HARD" ? "Sukar" : "Sedang"}
                          </Badge>
                          {q.bloomLevel && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              ({q.bloomLevel})
                            </span>
                          )}
                        </div>

                        {!isEditing ? (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingIndex(idx);
                              setEditContent(q.content);
                              setEditExplanation(q.explanation || "");
                            }}
                            className="text-xs text-slate-400 hover:text-purple-600 flex items-center gap-1 font-semibold"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit Teks</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleSaveInlineEdit(idx)}
                              className="h-6 text-[11px] px-2"
                            >
                              Simpan Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingIndex(null)}
                              className="h-6 text-[11px] px-2"
                            >
                              Batal
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Teks Soal */}
                      {!isEditing ? (
                        <p className="text-xs text-slate-800 leading-relaxed font-medium mb-3 pl-6">
                          {q.content}
                        </p>
                      ) : (
                        <div className="mb-3 pl-6 space-y-2">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={3}
                            className="w-full text-xs rounded-lg border border-purple-300 p-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500 font-sans"
                          />
                        </div>
                      )}

                      {/* Opsi Jawaban */}
                      <div className="pl-6 space-y-1.5 mb-3">
                        {q.options.map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className={`p-2 rounded-lg border text-xs flex items-center justify-between ${
                              opt.isCorrect
                                ? "bg-emerald-50/80 border-emerald-300 text-emerald-900 font-semibold"
                                : "bg-slate-50 border-slate-200/80 text-slate-700"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                                  opt.isCorrect ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"
                                }`}
                              >
                                {opt.label}
                              </span>
                              <span>{opt.content}</span>
                            </div>
                            {opt.isCorrect && (
                              <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-300 py-0">
                                Kunci Jawaban
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Pembahasan Soal */}
                      {q.explanation && (
                        <div className="pl-6">
                          <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-200 text-blue-900 text-xs">
                            <span className="font-bold block mb-0.5 text-blue-800">💡 Pembahasan:</span>
                            {!isEditing ? (
                              <p className="text-[11px] leading-relaxed text-blue-950">{q.explanation}</p>
                            ) : (
                              <textarea
                                value={editExplanation}
                                onChange={(e) => setEditExplanation(e.target.value)}
                                rows={2}
                                className="w-full text-xs rounded-lg border border-blue-300 p-2 text-slate-800 focus:outline-none font-sans"
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ================= FOOTER ================= */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {step === 1 && "Pastikan materi dan topik sudah dipilih dengan tepat."}
            {step === 3 && `${selectedIndices.size} butir soal siap dimasukkan ke Bank Soal.`}
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="md"
              onClick={onClose}
              disabled={step === 2 || isSaving}
              className="text-xs font-semibold"
            >
              Batal
            </Button>

            {step === 1 && (
              <Button
                variant="primary"
                size="md"
                onClick={handleGenerate}
                disabled={!selectedSubjectId || !selectedTopicId}
                className="gap-2 text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md shadow-purple-200 text-white"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generate Soal AI</span>
              </Button>
            )}

            {step === 3 && (
              <Button
                variant="primary"
                size="md"
                onClick={handleSaveToBank}
                disabled={selectedIndices.size === 0 || isSaving}
                className="gap-2 text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-200 text-white"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menyimpan ke Bank Soal...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Simpan ke Bank Soal ({selectedIndices.size})</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
