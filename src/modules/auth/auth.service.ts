import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { UserRole } from "@/generated/prisma/client";
import type { RegisterInput } from "./auth.schema";

export class AuthService {
  /**
   * Pendaftaran peserta baru (Role STUDENT).
   */
  static async registerStudent(input: RegisterInput) {
    const email = input.email.toLowerCase().trim();

    // 1. Cek duplikasi email
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new AppError("EMAIL_ALREADY_REGISTERED", "Email sudah terdaftar. Silakan login.");
    }

    // 2. Hash password
    const passwordHash = await bcrypt.hash(input.password, 10);

    // 3. Hubungkan ke sekolah jika ada nama sekolah yang diinput
    let schoolId: string | undefined = undefined;
    if (input.schoolName && input.schoolName.trim().length > 0) {
      const schoolName = input.schoolName.trim();
      let school = await prisma.school.findFirst({
        where: { name: { equals: schoolName, mode: "insensitive" } },
      });
      if (!school) {
        school = await prisma.school.create({ data: { name: schoolName } });
      }
      schoolId = school.id;
    }

    // 4. Buat record User
    const user = await prisma.user.create({
      data: {
        name: input.name.trim(),
        email,
        passwordHash,
        role: UserRole.STUDENT,
        phone: input.phone || null,
        schoolClass: input.schoolClass || null,
        schoolId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        schoolClass: true,
        createdAt: true,
      },
    });

    return user;
  }

  /**
   * Buat token reset password berbatas waktu (1 jam).
   */
  static async createPasswordResetToken(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Return sukses semu untuk mencegah email enumeration attack
      return { success: true, message: "Jika email terdaftar, link reset telah dikirim." };
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 jam

    await prisma.verificationToken.upsert({
      where: {
        identifier_token: {
          identifier: normalizedEmail,
          token,
        },
      },
      update: { token, expires },
      create: { identifier: normalizedEmail, token, expires },
    });

    // Logging di konsol server (MVP dev mode)
    console.log(`[AUTH] Password reset token for ${normalizedEmail}: ${token}`);
    console.log(`[AUTH] Reset URL: /auth/reset-password?token=${token}`);

    return {
      success: true,
      token, // Dikirim untuk kemudahan testing dev
      message: "Link reset password telah dibuat.",
    };
  }

  /**
   * Reset password menggunakan token verifikasi.
   */
  static async resetPassword(token: string, newPassword: string) {
    const record = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!record || record.expires < new Date()) {
      throw new AppError("INVALID_OR_EXPIRED_TOKEN", "Token reset password tidak valid atau sudah kadaluarsa.");
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { email: record.identifier },
        data: { passwordHash },
      }),
      prisma.verificationToken.delete({
        where: { token },
      }),
    ]);

    return { success: true, message: "Password berhasil diperbarui. Silakan login dengan password baru." };
  }
}
