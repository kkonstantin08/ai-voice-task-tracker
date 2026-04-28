import { getTelegramBotToken } from "@/lib/env";

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

export function taskCreatedMessage(title: string, dueDate: Date | null) {
  const due = dueDate ? `\nDue: ${dueDate.toISOString()}` : "\nDue: not set";
  return `✅ *New task created*\nTitle: ${title}${due}`;
}
