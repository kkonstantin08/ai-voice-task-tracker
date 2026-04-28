import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { validateSessionToken } from "@/lib/auth";

const protectedPrefixes = ["/app", "/dashboard", "/settings", "/api/voice", "/api/telegram"];
const publicAuthPages = ["/login", "/register"];
const publicApiPaths = ["/api/telegram/webhook"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const hasValidSession = Boolean(await validateSessionToken(token));

  if (publicApiPaths.includes(pathname)) {
    return NextResponse.next();
  }

  if (publicAuthPages.includes(pathname) && hasValidSession) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (isProtected && !hasValidSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/app/:path*",
    "/dashboard/:path*",
    "/settings/:path*",
    "/api/voice/:path*",
    "/api/telegram/:path*",
    "/login",
    "/register",
  ],
};
