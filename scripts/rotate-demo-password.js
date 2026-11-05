/**
 * scripts/rotate-demo-password.js
 * =============================================================================
 * Memutar (mengganti) password akun demo dengan password baru (bcrypt).
 *
 * Aman dan idempoten:
 *   - Hanya meng-update 4 akun demo @tryoutku.com (TIDAK menghapus akun apa pun).
 *   - Bisa dijalankan berulang kali.
 *   - JANGAN gunakan seed-demo.js di produksi — script itu menghapus akun
 *     admin & guru demo (aman, tapi destruktif).
 *
 * Cara pakai:
 *   node scripts/rotate-demo-password.js                # default: TryoutKu@2026
 *   DEMO_PASSWORD="PasswordBaru" node scripts/...       # password kustom
 *
 * Di produksi, jalankan dari dalam container aplikasi:
 *   docker compose --env-file .env.production -f docker-compose.prod.yml \
 *     exec -T app node scripts/rotate-demo-password.js
 * =============================================================================
 */
const { Client } = require("pg");
const bcrypt = require("bcryptjs");

const DEMO_EMAILS = [
  "admin@tryoutku.com",
  "guru@tryoutku.com",
  "ahmad@tryoutku.com",
  "citra@tryoutku.com",
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL tidak ditemukan di environment.");
  }

  const newPassword = process.env.DEMO_PASSWORD || "TryoutKu@2026";

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const hash = bcrypt.hashSync(newPassword, 10);
  let updated = 0;

  for (const email of DEMO_EMAILS) {
    const result = await client.query(
      "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2 RETURNING id",
      [hash, email],
    );
    if (result.rowCount > 0) {
      console.log(`OK        -> ${email}`);
      updated += 1;
    } else {
      console.log(`TIDAK ADA -> ${email}`);
    }
  }

  await client.end();
  console.log(`Selesai. ${updated}/${DEMO_EMAILS.length} akun demo diperbarui dengan password baru.`);
}

main().catch((err) => {
  console.error("Gagal memutar password akun demo:", err);
  process.exit(1);
});