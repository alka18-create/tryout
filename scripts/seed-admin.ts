import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";
import { UserRole } from "../src/generated/prisma/client";

async function main() {
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || "admin@cbt.local";
  const rawPassword = process.env.INITIAL_ADMIN_PASSWORD || "AdminCBT_2026!Aman";
  const adminName = process.env.INITIAL_ADMIN_NAME || "Administrator Utama";

  console.log(`\n======================================================`);
  console.log(`[Seed Admin] Menyiapkan Akun Administrator Produksi...`);
  console.log(`Email : ${adminEmail}`);
  console.log(`Nama  : ${adminName}`);
  console.log(`======================================================\n`);

  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  const passwordHash = await bcrypt.hash(rawPassword, 12);

  if (existingUser) {
    console.log(`Akun dengan email ${adminEmail} sudah terdaftar.`);
    const updated = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        role: UserRole.ADMIN,
        passwordHash,
      },
    });
    console.log(`✓ Berhasil memperbarui peran akun menjadi ADMIN dan menyetel password baru.`);
  } else {
    const created = await prisma.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        passwordHash,
        role: UserRole.ADMIN,
      },
    });
    console.log(`✓ Berhasil membuat akun Administrator baru dengan ID: ${created.id}`);
  }

  console.log(`\nAkun Administrator produksi siap digunakan untuk login!\n`);
}

main()
  .catch((e) => {
    console.error("Gagal melakukan seed admin:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
