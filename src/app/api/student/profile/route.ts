import { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireAuth } from "@/modules/auth/auth.guard";
import { prisma } from "@/lib/prisma";
import { ok, handleApiError } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

const updateProfileSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  phone: z.string().optional().or(z.literal("")),
  schoolClass: z.string().optional().or(z.literal("")),
  schoolName: z.string().optional().or(z.literal("")),
  currentPassword: z.string().optional().or(z.literal("")),
  newPassword: z.string().min(6, "Password baru minimal 6 karakter").optional().or(z.literal("")),
});

export async function GET() {
  try {
    const sessionUser = await requireAuth();

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        phone: true,
        schoolClass: true,
        passwordHash: true,
        school: {
          select: {
            id: true,
            name: true,
            npsn: true,
            city: true,
          },
        },
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError("NOT_FOUND", "Data pengguna tidak ditemukan.");
    }

    const { passwordHash, ...safeUserData } = user;

    return ok({
      ...safeUserData,
      hasPassword: Boolean(passwordHash),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const sessionUser = await requireAuth();
    const json = await req.json();
    const validated = updateProfileSchema.parse(json);

    // 1. Cek user
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
    });

    if (!user) {
      throw new AppError("NOT_FOUND", "Pengguna tidak ditemukan.");
    }

    // 2. Hubungkan atau buat sekolah baru jika diisi
    let schoolId: string | null | undefined = user.schoolId;
    if (validated.schoolName && validated.schoolName.trim().length > 0) {
      const name = validated.schoolName.trim();
      let school = await prisma.school.findFirst({
        where: { name: { equals: name, mode: "insensitive" } },
      });
      if (!school) {
        school = await prisma.school.create({ data: { name } });
      }
      schoolId = school.id;
    }

    // 3. Logika ganti password jika newPassword diisi
    let updatedPasswordHash: string | undefined = undefined;
    if (validated.newPassword && validated.newPassword.length >= 6) {
      if (user.passwordHash) {
        if (!validated.currentPassword) {
          throw new AppError(
            "VALIDATION_ERROR",
            "Password lama wajib diisi untuk mengubah password.",
          );
        }
        const isMatch = await bcrypt.compare(validated.currentPassword, user.passwordHash);
        if (!isMatch) {
          throw new AppError("VALIDATION_ERROR", "Password lama tidak sesuai.");
        }
      }
      updatedPasswordHash = await bcrypt.hash(validated.newPassword, 10);
    }

    // 4. Update database
    const updated = await prisma.user.update({
      where: { id: sessionUser.id },
      data: {
        name: validated.name.trim(),
        phone: validated.phone || null,
        schoolClass: validated.schoolClass || null,
        schoolId,
        ...(updatedPasswordHash ? { passwordHash: updatedPasswordHash } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        schoolClass: true,
        school: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return ok(updated, "Profil berhasil diperbarui.");
  } catch (error) {
    return handleApiError(error);
  }
}
