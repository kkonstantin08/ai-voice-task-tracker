import Link from "next/link";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCurrentLocale } from "@/lib/i18n";

const labels = {
  en: {
    productTag: "Voice AI Productivity",
    heading: "AI Voice Task Tracker",
    description:
      "Record voice notes, transcribe them with Mistral, extract structured tasks with AI, and get Telegram notifications instantly.",
    register: "Create account",
    login: "Sign in",
    voiceToTask: "Voice to Task",
    voiceToTaskDescription:
      "Record audio in-browser and convert speech into structured tasks.",
    aiExtraction: "AI Extraction",
    aiExtractionDescription:
      "Use Mistral transcription and chat models with strict JSON validation.",
    telegramAlerts: "Telegram Alerts",
    telegramAlertsDescription:
      "Link Telegram via one-time code and receive task creation notifications.",
  },
  ru: {
    productTag: "Voice AI Productivity",
    heading: "AI Voice Task Tracker",
    description:
      "Записывайте голосовые заметки, расшифровывайте их через LLM, получайте структурированные задачи и мгновенные уведомления в Telegram.",
    register: "Создать аккаунт",
    login: "Войти",
    voiceToTask: "Голос в задачу",
    voiceToTaskDescription:
      "Запишите аудио в браузере и преобразуйте речь в структурированные задачи.",
    aiExtraction: "AI-извлечение",
    aiExtractionDescription:
      "Используйте Mistral для транскрипции и извлечения JSON-структуры.",
    telegramAlerts: "Уведомления Telegram",
    telegramAlertsDescription:
      "Привяжите Telegram кодом и получайте уведомления о новых задачах.",
  },
} as const;

export default async function Home() {
  const locale = await getCurrentLocale();
  const t = labels[locale];

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,_hsl(220_30%_97%)_0%,_hsl(0_0%_100%)_45%,_hsl(210_30%_96%)_100%)]">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 pt-4 sm:px-6 sm:pt-6">
        <span className="text-sm font-medium text-muted-foreground">AI Voice Task Tracker</span>
        <div className="flex items-center gap-2">
          <LanguageToggle locale={locale} size="compact" />
          <ThemeToggle size="compact" />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-10 sm:px-6 sm:py-16">
        <Card className="border-0 bg-transparent shadow-none ring-0">
          <CardHeader className="px-0">
            <Badge variant="outline" className="w-fit">
              {t.productTag}
            </Badge>
            <CardTitle className="pt-4 text-4xl font-semibold tracking-tight sm:text-6xl">
              {t.heading}
            </CardTitle>
            <CardDescription className="max-w-2xl pt-2 text-base sm:text-lg">
              {t.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <div className="mt-2 flex flex-wrap gap-3">
              <Link href="/register" className={cn(buttonVariants({ size: "lg" }))}>
                {t.register}
              </Link>
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
              >
                {t.login}
              </Link>
            </div>
          </CardContent>
        </Card>

        <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>{t.voiceToTask}</CardTitle>
              <CardDescription>{t.voiceToTaskDescription}</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t.aiExtraction}</CardTitle>
              <CardDescription>{t.aiExtractionDescription}</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t.telegramAlerts}</CardTitle>
              <CardDescription>{t.telegramAlertsDescription}</CardDescription>
            </CardHeader>
          </Card>
        </section>
      </main>
    </div>
  );
}
