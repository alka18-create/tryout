import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { env } from "@/lib/env";
import { sendMail } from "@/lib/mailer";
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

    // Hanya satu token aktif per email: cabut token lama agar link lama tidak berlaku.
    await prisma.verificationToken.deleteMany({
      where: { identifier: normalizedEmail },
    });

    await prisma.verificationToken.create({
      data: { identifier: normalizedEmail, token, expires },
    });

    const resetUrl = `${env.APP_URL.replace(/\/$/, "")}/auth/reset-password?token=${token}`;

    await sendMail({
      to: normalizedEmail,
      subject: "Reset Kata Sandi TryoutKu",
      text: `Kami menerima permintaan reset kata sandi untuk akun Anda.\n\nBuka tautan berikut untuk membuat kata sandi baru (berlaku 1 jam):\n${resetUrl}\n\nJika Anda tidak meminta reset, abaikan email ini.`,
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f172a">
          <h2 style="margin:0 0 12px">Reset Kata Sandi TryoutKu</h2>
          <p style="margin:0 0 16px;line-height:1.6">
            Kami menerima permintaan reset kata sandi untuk akun <strong>${normalizedEmail}</strong>.
            Tautan di bawah berlaku selama <strong>1 jam</strong>.
          </p>
          <p style="margin:0 0 24px">
            <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">
              Buat Kata Sandi Baru
            </a>
          </p>
          <p style="margin:0 0 8px;font-size:13px;color:#475569">
            Jika tombol tidak berfungsi, salin tautan berikut ke browser Anda:
          </p>
          <p style="margin:0 0 24px;font-size:13px;word-break:break-all;color:#2563eb">${resetUrl}</p>
          <p style="margin:0;font-size:13px;color:#64748b">
            Jika Anda tidak meminta reset kata sandi, abaikan email ini. Kata sandi Anda tidak akan berubah.
          </p>
        </div>
      `,
    });

    // Logging di konsol server hanya di mode development
    if (process.env.NODE_ENV !== "production") {
      console.log(`[AUTH] Password reset token for ${normalizedEmail}: ${token}`);
      console.log(`[AUTH] Reset URL: ${resetUrl}`);
    }

    return {
      success: true,
      // Di production, token tidak dikirim ke client browser demi keamanan
      token: process.env.NODE_ENV !== "production" ? token : undefined,
      message:
        process.env.NODE_ENV !== "production"
          ? "Link reset password telah dibuat."
          : "Jika email terdaftar, instruksi pemulihan kata sandi telah dikirim.",
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
      // Cabut seluruh token reset milik email ini (termasuk token yang baru dipakai)
      prisma.verificationToken.deleteMany({
        where: { identifier: record.identifier },
      }),
    ]);

    return { success: true, message: "Password berhasil diperbarui. Silakan login dengan password baru." };
  }
}
