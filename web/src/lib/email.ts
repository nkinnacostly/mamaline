// Sends email through Resend's HTTP API (https://resend.com/docs/api-reference/emails/send-email).
// Needs RESEND_API_KEY. Without a verified domain, Resend only delivers from
// onboarding@resend.dev to the address that owns the Resend account.

type Email = { to: string; replyTo?: string; subject: string; text: string; html: string };

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.PARTNER_INBOX);
}

export async function sendEmail({ to, replyTo, subject, text, html }: Email) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.PARTNER_FROM || "MamaLine <onboarding@resend.dev>",
      to: [to],
      reply_to: replyTo,
      subject,
      text,
      html,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend returned ${res.status}: ${detail.slice(0, 300)}`);
  }
  return (await res.json()) as { id: string };
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
