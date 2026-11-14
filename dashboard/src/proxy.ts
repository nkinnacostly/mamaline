import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: no session cookie means "go and sign in". The API still checks
// the token on every request, so a stale cookie cannot see anything.
export function proxy(request: NextRequest) {
  if (!request.cookies.has("ml_session")) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!sign-in|api|_next|favicon.ico).*)"],
};
