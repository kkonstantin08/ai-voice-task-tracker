"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";

type LanguageToggleProps = {
  locale: Locale;
};

export function LanguageToggle({ locale }: LanguageToggleProps) {
  const router = useRouter();
  const [pending, setPending] = useState<Locale | null>(null);

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
    <div className="inline-flex items-center rounded-full border border-slate-300 bg-white p-1 text-xs font-semibold">
      <button
        type="button"
        onClick={() => void switchLocale("ru")}
        disabled={Boolean(pending)}
        className={`rounded-full px-2.5 py-1 transition ${
          locale === "ru" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
        }`}
      >
        RU
      </button>
      <button
        type="button"
        onClick={() => void switchLocale("en")}
        disabled={Boolean(pending)}
        className={`rounded-full px-2.5 py-1 transition ${
          locale === "en" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
        }`}
      >
        EN
      </button>
    </div>
  );
}
