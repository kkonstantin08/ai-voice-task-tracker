import { NextResponse } from "next/server";
import { createSession, hashPassword, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation";
import { trackEvent } from "@/lib/analytics";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid email or password format." },
        { status: 400 },
      );
    }

    const email = parsed.data.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email is already registered." }, { status: 409 });
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
      },
    });

    const { token, expiresAt } = await createSession(user.id);
    await trackEvent(user.id, "register_success", { emailDomain: email.split("@")[1] ?? "" });

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
    });
    setSessionCookie(response, token, expiresAt);
    return response;
  } catch (error) {
    console.error("POST /api/auth/register failed", error);
    return NextResponse.json({ error: "Unable to register right now." }, { status: 500 });
  }
}
