import { getTelegramBotToken } from "@/lib/env";

export type TelegramUiLanguage = "en" | "ru";

export type TelegramInlineKeyboardButton = {
  text: string;
  callback_data: string;
};

export type TelegramInlineKeyboardMarkup = {
  inline_keyboard: TelegramInlineKeyboardButton[][];
};

type TelegramParseMode = "Markdown" | "MarkdownV2" | "HTML";

export type TelegramMessageOptions = {
  parseMode?: TelegramParseMode;
  replyMarkup?: TelegramInlineKeyboardMarkup;
};

function toApiMessageOptions(options?: TelegramMessageOptions) {
  const payload: {
    parse_mode?: TelegramParseMode;
    reply_markup?: TelegramInlineKeyboardMarkup;
  } = {};

  if (options?.parseMode) {
    payload.parse_mode = options.parseMode;
  }

  if (options?.replyMarkup) {
    payload.reply_markup = options.replyMarkup;
  }

  return payload;
}

async function telegramRequest<T>(method: string, payload: Record<string, unknown>): Promise<T> {
  const botToken = getTelegramBotToken();
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const rawBody = await response.text();
    throw new Error(`Telegram ${method} failed: ${response.status} ${rawBody}`);
  }

  const data = (await response.json()) as { ok: boolean; result?: T; description?: string };
  if (!data.ok) {
    throw new Error(`Telegram ${method} returned ok=false: ${data.description ?? "unknown"}`);
  }

  return data.result as T;
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  options?: TelegramMessageOptions,
) {
  const result = await telegramRequest("sendMessage", {
    chat_id: chatId,
    text,
    ...toApiMessageOptions(options),
  });

  return { ok: true as const, result };
}

export async function editTelegramMessage(
  chatId: string,
  messageId: number,
  text: string,
  options?: TelegramMessageOptions,
) {
  const result = await telegramRequest("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    ...toApiMessageOptions(options),
  });

  return { ok: true as const, result };
}

export async function answerTelegramCallback(callbackQueryId: string, text?: string) {
  const payload: Record<string, unknown> = {
    callback_query_id: callbackQueryId,
  };

  if (text) {
    payload.text = text;
  }

  await telegramRequest("answerCallbackQuery", payload);
  return { ok: true as const };
}

export function normalizeTelegramUiLanguage(
  language: string | null | undefined,
): TelegramUiLanguage {
  return language === "ru" ? "ru" : "en";
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
