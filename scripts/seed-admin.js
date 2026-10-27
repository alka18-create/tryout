const { Client } = require("pg");
const bcrypt = require("bcryptjs");

async function main() {
  const email = (process.env.INITIAL_ADMIN_EMAIL || "admin@cbt.com").toLowerCase().trim();
  const password = process.env.INITIAL_ADMIN_PASSWORD || "PasswordAdminAnda123!";
  const name = process.env.INITIAL_ADMIN_NAME || "Administrator CBT";
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL tidak ditemukan di environment.");
  }

  console.log("======================================================");
  console.log(`[Seed Admin] Menyiapkan Akun Administrator Produksi...`);
  console.log(`Email : ${email}`);
  console.log(`Nama  : ${name}`);
  console.log("======================================================\n");

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const hash = await bcrypt.hash(password, 10);
  const id = "admin_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

  const query = `
    INSERT INTO users (id, name, email, email_verified, password_hash, role, created_at, updated_at)
    VALUES ($1, $2, $3, NOW(), $4, 'ADMIN', NOW(), NOW())
    ON CONFLICT (email) DO UPDATE 
    SET password_hash = $4, role = 'ADMIN', name = $2, updated_at = NOW();
  `;

  await client.query(query, [id, name, email, hash]);
  await client.end();

  console.log("✅ Berhasil membuat / memperbarui akun Admin di database!");
  console.log(`\nSilakan login di halaman /auth/login dengan:`);
  console.log(`Email    : ${email}`);
  console.log(`Password : ${password}\n`);
}

main().catch((err) => {
  console.error("❌ Gagal membuat akun admin:", err);
  process.exit(1);
});
