import { ProtectedNav } from "@/components/protected-nav";
import { VoiceRecorder } from "@/components/voice-recorder";
import { getCurrentLocale } from "@/lib/i18n";
import { requireUser } from "@/lib/server-auth";

export default async function VoiceAppPage() {
  const locale = await getCurrentLocale();
  const user = await requireUser();

  return (
    <div className="min-h-screen bg-slate-100">
      <ProtectedNav email={user.email} locale={locale} />
      <main className="mx-auto w-full max-w-5xl px-6 py-8">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">
            {locale === "ru" ? "Создание задач голосом" : "Create Tasks with Voice"}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {locale === "ru"
              ? "Запишите голосовую заметку, обработайте ее с AI и получите структурированную задачу за секунды."
              : "Record your voice note, process it with AI, and get a structured task in seconds."}
          </p>
        </div>
        <VoiceRecorder locale={locale} />
      </main>
    </div>
  );
}
