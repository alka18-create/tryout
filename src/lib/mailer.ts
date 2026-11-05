import { env } from "./env";

interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Pengiriman email transaksional.
 *
 * Provider yang dipakai: Resend (https://resend.com) melalui HTTP API,
 * sehingga tidak membutuhkan dependency tambahan. Konfigurasi:
 *   EMAIL_PROVIDER_API_KEY = re_xxxxxxxx
 *   EMAIL_FROM             = "TryoutKu <no-reply@domainanda.com>"
 *
 * Jika kunci belum diset, email tidak dikirim dan fungsi mengembalikan false
 * (link reset tetap dicatat di log server saat mode development).
 */
export async function sendMail({ to, subject, html, text }: SendMailInput): Promise<boolean> {
  const apiKey = env.EMAIL_PROVIDER_API_KEY;
  const from = env.EMAIL_FROM || "TryoutKu <no-reply@tryoutku.local>";

  if (!apiKey) {
    console.warn(
      "[MAILER] EMAIL_PROVIDER_API_KEY belum diset. Email tidak dikirim ke:",
      to,
    );
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
        ...(text ? { text } : {}),
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[MAILER] Gagal mengirim email:", res.status, detail.slice(0, 500));
      return false;
    }

    return true;
  } catch (error) {
    console.error("[MAILER] Error jaringan saat mengirim email:", error);
    return false;
  }
}
