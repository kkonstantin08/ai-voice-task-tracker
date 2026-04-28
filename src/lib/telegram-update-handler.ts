import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  normalizeTelegramUiLanguage,
  sendTelegramMessage,
  type TelegramUiLanguage,
} from "@/lib/telegram";
import { trackEvent } from "@/lib/analytics";

export type TelegramUpdate = {
  update_id?: number;
  message?: {
    text?: string;
    chat?: {
      id?: number | string;
    };
    from?: {
      username?: string;
    };
  };
};

const text = {
  en: {
    start: "Hello! To connect your account, send: /link 123456\nTo switch language: /lang ru or /lang en",
    unknown: "Unknown command. Use /link 123456 with your one-time code from Settings. Language: /lang ru or /lang en",
    invalidOrExpired: "Link code is invalid or expired. Generate a new code in app settings.",
    linked: "Telegram linked successfully. You will receive task notifications. Language command: /lang ru or /lang en",
    linkFirst: "Link your account first with /link 123456, then choose language: /lang ru or /lang en",
    languageStatus: "Current bot language: EN\nUse /lang ru or /lang en",
    languageChangedToEn: "Bot language changed to EN.",
  },
  ru: {
    start: "Привет! Чтобы подключить аккаунт, отправьте: /link 123456\nЧтобы сменить язык: /lang ru или /lang en",
    unknown: "Неизвестная команда. Используйте /link 123456 с одноразовым кодом из Settings. Язык: /lang ru или /lang en",
    invalidOrExpired: "Код привязки неверный или истек. Сгенерируйте новый код в настройках приложения.",
    linked: "Telegram успешно подключен. Вы будете получать уведомления о задачах. Смена языка: /lang ru или /lang en",
    linkFirst: "Сначала привяжите аккаунт через /link 123456, затем выберите язык: /lang ru или /lang en",
    languageStatus: "Текущий язык бота: RU\nИспользуйте /lang ru или /lang en",
    languageChangedToEn: "Язык бота изменен на EN.",
  },
} as const;

function extractChatId(update: TelegramUpdate): string | null {
  const chatId = update.message?.chat?.id;
  if (chatId === undefined || chatId === null) {
    return null;
  }
  return String(chatId);
}

function parseLanguageCommand(input: string): TelegramUiLanguage | null {
  const match = input.match(/^\/lang(?:@\w+)?(?:\s+(ru|en))?$/i);
  if (!match) {
    return null;
  }
  return normalizeTelegramUiLanguage(match[1]?.toLowerCase() ?? null);
}

function isLanguageCommand(input: string): boolean {
  return /^\/lang(?:@\w+)?(?:\s+\w+)?$/i.test(input);
}

export async function handleTelegramUpdate(update: TelegramUpdate) {
  const rawText = update.message?.text ?? "";
  const commandText = rawText.trim();
  const chatId = extractChatId(update);
  const username = update.message?.from?.username ?? null;

  if (!chatId || !commandText) {
    return { handled: false as const };
  }

  const existingConnection = await prisma.telegramConnection.findFirst({
    where: { chatId },
    select: { userId: true, uiLanguage: true },
  });
  const currentLanguage = normalizeTelegramUiLanguage(existingConnection?.uiLanguage);
  const t = text[currentLanguage];

  if (commandText.startsWith("/start")) {
    await sendTelegramMessage(chatId, t.start);
    return { handled: true as const };
  }

  if (isLanguageCommand(commandText)) {
    if (!existingConnection) {
      await sendTelegramMessage(chatId, t.linkFirst);
      return { handled: true as const };
    }

    const requestedLanguage = parseLanguageCommand(commandText);
    const hasArgument = /^\/lang(?:@\w+)?\s+/i.test(commandText);
    if (!hasArgument) {
      await sendTelegramMessage(chatId, currentLanguage === "ru" ? text.ru.languageStatus : text.en.languageStatus);
      return { handled: true as const };
    }

    if (!requestedLanguage) {
      await sendTelegramMessage(chatId, t.unknown);
      return { handled: true as const };
    }

    await prisma.telegramConnection.update({
      where: { userId: existingConnection.userId },
      data: { uiLanguage: requestedLanguage },
    });

    await trackEvent(existingConnection.userId, "telegram_language_changed", {
      language: requestedLanguage,
    });

    if (requestedLanguage === "ru") {
      await sendTelegramMessage(chatId, text.ru.languageStatus);
    } else {
      await sendTelegramMessage(chatId, text.en.languageChangedToEn);
    }

    return { handled: true as const };
  }

  const linkMatch = commandText.match(/^\/link\s+(\d{6})$/);
  if (!linkMatch) {
    await sendTelegramMessage(chatId, t.unknown);
    return { handled: true as const };
  }

  const code = linkMatch[1];
  const codeRecord = await prisma.telegramLinkCode.findFirst({
    where: {
      code,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!codeRecord) {
    await sendTelegramMessage(chatId, t.invalidOrExpired);
    return { handled: true as const };
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.telegramConnection.upsert({
      where: { userId: codeRecord.userId },
      update: {
        chatId,
        telegramUsername: username,
      },
      create: {
        userId: codeRecord.userId,
        chatId,
        telegramUsername: username,
        uiLanguage: "en",
      },
    });

    await tx.telegramLinkCode.update({
      where: { id: codeRecord.id },
      data: { usedAt: new Date() },
    });

    await tx.telegramLinkCode.updateMany({
      where: {
        userId: codeRecord.userId,
        usedAt: null,
        id: { not: codeRecord.id },
      },
      data: { usedAt: new Date() },
    });
  });

  await trackEvent(codeRecord.userId, "telegram_linked", {
    telegramUsername: username ?? "",
  });

  await sendTelegramMessage(chatId, text.en.linked);

  return { handled: true as const, linkedUserId: codeRecord.userId };
}
