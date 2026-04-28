import { redirect } from "next/navigation";
import { getSessionTokenFromCookies, validateSessionToken } from "@/lib/auth";

export async function getCurrentUser() {
  const token = await getSessionTokenFromCookies();
  const session = await validateSessionToken(token);
  return session?.user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return user;
}
