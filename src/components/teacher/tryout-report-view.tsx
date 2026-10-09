"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Search,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Users,
  Award,
  TrendingDown,
  TrendingUp,
  FileQuestion,
  Filter,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ParticipantItem {
  rank: number;
  sessionId: string;
  userId: string;
  name: string;
  email: string;
  schoolName: string;
  schoolClass: string;
  attemptNumber?: number;
  totalAttempts?: number;
  totalScore: number;
  isPassed: boolean;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  durationSpentMinutes: number;
  submittedAt: string;
}

interface TopicAnalysisItem {
  topicId: string;
  topicName: string;
  averagePercentage: number;
  testedSessions: number;
}

interface ItemAnalysisItem {
  orderNumber: number;
  questionId: string;
  contentSnippet: string;
  topicName: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  weight: number;
  correctCount: number;
  totalParticipants: number;
  correctPercentage: number;
  absorptionCategory: "TINGGI" | "SEDANG" | "RENDAH";
}

interface TryoutReportData {
  tryout: {
    id: string;
    title: string;
    subjectName: string;
    durationMinutes: number;
    passingScore: number;
    questionCount: number;
  };
  summary: {
    totalParticipants: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    passedCount: number;
    passingRate: number;
  };
  participants: ParticipantItem[];
  topicAnalysis: TopicAnalysisItem[];
  itemAnalysis: ItemAnalysisItem[];
}

export function TryoutReportView({ data }: { data: TryoutReportData }) {
  const [activeTab, setActiveTab] = useState<"participants" | "topics" | "items">("participants");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PASSED" | "FAILED">("ALL");

  const filteredParticipants = data.participants.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      p.schoolName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "PASSED" && p.isPassed) ||
      (statusFilter === "FAILED" && !p.isPassed);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="space-y-1">
          <Link
            href="/dashboard/teacher/reports"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Laporan Tryout</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Laporan: {data.tryout.title}
            </h1>
            <Badge variant="info">{data.tryout.subjectName}</Badge>
          </div>
          <p className="text-xs text-slate-500">
            {data.tryout.questionCount} Butir Soal • Durasi {data.tryout.durationMinutes} Menit • Standar KKM {data.tryout.passingScore}
          </p>
        </div>

        {/* Download CSV Button */}
        <a href={`/api/teacher/tryouts/${data.tryout.id}/export`} download>
          <Button variant="outline" size="sm" className="gap-2 text-xs shrink-0 shadow-xs">
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export Nilai (.CSV)</span>
          </Button>
        </a>
      </div>

      {/* 5 Metrik Ringkas Ujian */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-4 text-center">
          <span className="text-[11px] text-slate-500 font-medium block">Total Peserta</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{data.summary.totalParticipants}</p>
        </Card>

        <Card className="p-4 text-center">
          <span className="text-[11px] text-slate-500 font-medium block">Rata-rata Skor</span>
          <p className="text-2xl font-black text-blue-600 mt-1">{data.summary.averageScore}</p>
        </Card>

        <Card className="p-4 text-center">
          <span className="text-[11px] text-slate-500 font-medium block">Nilai Tertinggi</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">{data.summary.highestScore}</p>
        </Card>

        <Card className="p-4 text-center">
          <span className="text-[11px] text-slate-500 font-medium block">Nilai Terendah</span>
          <p className="text-2xl font-black text-rose-600 mt-1">{data.summary.lowestScore}</p>
        </Card>

        <Card className="p-4 text-center col-span-2 sm:col-span-1">
          <span className="text-[11px] text-slate-500 font-medium block">Tingkat Kelulusan</span>
          <p className="text-2xl font-black text-amber-600 mt-1">{data.summary.passingRate}%</p>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("participants")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
            activeTab === "participants"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Daftar Peserta & Nilai ({data.participants.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("topics")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
            activeTab === "topics"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <TrendingDown className="w-4 h-4 text-amber-500" />
          <span>Analisis Materi Terlemah ({data.topicAnalysis.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("items")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
            activeTab === "items"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <FileQuestion className="w-4 h-4" />
          <span>Analisis Butir Soal ({data.itemAnalysis.length})</span>
        </button>
      </div>

      {/* TAB CONTENT 1: DAFTAR PESERTA */}
      {activeTab === "participants" && (
        <Card className="space-y-4">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-0">
            <div>
              <CardTitle className="text-base">Daftar Hasil Ujian Peserta</CardTitle>
              <CardDescription>
                Urutan peringkat siswa berdasarkan nilai akhir pengerjaan tryout
              </CardDescription>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari siswa/sekolah..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 shadow-xs"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 outline-none shadow-xs"
              >
                <option value="ALL">Semua Status</option>
                <option value="PASSED">Lulus KKM</option>
                <option value="FAILED">Di Bawah KKM</option>
              </select>
            </div>
          </CardHeader>

          <CardContent>
            {filteredParticipants.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                Tidak ada data peserta yang cocok dengan filter pencarian.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4 text-center">Rank</th>
                      <th className="py-3 px-4">Nama Siswa</th>
                      <th className="py-3 px-4">Asal Sekolah</th>
                      <th className="py-3 px-4 text-center">Skor Tertinggi</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">B / S / K</th>
                      <th className="py-3 px-4 text-center">Durasi</th>
                      <th className="py-3 px-4 text-right">Tanggal Selesai</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredParticipants.map((p) => (
                      <tr key={p.sessionId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 text-center font-bold text-slate-600">
                          #{p.rank}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 block">{p.name}</span>
                          <span className="text-[11px] text-slate-500">{p.email}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-slate-700 block font-medium">{p.schoolName}</span>
                          <span className="text-[11px] text-slate-500">Kelas: {p.schoolClass}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-black text-sm text-slate-900 block">{p.totalScore}</span>
                          {p.attemptNumber && (
                            <span className="text-[10px] text-blue-600 font-semibold block mt-0.5">
                              Percobaan #{p.attemptNumber} {p.totalAttempts ? `(${p.totalAttempts}x)` : ""}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <Badge variant={p.isPassed ? "success" : "danger"} className="text-[10px]">
                            {p.isPassed ? "LULUS" : "REMIDI"}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-700 font-mono">
                          <span className="text-emerald-600 font-bold">{p.correctCount}</span> /{" "}
                          <span className="text-rose-600">{p.wrongCount}</span> /{" "}
                          <span className="text-slate-400">{p.unansweredCount}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-600">
                          {p.durationSpentMinutes} mnt
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-500 text-[11px]">
                          {new Date(p.submittedAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB CONTENT 2: ANALISIS MATERI TERLEMAH */}
      {activeTab === "topics" && (
        <Card className="space-y-4">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-amber-500" />
              Peringkat Topik Materi yang Perlu Penguatan
            </CardTitle>
            <CardDescription>
              Daftar materi diurutkan dari yang memiliki persentase penguasaan paling rendah (paling sering salah dijawab siswa)
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {data.topicAnalysis.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                Belum ada data pengerjaan untuk dianalisis.
              </div>
            ) : (
              data.topicAnalysis.map((item, idx) => {
                const isWeak = item.averagePercentage < 60;
                const isMedium = item.averagePercentage >= 60 && item.averagePercentage < 75;

                return (
                  <div
                    key={item.topicId}
                    className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs shadow-xs">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-slate-900 text-sm block">
                            {item.topicName}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Diujikan pada {item.testedSessions} sesi pengerjaan siswa
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-base font-black ${
                            isWeak ? "text-rose-600" : isMedium ? "text-amber-600" : "text-emerald-600"
                          }`}
                        >
                          {item.averagePercentage}%
                        </span>
                        <span className="text-[10px] text-slate-500 block">Rata-rata Penguasaan</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isWeak ? "bg-rose-500" : isMedium ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(100, item.averagePercentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB CONTENT 3: ANALISIS BUTIR SOAL */}
      {activeTab === "items" && (
        <Card className="space-y-4">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileQuestion className="w-5 h-5 text-blue-600" />
              Analisis Butir Soal (Item Analysis)
            </CardTitle>
            <CardDescription>
              Tingkat ketercapaian dan persentase siswa yang berhasil menjawab benar per butir soal
            </CardDescription>
          </CardHeader>

          <CardContent>
            {data.itemAnalysis.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                Belum ada butir soal dalam paket ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4 text-center">No</th>
                      <th className="py-3 px-4">Potongan Pertanyaan</th>
                      <th className="py-3 px-4">Topik</th>
                      <th className="py-3 px-4 text-center">Tingkat</th>
                      <th className="py-3 px-4 text-center">Siswa Benar</th>
                      <th className="py-3 px-4 text-center">% Benar</th>
                      <th className="py-3 px-4 text-center">Daya Serap</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.itemAnalysis.map((item) => (
                      <tr key={item.questionId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                          #{item.orderNumber}
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="line-clamp-2 text-slate-700">{item.contentSnippet}...</p>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">{item.topicName}</td>
                        <td className="py-3.5 px-4 text-center">
                          <Badge
                            variant={
                              item.difficulty === "HARD"
                                ? "danger"
                                : item.difficulty === "MEDIUM"
                                ? "warning"
                                : "success"
                            }
                            className="text-[10px]"
                          >
                            {item.difficulty}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-700 font-semibold">
                          {item.correctCount} / {item.totalParticipants}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-sm text-blue-600">
                          {item.correctPercentage}%
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <Badge
                            variant={
                              item.absorptionCategory === "TINGGI"
                                ? "success"
                                : item.absorptionCategory === "SEDANG"
                                ? "warning"
                                : "danger"
                            }
                            className="text-[10px]"
                          >
                            {item.absorptionCategory}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
