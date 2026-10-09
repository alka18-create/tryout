import { z } from "zod";

export function detectMaterialType(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();

    if (host.includes("youtube.com") || host.includes("youtu.be")) {
      return "YOUTUBE";
    }
    if (host.includes("drive.google.com") || host.includes("docs.google.com")) {
      return "GOOGLE_DRIVE";
    }
    if (
      pathname.endsWith(".pdf") ||
      pathname.endsWith(".doc") ||
      pathname.endsWith(".docx") ||
      pathname.endsWith(".ppt") ||
      pathname.endsWith(".pptx")
    ) {
      return "DOCUMENT";
    }
    if (
      host.includes("notion.site") ||
      host.includes("notion.so") ||
      host.includes("medium.com") ||
      host.includes("wikipedia.org")
    ) {
      return "ARTICLE";
    }
    return "LINK";
  } catch {
    return "LINK";
  }
}

export const createMaterialSchema = z.object({
  title: z.string().min(3, "Judul materi minimal 3 karakter"),
  description: z.string().optional().or(z.literal("")),
  url: z
    .string()
    .url("URL tidak valid, harus diawali dengan http:// atau https://"),
  subjectId: z.string().min(1, "Mata pelajaran wajib dipilih"),
  topicId: z.string().optional().or(z.literal("")),
  type: z.string().optional(),
});

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;

export const updateMaterialSchema = z.object({
  title: z.string().min(3, "Judul materi minimal 3 karakter").optional(),
  description: z.string().optional().or(z.literal("")),
  url: z
    .string()
    .url("URL tidak valid, harus diawali dengan http:// atau https://")
    .optional(),
  subjectId: z.string().min(1, "Mata pelajaran wajib dipilih").optional(),
  topicId: z.string().optional().or(z.literal("")),
  type: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;
