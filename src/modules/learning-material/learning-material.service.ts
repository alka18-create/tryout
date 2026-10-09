import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { UserRole } from "@/generated/prisma/client";
import {
  CreateMaterialInput,
  UpdateMaterialInput,
  detectMaterialType,
} from "./learning-material.schema";

export interface ListMaterialsFilter {
  subjectId?: string;
  topicId?: string;
  search?: string;
  type?: string;
  role?: UserRole;
  authorId?: string;
}

export class LearningMaterialService {
  /**
   * Mengambil daftar link materi pembelajaran dengan filter mata pelajaran, topik, dan pencarian.
   */
  static async listMaterials(filter: ListMaterialsFilter = {}) {
    const { subjectId, topicId, search, type, role, authorId } = filter;

    const where: any = {};

    // Jika role siswa, hanya tampilkan materi aktif
    if (role === UserRole.STUDENT) {
      where.isActive = true;
    }

    if (subjectId) {
      where.subjectId = subjectId;
    }

    if (topicId) {
      where.topicId = topicId;
    }

    if (type) {
      where.type = type;
    }

    if (authorId && role !== UserRole.ADMIN) {
      where.createdById = authorId;
    }

    if (search && search.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: "insensitive" } },
        { description: { contains: search.trim(), mode: "insensitive" } },
        { url: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    return prisma.learningMaterial.findMany({
      where,
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        topic: {
          select: {
            id: true,
            name: true,
          },
        },
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Mengambil detail satu materi pembelajaran berdasarkan ID.
   */
  static async getMaterialById(id: string) {
    const material = await prisma.learningMaterial.findUnique({
      where: { id },
      include: {
        subject: true,
        topic: true,
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!material) {
      throw new AppError("NOT_FOUND", "Materi pembelajaran tidak ditemukan.");
    }

    return material;
  }

  /**
   * Mengambil rekomendasi link materi berdasarkan kumpulan topicId (untuk diagnostik hasil ujian).
   */
  static async getMaterialsByTopicIds(topicIds: string[]) {
    if (!topicIds || topicIds.length === 0) return [];

    return prisma.learningMaterial.findMany({
      where: {
        topicId: { in: topicIds },
        isActive: true,
      },
      include: {
        subject: { select: { id: true, name: true } },
        topic: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Membuat link materi pembelajaran baru (Guru & Admin).
   */
  static async createMaterial(authorId: string, input: CreateMaterialInput) {
    // Validasi mata pelajaran
    const subject = await prisma.subject.findUnique({
      where: { id: input.subjectId },
    });
    if (!subject) {
      throw new AppError("VALIDATION_ERROR", "Mata pelajaran tidak ditemukan.");
    }

    // Validasi topik jika diisi
    if (input.topicId) {
      const topic = await prisma.topic.findFirst({
        where: { id: input.topicId, subjectId: input.subjectId },
      });
      if (!topic) {
        throw new AppError(
          "VALIDATION_ERROR",
          "Topik materi tidak sesuai dengan mata pelajaran yang dipilih."
        );
      }
    }

    const detectedType = input.type && input.type !== "AUTO"
      ? input.type
      : detectMaterialType(input.url);

    return prisma.learningMaterial.create({
      data: {
        title: input.title.trim(),
        description: input.description?.trim() || null,
        url: input.url.trim(),
        type: detectedType,
        subjectId: input.subjectId,
        topicId: input.topicId || null,
        createdById: authorId,
        isActive: true,
      },
      include: {
        subject: true,
        topic: true,
      },
    });
  }

  /**
   * Memperbarui link materi pembelajaran (Guru pembuat atau Admin).
   */
  static async updateMaterial(
    id: string,
    userId: string,
    role: UserRole,
    input: UpdateMaterialInput
  ) {
    const existing = await prisma.learningMaterial.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError("NOT_FOUND", "Materi pembelajaran tidak ditemukan.");
    }

    if (role !== UserRole.ADMIN && existing.createdById !== userId) {
      throw new AppError(
        "FORBIDDEN",
        "Anda tidak memiliki izin mengubah materi pembelajaran ini."
      );
    }

    const subjectId = input.subjectId || existing.subjectId;

    if (input.topicId) {
      const topic = await prisma.topic.findFirst({
        where: { id: input.topicId, subjectId },
      });
      if (!topic) {
        throw new AppError(
          "VALIDATION_ERROR",
          "Topik materi tidak sesuai dengan mata pelajaran yang dipilih."
        );
      }
    }

    const type =
      input.type !== undefined
        ? input.type
        : input.url
        ? detectMaterialType(input.url)
        : existing.type;

    return prisma.learningMaterial.update({
      where: { id },
      data: {
        ...(input.title ? { title: input.title.trim() } : {}),
        ...(input.description !== undefined
          ? { description: input.description?.trim() || null }
          : {}),
        ...(input.url ? { url: input.url.trim() } : {}),
        ...(input.subjectId ? { subjectId: input.subjectId } : {}),
        ...(input.topicId !== undefined ? { topicId: input.topicId || null } : {}),
        ...(type ? { type } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
      include: {
        subject: true,
        topic: true,
      },
    });
  }

  /**
   * Menghapus materi pembelajaran (Guru pembuat atau Admin).
   */
  static async deleteMaterial(id: string, userId: string, role: UserRole) {
    const existing = await prisma.learningMaterial.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError("NOT_FOUND", "Materi pembelajaran tidak ditemukan.");
    }

    if (role !== UserRole.ADMIN && existing.createdById !== userId) {
      throw new AppError(
        "FORBIDDEN",
        "Anda tidak memiliki izin menghapus materi pembelajaran ini."
      );
    }

    return prisma.learningMaterial.delete({
      where: { id },
    });
  }
}
