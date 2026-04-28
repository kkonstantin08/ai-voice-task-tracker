import { ProtectedNav } from "@/components/protected-nav";
import { TelegramLinkPanel } from "@/components/telegram-link-panel";
import { getCurrentLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server-auth";

export default async function SettingsPage() {
  const locale = await getCurrentLocale();
  const user = await requireUser();
  const connection = await prisma.telegramConnection.findUnique({
    where: { userId: user.id },
  });

  return (
    <div className="min-h-screen bg-slate-100">
      <ProtectedNav email={user.email} locale={locale} />
      <main className="mx-auto w-full max-w-5xl px-6 py-8">
        <h1 className="text-2xl font-semibold text-slate-900">
          {locale === "ru" ? "Настройки" : "Settings"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {locale === "ru"
            ? "Управляйте интеграцией Telegram и уведомлениями о задачах."
            : "Manage Telegram integration and task notification settings."}
        </p>

        <div className="mt-6">
          <TelegramLinkPanel
            locale={locale}
            initialConnection={
              connection
                ? {
                    chatId: connection.chatId,
                    telegramUsername: connection.telegramUsername,
                    linkedAt: connection.createdAt.toISOString(),
                  }
                : null
            }
          />
        </div>
      </main>
    </div>
  );
}
