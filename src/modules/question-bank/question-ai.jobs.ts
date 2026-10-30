import { randomUUID } from "crypto";
import { AppError } from "@/lib/errors";
import type { GeneratedQuestionItem } from "./question-ai.schema";

/**
 * Penyimpanan job generate soal AI di memori proses.
 *
 * Tujuan: menghindari request HTTP yang tertahan lama (dapat diputus oleh
 * reverse proxy seperti Nginx/aaPanel dengan timeout default 60 detik).
 * Client cukup memulai job lalu melakukan polling status secara berkala.
 */

export type AiJobResult = {
  subjectName: string;
  topicName: string;
  questions: GeneratedQuestionItem[];
};

export type AiJob = {
  id: string;
  ownerId: string;
  status: "PENDING" | "DONE" | "FAILED";
  createdAt: number;
  finishedAt?: number;
  result?: AiJobResult;
  error?: { code: string; message: string };
};

const JOB_TTL_MS = 30 * 60 * 1000; // Job disimpan maksimal 30 menit

// Simpan di globalThis agar tetap satu instance meski modul di-reload
const globalStore = globalThis as unknown as { __tryoutkuAiJobs?: Map<string, AiJob> };
const jobs: Map<string, AiJob> = globalStore.__tryoutkuAiJobs ?? new Map();
globalStore.__tryoutkuAiJobs = jobs;

function cleanupExpiredJobs() {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.createdAt > JOB_TTL_MS) jobs.delete(id);
  }
}

/** Membuat job baru dan menjalankan tugas di latar belakang (tanpa ditunggu). */
export function startAiJob(ownerId: string, task: () => Promise<AiJobResult>): AiJob {
  cleanupExpiredJobs();

  const job: AiJob = {
    id: randomUUID(),
    ownerId,
    status: "PENDING",
    createdAt: Date.now(),
  };
  jobs.set(job.id, job);

  task()
    .then((result) => {
      job.status = "DONE";
      job.result = result;
      job.finishedAt = Date.now();
      console.log(
        `[AI-JOB] ${job.id} selesai dalam ${((job.finishedAt - job.createdAt) / 1000).toFixed(1)} detik (${result.questions.length} soal).`
      );
    })
    .catch((err: unknown) => {
      job.status = "FAILED";
      job.finishedAt = Date.now();
      if (err instanceof AppError) {
        job.error = { code: err.code, message: err.message };
      } else {
        const message = err instanceof Error ? err.message : String(err);
        job.error = { code: "INTERNAL_ERROR", message: `Gagal membuat soal dengan AI: ${message}` };
      }
      console.error(`[AI-JOB] ${job.id} gagal:`, err);
    });

  return job;
}

export function getAiJob(id: string): AiJob | undefined {
  return jobs.get(id);
}
