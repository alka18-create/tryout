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
import { CustomSelect } from "@/components/ui/custom-select";
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
  const [isExtractingFile, setIsExtractingFile] = useState(false);
  const [extractedStats, setExtractedStats] = useState<{
    fileName: string;
    chars: number;
    pages?: number;
  } | null>(null);
  const [showExtractedPreview, setShowExtractedPreview] = useState(false);

  // Assessment Settings
  const [questionType, setQuestionType] = useState<"SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE" | "MIXED">("SINGLE_CHOICE");
  const [programType, setProgramType] = useState("DAILY");
  const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD" | "MIXED">("MEDIUM");
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [optionsCount, setOptionsCount] = useState<number>(5);

  // Kredensial & Model Cloudflare Workers AI
  const [hasSystemCloudflare, setHasSystemCloudflare] = useState(false);
  const [useCustomCf, setUseCustomCf] = useState(false);
  const [cfAccountId, setCfAccountId] = useState("");
  const [cfApiToken, setCfApiToken] = useState("");
  const [selectedCfModel, setSelectedCfModel] = useState("@cf/meta/llama-3.3-70b-instruct-fp8-fast");

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

    // Ambil kredensial Cloudflare dari localStorage
    const savedCfAccount = localStorage.getItem("tryoutku_cf_account");
    const savedCfToken = localStorage.getItem("tryoutku_cf_token");
    if (savedCfAccount) setCfAccountId(savedCfAccount);
    if (savedCfToken) {
      setCfApiToken(savedCfToken);
      setUseCustomCf(true);
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
            const d = genJson.data || {};
            setHasSystemCloudflare(Boolean(d.hasSystemCloudflare));
            if (d.cloudflareModel) setSelectedCfModel(d.cloudflareModel);

            if (!d.hasSystemCloudflare && !savedCfToken) {
              setUseCustomCf(true);
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
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setIsExtractingFile(true);
    setExtractedStats(null);

    try {
      // 1. Ekstraksi teks dari file TXT
      if (file.name.endsWith(".txt") || file.type === "text/plain") {
        const text = await file.text();
        setMaterialText(text);
        setExtractedStats({
          fileName: file.name,
          chars: text.length,
        });
      }
      // 2. Ekstraksi teks dari file PDF langsung di browser via unpdf
      else if (file.name.endsWith(".pdf") || file.type === "application/pdf") {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const { extractText } = await import("unpdf");
          const res = await extractText(new Uint8Array(arrayBuffer));
          const joined = Array.isArray(res.text) ? res.text.join("\n\n").trim() : String(res.text || "").trim();
          if (joined.length > 20) {
            setMaterialText(joined);
            setExtractedStats({
              fileName: file.name,
              chars: joined.length,
              pages: res.totalPages,
            });
          }
        } catch (pdfErr) {
          console.warn("Client-side PDF extraction error, will use server fallback:", pdfErr);
        }
      }

      // 3. Fallback FileReader Base64
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
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Gagal memproses file: " + (err.message || "Terjadi kesalahan."));
    } finally {
      setIsExtractingFile(false);
    }
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

    if (!hasSystemCloudflare && (!useCustomCf || !cfAccountId.trim() || !cfApiToken.trim())) {
      setUseCustomCf(true);
      setErrorMessage("Silakan lengkapi Cloudflare Account ID dan API Token Anda.");
      return;
    }
    if (useCustomCf && (!cfAccountId.trim() || !cfApiToken.trim())) {
      setErrorMessage("Silakan lengkapi Cloudflare Account ID dan API Token Anda.");
      return;
    }
    if (useCustomCf && cfAccountId.trim() && cfApiToken.trim()) {
      localStorage.setItem("tryoutku_cf_account", cfAccountId.trim());
      localStorage.setItem("tryoutku_cf_token", cfApiToken.trim());
    }

    if (inputMode === "text" && (!materialText || materialText.trim().length < 20)) {
      setErrorMessage("Harap masukkan rangkuman materi minimal 20 karakter.");
      return;
    }

    if (inputMode === "file" && !selectedFile) {
      setErrorMessage("Harap pilih file materi PDF atau dokumen.");
      return;
    }

    setStep(2); // Masuk ke tampilan loading animasi

    try {
      const payload: any = {
        subjectId: selectedSubjectId,
        topicId: selectedTopicId,
        programType,
        difficulty,
        questionCount: Number(questionCount),
        questionType,
        optionsCount: Number(optionsCount),
        provider: "CLOUDFLARE",
        model: selectedCfModel,
        cfAccountId: useCustomCf && cfAccountId.trim() ? cfAccountId.trim() : undefined,
        cfApiToken: useCustomCf && cfApiToken.trim() ? cfApiToken.trim() : undefined,
      };

      if (inputMode === "text") {
        payload.materialText = materialText.trim();
        payload.customInstructions = customPrompt.trim() || undefined;
      } else if (inputMode === "file") {
        // Prioritaskan pengiriman teks materi hasil ekstraksi (jauh lebih ringan & instan)
        if (materialText && materialText.trim().length > 20) {
          payload.materialText = materialText.trim();
        } else if (selectedFile) {
          payload.uploadedFile = {
            mimeType: selectedFile.mimeType,
            data: selectedFile.data,
            fileName: selectedFile.name,
          };
        }
        payload.customInstructions = customPrompt.trim() || undefined;
      } else if (inputMode === "prompt") {
        payload.customInstructions = customPrompt.trim();
      }

      // Helper: kirim request & parse JSON dengan aman (tangani respon HTML dari proxy)
      const requestJson = async (url: string, init?: RequestInit) => {
        let res: Response;
        try {
          res = await fetch(url, { cache: "no-store", ...init });
        } catch (fetchErr: any) {
          const err: any = new Error(
            `Gagal menghubungi server (${fetchErr?.message || "koneksi terputus"}).`
          );
          err.isNetworkError = true;
          throw err;
        }
        const rawText = await res.text().catch(() => "");
        let json: any = null;
        try {
          json = rawText ? JSON.parse(rawText) : null;
        } catch {
          const cleanPreview = rawText
            .replace(/<[^>]*>?/gm, " ")
            .replace(/\s+/g, " ")
            .trim()
            .substring(0, 150);
          throw new Error(
            `Server Error (${res.status} ${res.statusText}): ${cleanPreview || "respon tidak valid dari server"}`
          );
        }
        if (!res.ok || !json?.success) {
          throw new Error(json?.error?.message || `Permintaan gagal (HTTP ${res.status}).`);
        }
        return json.data;
      };

      // 1. Mulai job di server (langsung dibalas dengan jobId, tidak menunggu AI)
      const started = await requestJson("/api/teacher/questions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const jobId: string | undefined = started?.jobId;
      if (!jobId) {
        throw new Error("Server tidak mengembalikan ID proses pembuatan soal.");
      }

      // 2. Polling status job setiap 2,5 detik (maksimal ~5 menit)
      const POLL_INTERVAL_MS = 2500;
      const MAX_WAIT_MS = 5 * 60 * 1000;
      const startedAt = Date.now();
      let networkFailures = 0;
      let items: GeneratedQuestionItem[] = [];

      while (true) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

        if (Date.now() - startedAt > MAX_WAIT_MS) {
          throw new Error("Proses pembuatan soal melebihi 5 menit. Coba kurangi jumlah soal atau panjang materi.");
        }

        let statusData: any;
        try {
          statusData = await requestJson(`/api/teacher/questions/generate/jobs/${jobId}`);
          networkFailures = 0;
        } catch (pollErr: any) {
          // Toleransi gangguan jaringan sesaat saat polling
          if (pollErr?.isNetworkError && networkFailures < 3) {
            networkFailures++;
            continue;
          }
          throw pollErr;
        }

        if (statusData?.status === "DONE") {
          items = statusData.result?.questions || [];
          break;
        }
        if (statusData?.status === "FAILED") {
          throw new Error(statusData.error?.message || "Gagal membuat soal dengan AI.");
        }
        // PENDING -> lanjut polling
      }

      if (items.length === 0) {
        throw new Error("AI tidak menghasilkan butir soal. Coba ganti topik atau kurangi jumlah materi.");
      }

      setGeneratedQuestions(items);
      // Default: pilih semua soal yang dihasilkan
      setSelectedIndices(new Set(items.map((_, i) => i)));
      setStep(3); // Masuk ke preview & pemilihan
    } catch (err: any) {
      console.error("[QuestionAiModal] Error caught:", err);
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

      const rawText = await res.text().catch(() => "");
      let json: any = null;
      try {
        json = rawText ? JSON.parse(rawText) : null;
      } catch {
        throw new Error(`Server Error (${res.status}): ${rawText.substring(0, 150) || res.statusText}`);
      }

      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message || "Gagal menyimpan soal ke database.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("[QuestionAiModal] Save error:", err);
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
                <Badge variant="outline" className="bg-amber-100/70 text-amber-800 border-amber-300 text-xs py-0.5 font-semibold">
                  Cloudflare Workers AI
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
                  <CustomSelect
                    value={selectedSubjectId}
                    onChange={(val) => {
                      setSelectedSubjectId(val);
                      setSelectedTopicId("");
                    }}
                    placeholder="-- Pilih Mata Pelajaran --"
                    options={[
                      { value: "", label: "-- Pilih Mata Pelajaran --" },
                      ...subjects.map((sub) => ({
                        value: sub.id,
                        label: `${sub.name}${sub.code ? ` (${sub.code})` : ""}`,
                      })),
                    ]}
                    triggerClassName="py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Folder className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Topik / Bab Materi <span className="text-rose-500">*</span></span>
                  </label>
                  <CustomSelect
                    value={selectedTopicId}
                    onChange={(val) => setSelectedTopicId(val)}
                    disabled={!selectedSubjectId || filteredTopics.length === 0}
                    placeholder={
                      !selectedSubjectId
                        ? "Pilih mapel terlebih dahulu"
                        : filteredTopics.length === 0
                        ? "Belum ada topik pada mapel ini"
                        : "-- Pilih Topik / Bab --"
                    }
                    options={
                      filteredTopics.length === 0
                        ? []
                        : [
                            { value: "", label: "-- Pilih Topik / Bab --" },
                            ...filteredTopics.map((top) => ({ value: top.id, label: top.name })),
                          ]
                    }
                    triggerClassName="py-2 text-xs"
                  />
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
                        Format PDF atau TXT. Teks materi akan langsung diekstrak secara otomatis.
                      </p>

                      {isExtractingFile && (
                        <div className="mt-2.5 flex items-center justify-center gap-1.5 text-xs text-purple-600 font-semibold">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Mengekstrak teks dari dokumen...</span>
                        </div>
                      )}

                      {extractedStats && !isExtractingFile && (
                        <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-left">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{extractedStats.chars.toLocaleString()} karakter teks diekstrak</span>
                              {extractedStats.pages && (
                                <span className="font-normal text-emerald-700">({extractedStats.pages} halaman)</span>
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                setShowExtractedPreview(!showExtractedPreview);
                              }}
                              className="text-[10px] font-bold text-emerald-700 hover:underline"
                            >
                              {showExtractedPreview ? "Sembunyikan Teks" : "Lihat / Edit Teks"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {showExtractedPreview && materialText && (
                      <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5 animate-in fade-in">
                        <div className="flex items-center justify-between text-[11px] text-slate-600 font-semibold">
                          <span>Pratinjau Teks Materi yang Digunakan AI:</span>
                          <span className="text-slate-400 font-normal">{materialText.length} karakter</span>
                        </div>
                        <textarea
                          value={materialText}
                          onChange={(e) => setMaterialText(e.target.value)}
                          rows={6}
                          className="w-full text-xs rounded-lg border border-slate-300 p-2.5 text-slate-800 font-sans focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    )}
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

              {/* 3. Parameter Konfigurasi & Tipe Soal */}
              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-3.5">
                {/* Pemilihan Tipe / Bentuk Soal */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
                      <span>Bentuk / Tipe Soal Asesmen</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">Sesuai format ujian CBT</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      {
                        val: "SINGLE_CHOICE",
                        title: "Pilihan Ganda",
                        desc: "1 Kunci Benar (A–D/E)",
                      },
                      {
                        val: "MULTIPLE_CHOICE",
                        title: "PG Kompleks",
                        desc: "Centang (≥ 2 Benar)",
                      },
                      {
                        val: "TRUE_FALSE",
                        title: "Benar / Salah",
                        desc: "2 Opsi Pernyataan",
                      },
                      {
                        val: "MIXED",
                        title: "Campuran",
                        desc: "Kombinasi Beragam",
                      },
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => setQuestionType(item.val as any)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          questionType === item.val
                            ? "bg-purple-50/80 border-purple-500 text-purple-900 shadow-xs ring-1 ring-purple-400 font-bold"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <div className="text-xs font-bold">{item.title}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Parameter Lainnya */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200/60">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Jumlah Soal
                    </label>
                    <CustomSelect
                      value={String(questionCount)}
                      onChange={(val) => setQuestionCount(Number(val))}
                      options={[1, 3, 5, 10, 15, 20].map((num) => ({
                        value: String(num),
                        label: `${num} Butir Soal`,
                      }))}
                      triggerClassName="py-1.5 text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Tingkat Kesulitan
                    </label>
                    <CustomSelect
                      value={difficulty}
                      onChange={(val) => setDifficulty(val as any)}
                      options={[
                        { value: "MEDIUM", label: "Sedang (Standar)" },
                        { value: "EASY", label: "Mudah (Dasar)" },
                        { value: "HARD", label: "Sukar / HOTS" },
                        { value: "MIXED", label: "Campuran / Proporsional" },
                      ]}
                      triggerClassName="py-1.5 text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Format Pilihan
                    </label>
                    {questionType === "TRUE_FALSE" ? (
                      <div className="w-full text-xs rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-slate-500 font-medium">
                        2 Opsi (Benar & Salah)
                      </div>
                    ) : (
                      <CustomSelect
                        value={String(optionsCount)}
                        onChange={(val) => setOptionsCount(Number(val))}
                        options={[
                          { value: "5", label: "5 Opsi (A, B, C, D, E)" },
                          { value: "4", label: "4 Opsi (A, B, C, D)" },
                        ]}
                        triggerClassName="py-1.5 text-xs font-medium"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Tipe Program
                    </label>
                    <CustomSelect
                      value={programType}
                      onChange={(val) => setProgramType(val)}
                      options={[
                        { value: "DAILY", label: "Ulangan Harian" },
                        { value: "MID_TERM", label: "Asesmen Tengah Smt" },
                        { value: "FINAL", label: "Asesmen Akhir Smt" },
                        { value: "AKM", label: "AKM Literasi/Numerasi" },
                        { value: "DIAGNOSTIC", label: "Diagnostik Awal" },
                        { value: "GENERAL", label: "Latihan Bebas" },
                      ]}
                      triggerClassName="py-1.5 text-xs font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Pengaturan Cloudflare Workers AI */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/70 text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span className="font-bold text-slate-700">Cloudflare Workers AI</span>
                    {hasSystemCloudflare && (
                      <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-300 text-[10px] py-0 font-medium">
                        ✓ Server Siap Pakai
                      </Badge>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setUseCustomCf(!useCustomCf)}
                    className="text-[11px] font-bold text-amber-600 hover:text-amber-700 hover:underline"
                  >
                    {useCustomCf ? "Gunakan Default Server" : "Gunakan Kredensial Pribadi"}
                  </button>
                </div>

                {useCustomCf && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        Cloudflare Account ID (32 Karakter)
                      </label>
                      <input
                        type="text"
                        value={cfAccountId}
                        onChange={(e) => setCfAccountId(e.target.value)}
                        placeholder="Contoh: a1b2c3d4e5f6..."
                        className="w-full text-xs rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-slate-800 focus:ring-2 focus:ring-amber-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        Cloudflare API Token (Workers AI)
                      </label>
                      <input
                        type="password"
                        value={cfApiToken}
                        onChange={(e) => setCfApiToken(e.target.value)}
                        placeholder="Masukkan API Token Cloudflare..."
                        className="w-full text-xs rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-slate-800 focus:ring-2 focus:ring-amber-500 bg-white"
                      />
                    </div>
                  </div>
                )}

                {/* Model Cloudflare */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
                  <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                    <BrainCircuit className="w-3.5 h-3.5 text-amber-600" />
                    <span>Pilihan Model AI:</span>
                  </div>
                  <div className="w-full sm:w-80">
                    <CustomSelect
                      value={selectedCfModel}
                      onChange={(val) => setSelectedCfModel(val)}
                      options={[
                        {
                          value: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
                          label: "Meta Llama 3.3 70B (Sangat Cerdas)",
                        },
                        {
                          value: "@cf/meta/llama-3.1-8b-instruct-fp8",
                          label: "Meta Llama 3.1 8B FP8 (Super Cepat 2 Detik)",
                        },
                        {
                          value: "@cf/meta/llama-3.2-3b-instruct",
                          label: "Meta Llama 3.2 3B (Ringan & Cepat)",
                        },
                        {
                          value: "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
                          label: "DeepSeek R1 Distill 32B (Penalaran & HOTS)",
                        },
                      ]}
                      triggerClassName="py-1.5 text-xs font-medium"
                    />
                  </div>
                </div>
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
                  Cloudflare Workers AI sedang memformulasikan pertanyaan, pilihan distraktor, serta pembahasan konsep yang mendalam...
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
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-semibold py-0 ${
                              q.type === "MULTIPLE_CHOICE"
                                ? "bg-indigo-50 text-indigo-700 border-indigo-300"
                                : q.type === "TRUE_FALSE"
                                ? "bg-teal-50 text-teal-700 border-teal-300"
                                : "bg-blue-50 text-blue-700 border-blue-300"
                            }`}
                          >
                            {q.type === "MULTIPLE_CHOICE"
                              ? "PG Kompleks"
                              : q.type === "TRUE_FALSE"
                              ? "Benar / Salah"
                              : "Pilihan Ganda"}
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
