import { emailConfigured, escapeHtml, sendEmail } from "@/lib/email";

// Receives the "Partner with us" form and emails it to PARTNER_INBOX through Resend.
// Without email settings it only logs in development, and refuses in production so
// enquiries are never silently lost.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Simple per-IP limit: 5 enquiries per 10 minutes. It lives in memory, so on
// serverless hosts it is per instance; use a shared store if spam becomes a problem.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const recent = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  recent.set(ip, hits);
  return hits.length > MAX_PER_WINDOW;
}

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send the form as JSON." }, { status: 400 });
  }

  // Honeypot: a hidden field people never see. Bots that fill it get a quiet success.
  if (clean(body.website, 200)) return Response.json({ ok: true });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) {
    return Response.json({ error: "Too many messages. Please try again in a few minutes." }, { status: 429 });
  }

  const partner = {
    name: clean(body.name, 120),
    email: clean(body.email, 160),
    organisation: clean(body.organisation, 160),
    role: clean(body.role, 80),
    message: clean(body.message, 2000),
    consent: body.consent === true,
  };

  if (!partner.name || !partner.organisation || !partner.role || !partner.message) {
    return Response.json({ error: "Please fill in every field." }, { status: 400 });
  }
  if (!EMAIL.test(partner.email)) {
    return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  if (!partner.consent) {
    return Response.json({ error: "Please tick the box so we can store your details." }, { status: 400 });
  }

  if (!emailConfigured()) {
    if (process.env.NODE_ENV === "production") {
      console.error("[partner] RESEND_API_KEY or PARTNER_INBOX is not set; enquiry not sent.");
      return Response.json({ error: "The form is not set up yet. Please try again later." }, { status: 503 });
    }
    console.log("[partner] Email not configured; enquiry logged only:", partner);
    return Response.json({ ok: true });
  }

  const subject = `Partner enquiry: ${partner.organisation} (${partner.role})`;
  const rows: [string, string][] = [
    ["Name", partner.name],
    ["Email", partner.email],
    ["Organisation or LGA", partner.organisation],
    ["Role", partner.role],
  ];
  const text = `${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${partner.message}\n\nReply to this email to answer ${partner.name}.`;
  const html = `<h2 style="font-family:Georgia,serif;color:#3f561f">New MamaLine partner enquiry</h2>
<table style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">${rows
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#6c665c">${k}</td><td style="padding:4px 0">${escapeHtml(v)}</td></tr>`)
    .join("")}</table>
<p style="font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap;border-left:3px solid #5c7a30;padding-left:12px">${escapeHtml(partner.message)}</p>
<p style="font-family:Arial,sans-serif;font-size:12px;color:#6c665c">Reply to this email to answer ${escapeHtml(partner.name)}.</p>`;

  try {
    await sendEmail({ to: process.env.PARTNER_INBOX!, replyTo: partner.email, subject, text, html });
  } catch (error) {
    console.error("[partner] Email failed:", error instanceof Error ? error.message : error);
    return Response.json({ error: "We could not send your message just now. Please try again later." }, { status: 502 });
  }

  return Response.json({ ok: true });
}
