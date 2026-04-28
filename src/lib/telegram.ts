import { getTelegramBotToken } from "@/lib/env";

export type TelegramUiLanguage = "en" | "ru";

export function normalizeTelegramUiLanguage(
  language: string | null | undefined,
): TelegramUiLanguage {
  return language === "ru" ? "ru" : "en";
}

export async function sendTelegramMessage(chatId: string, text: string) {
  const botToken = getTelegramBotToken();

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    }),
  });

  if (!response.ok) {
    const rawBody = await response.text();
    throw new Error(`Telegram sendMessage failed: ${response.status} ${rawBody}`);
  }

  return { ok: true as const };
}

export function taskCreatedMessage(
  title: string,
  dueDate: Date | null,
  language: TelegramUiLanguage = "en",
) {
  const dueLine =
    language === "ru"
      ? `\nСрок: ${dueDate ? dueDate.toISOString() : "не указан"}`
      : `\nDue: ${dueDate ? dueDate.toISOString() : "not set"}`;

  if (language === "ru") {
    return `✅ *Новая задача создана*\nНазвание: ${title}${dueLine}`;
  }

  return `✅ *New task created*\nTitle: ${title}${dueLine}`;
}
