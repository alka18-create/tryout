import { prisma } from "../src/lib/prisma";
import { AnalyticsService } from "../src/modules/analytics/analytics.service";
import { AdminService } from "../src/modules/user/admin.service";
import { UserRole } from "../src/generated/prisma/client";

async function main() {
  console.log("=== MEMULAI TEST INTEGRASI FASE 9 (DASHBOARD GURU & PANEL ADMIN) ===");

  // 1. Ambil akun Admin, Guru, dan Tryout
  const admin = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN },
  });
  if (!admin) throw new Error("Admin tidak ditemukan!");
  console.log(`[1] Admin: ${admin.name} (${admin.email})`);

  const teacher = await prisma.user.findFirst({
    where: { role: UserRole.TEACHER },
  });
  if (!teacher) throw new Error("Guru tidak ditemukan!");
  console.log(`[1] Guru: ${teacher.name} (${teacher.email})`);

  const tryout = await prisma.tryout.findFirst({
    where: { status: "PUBLISHED" },
  });
  if (!tryout) throw new Error("Tryout PUBLISHED tidak ditemukan!");
  console.log(`[2] Tryout Uji: "${tryout.title}" (ID: ${tryout.id})`);

  // 2. Test: AnalyticsService.getTryoutReport
  const report = await AnalyticsService.getTryoutReport(tryout.id, admin.id, UserRole.ADMIN);
  console.log(`[3] ✅ getTryoutReport sukses:`);
  console.log(`    - Total Peserta: ${report.summary.totalParticipants}`);
  console.log(`    - Skor Rata-rata: ${report.summary.averageScore}`);
  console.log(`    - Butir Soal Teranalisis: ${report.itemAnalysis.length} butir`);
  console.log(`    - Topik Terpetakan: ${report.topicAnalysis.length} topik`);

  // 3. Test: AnalyticsService.generateTryoutCsv
  const csvData = await AnalyticsService.generateTryoutCsv(tryout.id, admin.id, UserRole.ADMIN);
  if (!csvData.csvContent.includes("Peringkat,Nama Siswa,Email,Sekolah") || !csvData.filename.endsWith(".csv")) {
    throw new Error("Format CSV tidak sesuai!");
  }
  console.log(`[4] ✅ generateTryoutCsv sukses: Filename = "${csvData.filename}" (${csvData.csvContent.length} bytes).`);

  // 4. Test: AnalyticsService.listTeacherTryoutsWithMetrics
  const teacherList = await AnalyticsService.listTeacherTryoutsWithMetrics(teacher.id, UserRole.TEACHER);
  console.log(`[5] ✅ listTeacherTryoutsWithMetrics sukses: ${teacherList.length} paket tryout terambil.`);

  // 5. Test: AdminService.listUsers
  const userList = await AdminService.listUsers({ page: 1, limit: 10 });
  if (userList.users.length === 0 || userList.pagination.total < 1) {
    throw new Error("listUsers gagal memuat data pengguna!");
  }
  console.log(`[6] ✅ listUsers sukses: ${userList.users.length} pengguna (Total di DB: ${userList.pagination.total}).`);

  // 6. Test: AdminService.createUser (Buat akun guru baru secara programmatic)
  const testEmail = `guru.test.${Date.now()}@tryoutku.com`;
  const newTeacher = await AdminService.createUser({
    name: "Guru Pengujian Fase 9",
    email: testEmail,
    role: UserRole.TEACHER,
  });
  console.log(`[7] ✅ createUser sukses: ID = ${newTeacher.id} (Role: ${newTeacher.role})`);

  // 7. Test: AdminService.updateUser (Ubah role akun)
  const updatedUser = await AdminService.updateUser(newTeacher.id, {
    name: "Guru Pengujian (Updated)",
    role: UserRole.ADMIN,
  });
  if (updatedUser.role !== UserRole.ADMIN) {
    throw new Error("updateUser gagal mengubah role!");
  }
  console.log(`[8] ✅ updateUser sukses: Role berhasil diubah ke ADMIN.`);

  // 8. Test: AdminService - Manajemen Sekolah (CRUD)
  const newSchool = await AdminService.createSchool({
    name: `SMA Pengujian Fase 9 ${Date.now()}`,
    npsn: "99887766",
    city: "Jakarta Pusat",
  });
  console.log(`[9] ✅ createSchool sukses: "${newSchool.name}" (ID: ${newSchool.id})`);

  const updatedSchool = await AdminService.updateSchool(newSchool.id, {
    city: "Jakarta Selatan",
  });
  if (updatedSchool.city !== "Jakarta Selatan") {
    throw new Error("updateSchool gagal!");
  }
  console.log(`[10] ✅ updateSchool sukses: Kota diubah menjadi ${updatedSchool.city}`);

  // Hapus sekolah uji
  await AdminService.deleteSchool(newSchool.id);
  console.log(`[11] ✅ deleteSchool sukses: Sekolah pengujian berhasil dihapus.`);

  // Bersihkan akun user uji
  await prisma.user.delete({ where: { id: newTeacher.id } });
  console.log(`[12] Data akun user uji berhasil dibersihkan.`);

  console.log("=== SEMUA TEST INTEGRASI FASE 9 SUKSES 100% ===");
}

main()
  .catch((err) => {
    console.error("Gagal menjalankan test:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
