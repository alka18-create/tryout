"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Bookmark,
  Layers,
  Sparkles,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface OptionItem {
  id: string;
  label: string;
  content: string;
  imageUrl?: string | null;
  isCorrect: boolean;
}

interface QuestionDiscussion {
  orderNumber: number;
  weight: number;
  questionId: string;
  topicName: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  content: string;
  imageUrl?: string | null;
  options: OptionItem[];
  selectedOptionId: string | null;
  correctOptionId: string | null;
  correctLabel: string;
  answerStatus: "CORRECT" | "WRONG" | "EMPTY";
  isFlagged: boolean;
  scoreObtained: number;
  explanation?: string | null;
}

export function DiscussionViewer({
  initialQuestions,
}: {
  initialQuestions: QuestionDiscussion[];
}) {
  const [filter, setFilter] = useState<"ALL" | "CORRECT" | "WRONG" | "EMPTY" | "FLAGGED">("ALL");
  const [activeIndex, setActiveIndex] = useState(0);

  // Filter list
  const filteredQuestions = initialQuestions.filter((q) => {
    if (filter === "CORRECT") return q.answerStatus === "CORRECT";
    if (filter === "WRONG") return q.answerStatus === "WRONG";
    if (filter === "EMPTY") return q.answerStatus === "EMPTY";
    if (filter === "FLAGGED") return q.isFlagged;
    return true;
  });

  const currentQuestion = initialQuestions[activeIndex];

  const correctCount = initialQuestions.filter((q) => q.answerStatus === "CORRECT").length;
  const wrongCount = initialQuestions.filter((q) => q.answerStatus === "WRONG").length;
  const emptyCount = initialQuestions.filter((q) => q.answerStatus === "EMPTY").length;
  const flaggedCount = initialQuestions.filter((q) => q.isFlagged).length;

  return (
    <div className="space-y-6">
      {/* 1. Filter Tab Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilter("ALL")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filter === "ALL"
              ? "bg-indigo-600 text-white"
              : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
          }`}
        >
          Semua ({initialQuestions.length})
        </button>

        <button
          onClick={() => setFilter("CORRECT")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            filter === "CORRECT"
              ? "bg-emerald-600 text-white"
              : "bg-slate-900 text-emerald-400 hover:text-emerald-300 border border-slate-800"
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Benar ({correctCount})</span>
        </button>

        <button
          onClick={() => setFilter("WRONG")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            filter === "WRONG"
              ? "bg-rose-600 text-white"
              : "bg-slate-900 text-rose-400 hover:text-rose-300 border border-slate-800"
          }`}
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>Salah ({wrongCount})</span>
        </button>

        <button
          onClick={() => setFilter("EMPTY")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            filter === "EMPTY"
              ? "bg-slate-700 text-white"
              : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Kosong ({emptyCount})</span>
        </button>

        <button
          onClick={() => setFilter("FLAGGED")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            filter === "FLAGGED"
              ? "bg-amber-600 text-white"
              : "bg-slate-900 text-amber-400 hover:text-amber-300 border border-slate-800"
          }`}
        >
          <Bookmark className="w-3.5 h-3.5 fill-current" />
          <span>Ragu ({flaggedCount})</span>
        </button>
      </div>

      {/* 2. Grid Nomor Soal */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
          Pilih Nomor Soal:
        </span>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {initialQuestions.map((q, idx) => {
            const isActive = idx === activeIndex;
            let statusColor = "bg-slate-950 border-slate-800 text-slate-400";
            if (q.answerStatus === "CORRECT") {
              statusColor = "bg-emerald-500/20 border-emerald-500/40 text-emerald-300";
            } else if (q.answerStatus === "WRONG") {
              statusColor = "bg-rose-500/20 border-rose-500/40 text-rose-300";
            }

            return (
              <button
                key={q.questionId}
                onClick={() => setActiveIndex(idx)}
                className={`h-9 rounded-xl text-xs font-bold transition-all border flex items-center justify-center relative ${statusColor} ${
                  isActive ? "ring-2 ring-indigo-500 scale-105" : "hover:border-slate-700"
                }`}
              >
                {q.orderNumber}
                {q.isFlagged && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-slate-950" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Detail Soal Aktif */}
      {currentQuestion && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
          {/* Header Soal */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-xl font-extrabold text-white">
                Soal Nomor {currentQuestion.orderNumber}
              </span>
              <Badge variant="default">{currentQuestion.topicName}</Badge>
              <Badge
                variant={
                  currentQuestion.difficulty === "HARD"
                    ? "danger"
                    : currentQuestion.difficulty === "MEDIUM"
                    ? "warning"
                    : "success"
                }
              >
                {currentQuestion.difficulty}
              </Badge>
            </div>

            {/* Status Jawaban Badge */}
            <div className="flex items-center gap-2">
              {currentQuestion.answerStatus === "CORRECT" ? (
                <Badge variant="success" className="gap-1.5 py-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Jawaban Benar (+{currentQuestion.scoreObtained} Poin)</span>
                </Badge>
              ) : currentQuestion.answerStatus === "WRONG" ? (
                <Badge variant="danger" className="gap-1.5 py-1">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Jawaban Salah (0 Poin)</span>
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1.5 py-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Tidak Dijawab (0 Poin)</span>
                </Badge>
              )}
            </div>
          </div>

          {/* Teks Soal */}
          <div className="space-y-4">
            <p className="text-base text-slate-100 leading-relaxed font-medium">
              {currentQuestion.content}
            </p>

            {currentQuestion.imageUrl && (
              <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950/60 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentQuestion.imageUrl}
                  alt="Lampiran Soal"
                  className="max-h-72 mx-auto object-contain rounded-xl"
                />
              </div>
            )}
          </div>

          {/* Pilihan Opsi A–E */}
          <div className="space-y-3 pt-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Pilihan Jawaban & Analisis Kunci:
            </span>
            {currentQuestion.options.map((option) => {
              const isStudentChoice = currentQuestion.selectedOptionId === option.id;
              const isCorrectAnswer = option.isCorrect;

              let style = "bg-slate-950/50 border-slate-800/80 text-slate-300";
              if (isCorrectAnswer) {
                style = "bg-emerald-500/10 border-emerald-500/50 text-emerald-200 ring-1 ring-emerald-500/40";
              } else if (isStudentChoice && !isCorrectAnswer) {
                style = "bg-rose-500/10 border-rose-500/50 text-rose-200 ring-1 ring-rose-500/40";
              }

              return (
                <div
                  key={option.id}
                  className={`p-4 rounded-2xl border flex items-start gap-4 transition-all ${style}`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      isCorrectAnswer
                        ? "bg-emerald-500 text-slate-950"
                        : isStudentChoice
                        ? "bg-rose-500 text-white"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {option.label}
                  </div>

                  <div className="flex-1 min-w-0 pt-0.5 text-sm leading-relaxed">
                    {option.content}
                    {option.imageUrl && (
                      <div className="mt-2 rounded-lg overflow-hidden border border-slate-800 max-w-xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={option.imageUrl}
                          alt={`Opsi ${option.label}`}
                          className="max-h-40 object-contain"
                        />
                      </div>
                    )}
                  </div>

                  {/* Badges Status Opsi */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {isCorrectAnswer && (
                      <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                        KUNCI JAWABAN
                      </span>
                    )}
                    {isStudentChoice && (
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                          isCorrectAnswer
                            ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/20"
                            : "text-rose-400 bg-rose-500/20 border-rose-500/30"
                        }`}
                      >
                        PILIHAN ANDA
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Kotak Pembahasan */}
          {currentQuestion.explanation ? (
            <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-2">
              <span className="text-xs font-bold text-indigo-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Penjelasan & Pembahasan Materi:
              </span>
              <p className="text-sm text-indigo-200/90 leading-relaxed">
                {currentQuestion.explanation}
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-500">
              Tidak ada teks penjelasan tambahan untuk nomor ini. Kunci jawaban yang benar adalah{" "}
              <strong>({currentQuestion.correctLabel})</strong>.
            </div>
          )}

          {/* Navigasi Nomor Bawah */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <Button
              variant="outline"
              size="sm"
              disabled={activeIndex === 0}
              onClick={() => setActiveIndex((prev) => Math.max(0, prev - 1))}
              className="gap-2 text-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Nomor Sebelumnya</span>
            </Button>

            <span className="text-xs text-slate-400">
              Nomor {activeIndex + 1} dari {initialQuestions.length}
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={activeIndex === initialQuestions.length - 1}
              onClick={() =>
                setActiveIndex((prev) => Math.min(initialQuestions.length - 1, prev + 1))
              }
              className="gap-2 text-xs"
            >
              <span>Nomor Berikutnya</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
