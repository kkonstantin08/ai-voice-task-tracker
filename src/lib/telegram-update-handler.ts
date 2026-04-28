import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";
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

function extractChatId(update: TelegramUpdate): string | null {
  const chatId = update.message?.chat?.id;
  if (chatId === undefined || chatId === null) {
    return null;
  }
  return String(chatId);
}

export async function handleTelegramUpdate(update: TelegramUpdate) {
  const text = update.message?.text?.trim() ?? "";
  const chatId = extractChatId(update);
  const username = update.message?.from?.username ?? null;

  if (!chatId || !text) {
    return { handled: false as const };
  }

  if (text.startsWith("/start")) {
    await sendTelegramMessage(chatId, "Hello! To connect your account, send: /link 123456");
    return { handled: true as const };
  }

  const linkMatch = text.match(/^\/link\s+(\d{6})$/);
  if (!linkMatch) {
    await sendTelegramMessage(
      chatId,
      "Unknown command. Use /link 123456 with your one-time code from Settings.",
    );
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
    await sendTelegramMessage(
      chatId,
      "Link code is invalid or expired. Generate a new code in app settings.",
    );
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

  await sendTelegramMessage(
    chatId,
    "Telegram linked successfully. You will receive task notifications.",
  );

  return { handled: true as const, linkedUserId: codeRecord.userId };
}
