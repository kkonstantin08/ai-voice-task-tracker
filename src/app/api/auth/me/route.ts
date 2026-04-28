import { NextResponse } from "next/server";
import { getSessionTokenFromCookies, validateSessionToken } from "@/lib/auth";

export async function GET() {
  try {
    const token = await getSessionTokenFromCookies();
    const session = await validateSessionToken(token);
    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
      },
    });
  } catch (error) {
    console.error("GET /api/auth/me failed", error);
    return NextResponse.json({ error: "Unable to load user." }, { status: 500 });
  }
}
