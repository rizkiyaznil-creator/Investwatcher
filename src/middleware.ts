import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Lightweight access gate. Active only when Google auth is configured
 * (AUTH_GOOGLE_ID present) — otherwise the app stays open so it isn't bricked
 * before setup is finished. The allowlist itself is enforced server-side in the
 * NextAuth `signIn` callback (a non-allowed email never gets a session cookie).
 */
export function middleware(req: NextRequest) {
  if (!process.env.AUTH_GOOGLE_ID) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname === "/login" || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const hasSession =
    req.cookies.has("authjs.session-token") ||
    req.cookies.has("__Secure-authjs.session-token");

  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?callbackUrl=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Protect everything except static assets and PWA files.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon-192.png|icon-512.png|apple-touch-icon.png|manifest.webmanifest|sw.js).*)",
  ],
};
