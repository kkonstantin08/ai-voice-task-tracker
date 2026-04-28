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
    <div className="relative flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
      <div className="absolute right-6 top-6">
        <LanguageToggle locale={locale} />
      </div>
      <AuthForm mode="register" locale={locale} />
    </div>
  );
}
