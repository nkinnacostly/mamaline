import { NextResponse, type NextRequest } from "next/server";
import { API_URL, SESSION_COOKIE } from "@/lib/server";

// Forwards the dashboard's requests to the API with the health worker's session token.
// Only dashboard routes and "who am I" pass through.
const ALLOWED = [/^dashboard\/(week|month|day|follow-ups|mothers)$/, /^dashboard\/mothers\/[0-9a-f-]{36}\/(birth|visits\/(anc-\d{1,2}|vx-[a-z0-9]{2,5})\/done)$/, /^dashboard\/(alerts|follow-ups)\/[0-9a-f-]{36}\/(contacted|done)$/, /^auth\/me$/];

async function forward(request: NextRequest, params: Promise<{ path: string[] }>) {
  const path = (await params).path.join("/");
  if (!ALLOWED.some((pattern) => pattern.test(path))) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: "Please sign in." }, { status: 401 });

  const res = await fetch(`${API_URL}/${path}${request.nextUrl.search}`, {
    method: request.method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: request.method === "POST" ? await request.text() : undefined,
    cache: "no-store",
  });
  const response = new NextResponse(res.status === 204 ? null : await res.text(), {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
  });
  // An expired or revoked session: drop the cookie so the next page load asks to sign in.
  if (res.status === 401) response.cookies.delete(SESSION_COOKIE);
  return response;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return forward(request, params);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return forward(request, params);
}
