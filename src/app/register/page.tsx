import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { LanguageToggle } from "@/components/language-toggle";
import { getCurrentLocale } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/server-auth";

export default async function RegisterPage() {
  const locale = await getCurrentLocale();
  const user = await getCurrentUser();
  if (user) {
    redirect("/app");
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <div className="mx-auto flex w-full max-w-5xl justify-end px-4 pt-4 sm:px-6 sm:pt-6">
        <LanguageToggle locale={locale} size="compact" />
      </div>
      <div className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <AuthForm mode="register" locale={locale} />
      </div>
    </div>
  );
}
