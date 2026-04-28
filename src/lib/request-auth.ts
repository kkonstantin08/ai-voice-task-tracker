import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { validateSessionToken } from "@/lib/auth";

export async function getRequestUser(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await validateSessionToken(token);
  return session?.user ?? null;
}
