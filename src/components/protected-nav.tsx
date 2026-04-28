import Link from "next/link";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/logout-button";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n";

type ProtectedNavProps = {
  email: string;
  locale: Locale;
};

const labels = {
  en: {
    app: "Voice Tasks",
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
    <header className="border-b border-border/70 bg-background/95 backdrop-blur">
      <div className="mx-auto w-full max-w-6xl px-4 py-3 sm:px-6 sm:py-4">
        <Card className="rounded-2xl py-3">
          <div className="flex flex-col gap-3 px-4 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <Link href="/app" className="truncate text-base font-semibold text-foreground sm:text-lg">
                AI Voice Task Tracker
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                <LanguageToggle locale={locale} size="compact" className="shrink-0" />
                <ThemeToggle size="compact" />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 md:flex-nowrap md:justify-end md:gap-3">
              <nav className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 sm:gap-2 md:flex-none">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-xs sm:text-sm")}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <span className="hidden max-w-40 truncate text-sm text-muted-foreground lg:inline">{email}</span>
                <LogoutButton
                  label={t.logout}
                  loadingLabel={t.loggingOut}
                  className="h-7 px-2.5 text-xs sm:h-8 sm:px-3 sm:text-sm"
                />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </header>
  );
}
