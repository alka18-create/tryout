/**
 * Sanitasi URL tujuan setelah login untuk mencegah open redirect.
 *
 * Hanya menerima path relatif same-origin yang diawali satu garis miring,
 * mis. "/dashboard/teacher". URL absolut (https://evil.com), protocol-relative
 * ("//evil.com"), backslash trick ("/\\evil.com"), dan karakter kontrol akan
 * dikembalikan ke fallback.
 */
export function safeCallbackUrl(
  raw: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!raw) return fallback;

  let value = raw.trim();
  if (!value) return fallback;

  // Decode sekali untuk menangkap pola ter-encode seperti %2F%2Fevil.com
  try {
    value = decodeURIComponent(value);
  } catch {
    return fallback;
  }

  value = value.trim();
  if (!value) return fallback;

  // Wajib path relatif: diawali "/" tetapi bukan "//" atau "/\"
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  if (value.startsWith("/\\")) return fallback;
  if (value.includes("\\")) return fallback;

  // Tolak karakter kontrol / newline yang bisa dipakai untuk header injection
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;

  // Jangan pernah mengarahkan kembali ke halaman login itu sendiri
  if (value === "/auth/login" || value.startsWith("/auth/login?")) return fallback;

  return value;
}
