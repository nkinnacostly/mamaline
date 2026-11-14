import { NextResponse, type NextRequest } from "next/server";
import { API_URL, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/server";

// Signs a health worker in through the API and keeps the session token in an
// httpOnly cookie, so it is never readable by JavaScript in the browser.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const res = await fetch(`${API_URL}/auth/sign-in`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": request.headers.get("user-agent") ?? "dashboard" },
    body: JSON.stringify({ phone: String(body.phone ?? ""), pin: String(body.pin ?? "") }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json({ message: data.message ?? "Sign-in failed. Please try again." }, { status: res.status });

  const response = NextResponse.json({ healthWorker: data.healthWorker });
  response.cookies.set(SESSION_COOKIE, data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}

export async function DELETE(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    await fetch(`${API_URL}/auth/sign-out`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => undefined);
  }
  const response = new NextResponse(null, { status: 204 });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
