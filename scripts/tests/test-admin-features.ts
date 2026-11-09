/**
 * TEST SUITE: Fitur Admin — Reset Password & Hapus Pengguna.
 * Fixture pakai domain @example.test dan dibersihkan di akhir.
 */
import { prisma } from "../../src/lib/prisma";
import { AdminService } from "../../src/modules/user/admin.service";
import { UserRole } from "../../src/generated/prisma/client";
import bcrypt from "bcryptjs";

let passCount = 0;
let failCount = 0;
function assert(label: string, cond: boolean) {
  if (cond) {
    passCount++;
    console.log(`  ✓ ${label}`);
  } else {
    failCount++;
    console.log(`  ✗ ${label}`);
  }
}

export async function runAdminFeaturesTests() {
  passCount = 0;
  failCount = 0;
  console.log("==================================================");
  console.log("▶ [ADMIN] Reset Password & Hapus Pengguna");
  console.log("==================================================");

  const suffix = Date.now();
  const admin = await prisma.user.create({
    data: { name: "Admin Uji", email: `admin_ft_${suffix}@example.test`, role: UserRole.ADMIN, passwordHash: "x" },
  });
  const student = await prisma.user.create({
    data: { name: "Siswa Uji", email: `student_ft_${suffix}@example.test`, role: UserRole.STUDENT, passwordHash: "x" },
  });
  const teacher = await prisma.user.create({
    data: { name: "Guru Uji", email: `teacher_ft_${suffix}@example.test`, role: UserRole.TEACHER, passwordHash: "x" },
  });

  try {
    console.log("\n[Reset Password]");
    // 1. Auto generate
    const r1 = await AdminService.resetUserPassword(student.id, admin.id, {});
    assert("reset auto menghasilkan password sementara", Boolean(r1.newPassword && r1.newPassword.length >= 8));
    const row1 = await prisma.user.findUnique({ where: { id: student.id } });
    assert("password sementara tersimpan (bcrypt cocok)", Boolean(row1 && (await bcrypt.compare(r1.newPassword as string, row1.passwordHash))));

    // 2. Custom password
    const r2 = await AdminService.resetUserPassword(student.id, admin.id, { password: "Rahasia789" });
    assert("reset custom tidak mengembalikan password", r2.newPassword === undefined);
    const row2 = await prisma.user.findUnique({ where: { id: student.id } });
    assert("password custom tersimpan (bcrypt cocok)", Boolean(row2 && (await bcrypt.compare("Rahasia789", row2.passwordHash))));

    // 3. Guard: target ADMIN, akun sendiri, password pendek
    try {
      await AdminService.resetUserPassword(admin.id, student.id, {});
      assert("reset akun ADMIN diblokir", false);
    } catch (e: any) {
      assert("reset akun ADMIN diblokir (FORBIDDEN)", e.code === "FORBIDDEN");
    }
    try {
      await AdminService.resetUserPassword(admin.id, admin.id, {});
      assert("reset akun sendiri diblokir", false);
    } catch (e: any) {
      assert("reset akun sendiri diblokir (FORBIDDEN)", e.code === "FORBIDDEN");
    }
    try {
      await AdminService.resetUserPassword(student.id, admin.id, { password: "12345" });
      assert("password < 6 karakter ditolak", false);
    } catch (e: any) {
      assert("password < 6 karakter ditolak (VALIDATION_ERROR)", e.code === "VALIDATION_ERROR");
    }

    console.log("\n[Hapus Pengguna]");
    // 4. Hapus siswa (tanpa data) berhasil
    const dStudent = await AdminService.deleteUser(student.id, admin.id);
    assert("hapus siswa berhasil", dStudent.deleted === true);

    // 5. Guru yang punya tryout diblokir (CONFLICT)
    const subject = await prisma.subject.create({
      data: { name: `Subjek Uji ${suffix}`, code: `SU${suffix}` },
    });
    const tryout = await prisma.tryout.create({
      data: {
        title: `Tryout Uji ${suffix}`,
        subjectId: subject.id,
        createdById: teacher.id,
        durationMinutes: 45,
        passingScore: 60,
        maxAttempts: 3,
      },
    });
    try {
      await AdminService.deleteUser(teacher.id, admin.id);
      assert("hapus guru dengan tryout diblokir", false);
    } catch (e: any) {
      assert("hapus guru dengan tryout diblokir (CONFLICT)", e.code === "CONFLICT");
    }
    await prisma.tryout.delete({ where: { id: tryout.id } });

    // 6. Guru tanpa data berhasil dihapus
    const dTeacher = await AdminService.deleteUser(teacher.id, admin.id);
    assert("hapus guru tanpa data berhasil", dTeacher.deleted === true);

    // 7. Guard hapus: ADMIN & akun sendiri
    try {
      await AdminService.deleteUser(admin.id, student.id || admin.id);
      assert("hapus akun ADMIN diblokir", false);
    } catch (e: any) {
      assert("hapus akun ADMIN diblokir (FORBIDDEN)", e.code === "FORBIDDEN");
    }
    try {
      await AdminService.deleteUser(admin.id, admin.id);
      assert("hapus akun sendiri diblokir", false);
    } catch (e: any) {
      assert("hapus akun sendiri diblokir (FORBIDDEN)", e.code === "FORBIDDEN");
    }

    // Bersihkan
    await prisma.subject.delete({ where: { id: subject.id } }).catch(() => {});
  } finally {
    await prisma.user.deleteMany({
      where: { id: { in: [admin.id, student.id, teacher.id] } },
    });
    await prisma.tryout.deleteMany({ where: { createdById: teacher.id } });
    await prisma.subject.deleteMany({ where: { code: { startsWith: "SU" } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: "@example.test" } } });
  }

  console.log(`\n=> Hasil Admin Features Tests: ${passCount}/${passCount + failCount} Pengujian Berhasil.`);
  return failCount === 0;
}

// Eksekusi langsung jika dipanggil via node/tsx
if (require.main === module || process.argv[1]?.endsWith("test-admin-features.ts")) {
  runAdminFeaturesTests()
    .then((success) => process.exit(success ? 0 : 1))
    .catch((err) => {
      console.error("Terjadi error tak terduga:", err);
      process.exit(1);
    });
}