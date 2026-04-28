import { cookies } from "next/headers";

export const LOCALE_COOKIE_NAME = "ai_voice_locale";

export type Locale = "en" | "ru";

export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "ru";
}

export async function getCurrentLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
