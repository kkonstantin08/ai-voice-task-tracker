"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";

type LanguageToggleProps = {
  locale: Locale;
  size?: "default" | "compact";
  className?: string;
};

export function LanguageToggle({ locale, size = "default", className }: LanguageToggleProps) {
  const router = useRouter();
  const [pending, setPending] = useState<Locale | null>(null);
  const compact = size === "compact";

  const containerClass = compact
    ? "inline-flex items-center rounded-full border border-slate-300 bg-white p-0.5 text-[11px] font-semibold"
    : "inline-flex items-center rounded-full border border-slate-300 bg-white p-1 text-xs font-semibold";

  const buttonClass = compact ? "rounded-full px-2 py-0.5 transition" : "rounded-full px-2.5 py-1 transition";

  async function switchLocale(nextLocale: Locale) {
    if (nextLocale === locale || pending) {
      return;
    }

    setPending(nextLocale);
    try {
      await fetch("/api/locale", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ locale: nextLocale }),
      });
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  return (
    <div className={`${containerClass} ${className ?? ""}`.trim()}>
      <button
        type="button"
        onClick={() => void switchLocale("ru")}
        disabled={Boolean(pending)}
        className={`${buttonClass} ${
          locale === "ru" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
        }`}
      >
        RU
      </button>
      <button
        type="button"
        onClick={() => void switchLocale("en")}
        disabled={Boolean(pending)}
        className={`${buttonClass} ${
          locale === "en" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
        }`}
      >
        EN
      </button>
    </div>
  );
}
