import { NextResponse } from "next/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, isLocale } from "@/lib/i18n";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { locale?: string };
    const locale = isLocale(body?.locale) ? body.locale : DEFAULT_LOCALE;

    const response = NextResponse.json({ locale });
    response.cookies.set(LOCALE_COOKIE_NAME, locale, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }
}
