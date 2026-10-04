import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { UserRole } from "@/generated/prisma/client";
import bcrypt from "bcryptjs";

export class AdminService {
  /**
   * Mengambil daftar pengguna dengan filter role, pencarian, dan pagination.
   */
  static async listUsers(params: {
    role?: UserRole;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.role) where.role = params.role;
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { email: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          school: {
            select: { id: true, name: true },
          },
          _count: {
            select: {
              examSessions: true,
              createdTryouts: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        image: u.image,
        schoolName: u.school?.name || "-",
        schoolClass: u.schoolClass || "-",
        sessionCount: u._count.examSessions,
        tryoutCreatedCount: u._count.createdTryouts,
        createdAt: u.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Membuat akun pengguna baru oleh Admin (misal akun Guru atau Admin).
   */
  static async createUser(data: {
    name: string;
    email: string;
    password?: string;
    role: UserRole;
    schoolId?: string;
    schoolClass?: string;
  }) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new AppError("EMAIL_ALREADY_REGISTERED", "Email tersebut telah digunakan.");
    }

    const defaultPassword = data.password || "Password123!";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const user = await prisma.user.create({
      data: {
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        passwordHash: hashedPassword,
        role: data.role,
        schoolId: data.schoolId || null,
        schoolClass: data.schoolClass || null,
      },
      include: {
        school: true,
      },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      schoolName: user.school?.name || "-",
    };
  }

  /**
   * Memperbarui data pengguna (Role, Nama, dsb).
   */
  static async updateUser(
    userId: string,
    data: {
      name?: string;
      role?: UserRole;
      schoolId?: string | null;
      schoolClass?: string | null;
    }
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError("NOT_FOUND", "Pengguna tidak ditemukan.");
    }

    return prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.role ? { role: data.role } : {}),
        ...(data.schoolId !== undefined ? { schoolId: data.schoolId } : {}),
        ...(data.schoolClass !== undefined ? { schoolClass: data.schoolClass } : {}),
      },
    });
  }

  /**
   * Daftar seluruh sekolah.
   */
  static async listSchools() {
    return prisma.school.findMany({
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  /**
   * Tambah sekolah baru.
   */
  static async createSchool(data: { name: string; npsn?: string; city?: string }) {
    return prisma.school.create({
      data: {
        name: data.name.trim(),
        npsn: data.npsn?.trim() || null,
        city: data.city?.trim() || null,
      },
    });
  }

  /**
   * Edit sekolah.
   */
  static async updateSchool(id: string, data: { name?: string; npsn?: string; city?: string }) {
    return prisma.school.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.npsn !== undefined ? { npsn: data.npsn?.trim() || null } : {}),
        ...(data.city !== undefined ? { city: data.city?.trim() || null } : {}),
      },
    });
  }

  /**
   * Hapus sekolah.
   */
  static async deleteSchool(id: string) {
    const usersInSchool = await prisma.user.count({ where: { schoolId: id } });
    if (usersInSchool > 0) {
      throw new AppError(
        "CONFLICT",
        `Sekolah ini tidak dapat dihapus karena masih memiliki ${usersInSchool} pengguna terkait.`
      );
    }

    return prisma.school.delete({ where: { id } });
  }
}
