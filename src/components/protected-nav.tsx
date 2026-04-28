import Link from "next/link";
import { LanguageToggle } from "@/components/language-toggle";
import { LogoutButton } from "@/components/logout-button";
import type { Locale } from "@/lib/i18n";

type ProtectedNavProps = {
  email: string;
  locale: Locale;
};

const labels = {
  en: {
    app: "Voice App",
    dashboard: "Dashboard",
    settings: "Settings",
    logout: "Logout",
    loggingOut: "Logging out...",
  },
  ru: {
    app: "Голосовые задачи",
    dashboard: "Дашборд",
    settings: "Настройки",
    logout: "Выйти",
    loggingOut: "Выходим...",
  },
} as const;

export function ProtectedNav({ email, locale }: ProtectedNavProps) {
  const t = labels[locale];
  const links = [
    { href: "/app", label: t.app },
    { href: "/dashboard", label: t.dashboard },
    { href: "/settings", label: t.settings },
  ];

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto w-full max-w-5xl px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <Link href="/app" className="min-w-0 truncate text-base font-semibold text-slate-900 sm:text-lg">
              AI Voice Task Tracker
            </Link>
            <LanguageToggle locale={locale} size="compact" className="shrink-0" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 md:flex-nowrap md:justify-end md:gap-3">
            <nav className="flex min-w-0 flex-1 flex-wrap items-center gap-1 sm:gap-2 md:flex-none md:gap-3">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="whitespace-nowrap rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900 sm:text-sm"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <span className="hidden max-w-40 truncate text-sm text-slate-500 lg:inline">{email}</span>
              <LogoutButton
                label={t.logout}
                loadingLabel={t.loggingOut}
                className="px-2.5 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
