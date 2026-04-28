import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, revokeSessionToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    await revokeSessionToken(token);

    const response = NextResponse.json({ ok: true });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    console.error("POST /api/auth/logout failed", error);
    return NextResponse.json({ error: "Unable to log out right now." }, { status: 500 });
  }
}
