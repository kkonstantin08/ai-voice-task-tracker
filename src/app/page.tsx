import Link from "next/link";
import { LanguageToggle } from "@/components/language-toggle";
import { getCurrentLocale } from "@/lib/i18n";

const labels = {
  en: {
    badge: "Course Project MVP",
    description:
      "Record voice notes, transcribe them with Mistral, extract structured tasks with AI, and get Telegram notifications instantly.",
    register: "Register",
    login: "Login",
    voiceToTask: "Voice to Task",
    voiceToTaskDescription: "Record audio in-browser and convert speech into structured tasks.",
    aiExtraction: "AI Extraction",
    aiExtractionDescription: "Use Mistral transcription + chat models with strict JSON validation.",
    telegramAlerts: "Telegram Alerts",
    telegramAlertsDescription:
      "Link Telegram via one-time code and receive task creation notifications.",
  },
  ru: {
    badge: "Курсовой MVP",
    description:
      "Записывайте голосовые заметки, расшифровывайте их через Mistral, получайте структурированные задачи и мгновенные уведомления в Telegram.",
    register: "Регистрация",
    login: "Войти",
    voiceToTask: "Голос в задачу",
    voiceToTaskDescription: "Запишите аудио в браузере и преобразуйте речь в структурированные задачи.",
    aiExtraction: "AI-извлечение",
    aiExtractionDescription: "Используйте Mistral для транскрипции и извлечения JSON-структуры.",
    telegramAlerts: "Уведомления Telegram",
    telegramAlertsDescription: "Привяжите Telegram кодом и получайте уведомления о новых задачах.",
  },
} as const;

export default async function Home() {
  const locale = await getCurrentLocale();
  const t = labels[locale];

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-100 via-white to-blue-50">
      <div className="mx-auto flex w-full max-w-5xl justify-end px-4 pt-4 sm:px-6 sm:pt-6">
        <LanguageToggle locale={locale} size="compact" />
      </div>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-10 sm:px-6 sm:py-16">
        <div className="max-w-3xl">
          <span className="inline-flex rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-600">
            {t.badge}
          </span>
          <h1 className="mt-6 text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl">
            AI Voice Task Tracker
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            {t.description}
          </p>
        </div>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/register"
            className="rounded-md bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700"
          >
            {t.register}
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100"
          >
            {t.login}
          </Link>
        </div>

        <section className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">{t.voiceToTask}</h2>
            <p className="mt-2 text-sm text-slate-600">
              {t.voiceToTaskDescription}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">{t.aiExtraction}</h2>
            <p className="mt-2 text-sm text-slate-600">
              {t.aiExtractionDescription}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">{t.telegramAlerts}</h2>
            <p className="mt-2 text-sm text-slate-600">
              {t.telegramAlertsDescription}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
