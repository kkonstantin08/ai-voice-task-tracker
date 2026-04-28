import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentLocale } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/server-auth";

export default async function LoginPage() {
  const locale = await getCurrentLocale();
  const user = await getCurrentUser();
  if (user) {
    redirect("/app");
  }

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,_hsl(220_30%_97%)_0%,_hsl(0_0%_100%)_45%,_hsl(210_30%_96%)_100%)]">
      <div className="mx-auto flex w-full max-w-5xl justify-end gap-2 px-4 pt-4 sm:px-6 sm:pt-6">
        <LanguageToggle locale={locale} size="compact" />
        <ThemeToggle size="compact" />
      </div>
      <div className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <AuthForm mode="login" locale={locale} />
      </div>
    </div>
  );
}
