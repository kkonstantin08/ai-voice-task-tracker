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
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/app" className="text-lg font-semibold text-slate-900">
            AI Voice Task Tracker
          </Link>
          <nav className="flex items-center gap-3">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <LanguageToggle locale={locale} />
          <span className="hidden text-sm text-slate-500 sm:inline">{email}</span>
          <LogoutButton label={t.logout} loadingLabel={t.loggingOut} />
        </div>
      </div>
    </header>
  );
}
