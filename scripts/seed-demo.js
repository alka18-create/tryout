const { Client } = require("pg");
const bcrypt = require("bcryptjs");

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL tidak ditemukan di environment.");
  }

  console.log("======================================================");
  console.log("[Seed Demo] Menyiapkan Akun Demo Khusus Siswa...");
  console.log("Password akun demo siswa: Password123!");
  console.log("======================================================\n");

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const hash = await bcrypt.hash("Password123!", 10);

  // Hanya akun demo role STUDENT
  const demoStudents = [
    {
      id: "demo_siswa_001",
      name: "Ahmad Fauzi (Siswa Demo)",
      email: "ahmad@tryoutku.com",
      role: "STUDENT",
      schoolClass: "XII IPS 1",
    },
    {
      id: "demo_siswa_002",
      name: "Citra Lestari (Siswa Demo)",
      email: "citra@tryoutku.com",
      role: "STUDENT",
      schoolClass: "XII IPS 2",
    },
  ];

  const query = `
    INSERT INTO users (id, name, email, email_verified, password_hash, role, school_class, created_at, updated_at)
    VALUES ($1, $2, $3, NOW(), $4, $5, $6, NOW(), NOW())
    ON CONFLICT (email) DO UPDATE 
    SET password_hash = $4, role = $5, name = $2, school_class = $6, updated_at = NOW();
  `;

  for (const user of demoStudents) {
    await client.query(query, [
      user.id,
      user.name,
      user.email,
      hash,
      user.role,
      user.schoolClass,
    ]);
    console.log(`✅ [${user.role}] ${user.name} (${user.email}) -> Siap!`);
  }

  // Bersihkan demo admin / guru jika sebelumnya sempat dibuat agar aman
  await client.query(`
    DELETE FROM users WHERE email IN ('guru@tryoutku.com', 'admin@tryoutku.com');
  `);

  await client.end();

  console.log("\n🎉 Akun Demo Siswa berhasil di-seed (Admin/Guru demo tidak dibuat demi keamanan).");
  console.log("Silakan login dengan:");
  console.log("Email    : ahmad@tryoutku.com");
  console.log("Password : Password123!\n");
}

main().catch((err) => {
  console.error("❌ Gagal membuat akun demo siswa:", err);
  process.exit(1);
});
