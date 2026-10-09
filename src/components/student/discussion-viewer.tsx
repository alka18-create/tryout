"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
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
  type?: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE";
  topicName: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  content: string;
  imageUrl?: string | null;
  options: OptionItem[];
  selectedOptionId: string | null;
  selectedOptionIds?: string[];
  correctOptionId: string | null;
  correctOptionIds?: string[];
  correctLabel: string;
  answerStatus: "CORRECT" | "PARTIAL" | "WRONG" | "EMPTY";
  isFlagged: boolean;
  scoreObtained: number;
  explanation?: string | null;
  explanationImageUrl?: string | null;
}

export function DiscussionViewer({
  initialQuestions,
}: {
  initialQuestions: QuestionDiscussion[];
}) {
  const [filter, setFilter] = useState<"ALL" | "CORRECT" | "PARTIAL" | "WRONG" | "EMPTY" | "FLAGGED">("ALL");
  const [activeIndex, setActiveIndex] = useState(0);

  // Filter list
  const filteredQuestions = initialQuestions.filter((q) => {
    if (filter === "CORRECT") return q.answerStatus === "CORRECT";
    if (filter === "PARTIAL") return q.answerStatus === "PARTIAL";
    if (filter === "WRONG") return q.answerStatus === "WRONG";
    if (filter === "EMPTY") return q.answerStatus === "EMPTY";
    if (filter === "FLAGGED") return q.isFlagged;
    return true;
  });

  const currentQuestion = initialQuestions[activeIndex];

  const correctCount = initialQuestions.filter((q) => q.answerStatus === "CORRECT").length;
  const partialCount = initialQuestions.filter((q) => q.answerStatus === "PARTIAL").length;
  const wrongCount = initialQuestions.filter((q) => q.answerStatus === "WRONG").length;
  const emptyCount = initialQuestions.filter((q) => q.answerStatus === "EMPTY").length;
  const flaggedCount = initialQuestions.filter((q) => q.isFlagged).length;

  return (
    <div className="space-y-6">
      {/* 1. Filter Tab Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilter("ALL")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-xs ${
            filter === "ALL"
              ? "bg-blue-600 text-white"
              : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          Semua ({initialQuestions.length})
        </button>

        <button
          onClick={() => setFilter("CORRECT")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs ${
            filter === "CORRECT"
              ? "bg-emerald-600 text-white"
              : "bg-white text-emerald-700 hover:bg-emerald-50/50 border border-slate-200"
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Benar ({correctCount})</span>
        </button>

        {partialCount > 0 && (
          <button
            onClick={() => setFilter("PARTIAL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs ${
              filter === "PARTIAL"
                ? "bg-amber-500 text-white"
                : "bg-white text-amber-700 hover:bg-amber-50/50 border border-slate-200"
            }`}
          >
            <span>Parsial ({partialCount})</span>
          </button>
        )}

        <button
          onClick={() => setFilter("WRONG")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs ${
            filter === "WRONG"
              ? "bg-rose-600 text-white"
              : "bg-white text-rose-700 hover:bg-rose-50/50 border border-slate-200"
          }`}
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>Salah ({wrongCount})</span>
        </button>

        <button
          onClick={() => setFilter("EMPTY")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs ${
            filter === "EMPTY"
              ? "bg-slate-700 text-white"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Kosong ({emptyCount})</span>
        </button>

        <button
          onClick={() => setFilter("FLAGGED")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs ${
            filter === "FLAGGED"
              ? "bg-amber-500 text-white"
              : "bg-white text-amber-700 hover:bg-amber-50/50 border border-slate-200"
          }`}
        >
          <Bookmark className="w-3.5 h-3.5 fill-current" />
          <span>Ragu ({flaggedCount})</span>
        </button>
      </div>

      {/* 2. Grid Nomor Soal */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
          Pilih Nomor Soal:
        </span>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {initialQuestions.map((q, idx) => {
            const isActive = idx === activeIndex;
            let statusColor = "bg-white border-slate-200 text-slate-700";
            if (q.answerStatus === "CORRECT") {
              statusColor = "bg-emerald-50 border-emerald-300 text-emerald-800";
            } else if (q.answerStatus === "WRONG") {
              statusColor = "bg-rose-50 border-rose-300 text-rose-800";
            }

            return (
              <button
                key={q.questionId}
                onClick={() => setActiveIndex(idx)}
                className={`h-9 rounded-xl text-xs font-bold transition-all border flex items-center justify-center relative shadow-xs ${statusColor} ${
                  isActive ? "ring-2 ring-blue-600 ring-offset-2 ring-offset-white scale-105" : "hover:border-blue-300"
                }`}
              >
                {q.orderNumber}
                {q.isFlagged && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-white" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Detail Soal Aktif */}
      {currentQuestion && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-6">
          {/* Header Soal */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <span className="text-xl font-extrabold text-slate-900">
                Soal Nomor {currentQuestion.orderNumber}
              </span>
              <Badge variant="outline">
                {currentQuestion.type === "MULTIPLE_CHOICE"
                  ? "PG Kompleks"
                  : currentQuestion.type === "TRUE_FALSE"
                  ? "Benar / Salah"
                  : "Pilihan Ganda"}
              </Badge>
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
              ) : currentQuestion.answerStatus === "PARTIAL" ? (
                <Badge variant="warning" className="gap-1.5 py-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Benar Sebagian (+{currentQuestion.scoreObtained} / {currentQuestion.weight} Poin)</span>
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
            <p className="text-base text-slate-800 leading-relaxed font-medium">
              {currentQuestion.content}
            </p>

            {currentQuestion.imageUrl && (
              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white p-2 shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentQuestion.imageUrl}
                  alt="Lampiran Soal"
                  className="max-h-72 mx-auto object-contain rounded-xl"
                />
              </div>
            )}
          </div>

          {/* Pilihan Opsi */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Pilihan Jawaban & Analisis Kunci:
              </span>
              <span className="text-xs font-bold text-slate-600">
                Kunci Benar: <span className="text-emerald-700 font-extrabold">{currentQuestion.correctLabel}</span>
              </span>
            </div>
            {currentQuestion.options.map((option) => {
              const isStudentChoice = (currentQuestion.selectedOptionIds && currentQuestion.selectedOptionIds.length > 0)
                ? currentQuestion.selectedOptionIds.includes(option.id)
                : currentQuestion.selectedOptionId === option.id;
              const isCorrectAnswer = (currentQuestion.correctOptionIds && currentQuestion.correctOptionIds.length > 0)
                ? currentQuestion.correctOptionIds.includes(option.id)
                : option.isCorrect;

              let style = "bg-white border-slate-200 text-slate-700 shadow-xs";
              if (isCorrectAnswer) {
                style = "bg-emerald-50/80 border-emerald-300 text-emerald-950 ring-1 ring-emerald-400/50 shadow-xs";
              } else if (isStudentChoice && !isCorrectAnswer) {
                style = "bg-rose-50/80 border-rose-300 text-rose-950 ring-1 ring-rose-400/50 shadow-xs";
              }

              return (
                <div
                  key={option.id}
                  className={`p-4 rounded-2xl border flex items-start gap-4 transition-all ${style}`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      isCorrectAnswer
                        ? "bg-emerald-600 text-white"
                        : isStudentChoice
                        ? "bg-rose-600 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {option.label}
                  </div>

                  <div className="flex-1 min-w-0 pt-0.5 text-sm leading-relaxed">
                    {option.content}
                    {option.imageUrl && (
                      <div className="mt-2 rounded-lg overflow-hidden border border-slate-200 max-w-xs">
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
                      <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                        KUNCI JAWABAN
                      </span>
                    )}
                    {isStudentChoice && (
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                          isCorrectAnswer
                            ? "text-emerald-800 bg-emerald-100 border-emerald-200"
                            : "text-rose-800 bg-rose-100 border-rose-200"
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
          {(currentQuestion.explanation || currentQuestion.explanationImageUrl) ? (
            <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-3">
              <span className="text-xs font-bold text-blue-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Penjelasan & Pembahasan Materi:
              </span>
              {currentQuestion.explanation && (
                <p className="text-sm text-blue-950 leading-relaxed font-normal">
                  {currentQuestion.explanation}
                </p>
              )}
              {currentQuestion.explanationImageUrl && (
                <div className="rounded-xl overflow-hidden border border-blue-200 bg-white p-2 max-w-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentQuestion.explanationImageUrl}
                    alt="Lampiran Pembahasan"
                    className="max-h-60 rounded-lg object-contain mx-auto"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
              Tidak ada teks penjelasan tambahan untuk nomor ini. Kunci jawaban yang benar adalah{" "}
              <strong className="text-slate-700">({currentQuestion.correctLabel})</strong>.
            </div>
          )}

          {/* Navigasi Nomor Bawah */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
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

            <span className="text-xs text-slate-500 font-medium">
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
