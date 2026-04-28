import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const botToken = process.env.TELEGRAM_BOT_TOKEN;
if (!botToken) {
  console.error("Missing TELEGRAM_BOT_TOKEN. Poller cannot start.");
  process.exit(1);
}

const pollTimeoutSeconds = Number.parseInt(
  process.env.TELEGRAM_POLL_TIMEOUT_SECONDS ?? "50",
  10,
);
const retryDelayMs = Number.parseInt(process.env.TELEGRAM_POLL_RETRY_DELAY_MS ?? "3000", 10);
const deleteWebhookOnStart =
  (process.env.TELEGRAM_POLLING_DELETE_WEBHOOK ?? "true").toLowerCase() === "true";
const dropPendingUpdates =
  (process.env.TELEGRAM_POLLING_DROP_PENDING_UPDATES ?? "false").toLowerCase() === "true";

const telegramApiBase = `https://api.telegram.org/bot${botToken}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function telegramRequest(method, payload) {
  const response = await fetch(`${telegramApiBase}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram ${method} failed: ${response.status} ${body}`);
  }

  const data = await response.json();
  if (!data.ok) {
    throw new Error(`Telegram ${method} returned ok=false: ${JSON.stringify(data)}`);
  }

  return data.result;
}

async function sendTelegramMessage(chatId, text) {
  await telegramRequest("sendMessage", {
    chat_id: chatId,
    text,
  });
}

async function processTelegramUpdate(update) {
  const text = update?.message?.text?.trim() ?? "";
  const chatIdRaw = update?.message?.chat?.id;
  const username = update?.message?.from?.username ?? null;
  const chatId = chatIdRaw === undefined || chatIdRaw === null ? null : String(chatIdRaw);

  if (!chatId || !text) {
    return;
  }

  if (text.startsWith("/start")) {
    await sendTelegramMessage(chatId, "Hello! To connect your account, send: /link 123456");
    return;
  }

  const linkMatch = text.match(/^\/link\s+(\d{6})$/);
  if (!linkMatch) {
    await sendTelegramMessage(
      chatId,
      "Unknown command. Use /link 123456 with your one-time code from Settings.",
    );
    return;
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
    return;
  }

  await prisma.$transaction(async (tx) => {
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

    await tx.analyticsEvent.create({
      data: {
        userId: codeRecord.userId,
        eventName: "telegram_linked",
        metadata: { telegramUsername: username ?? "" },
      },
    });
  });

  await sendTelegramMessage(
    chatId,
    "Telegram linked successfully. You will receive task notifications.",
  );
}

async function ensureLongPollingMode() {
  if (!deleteWebhookOnStart) {
    return;
  }

  await telegramRequest("deleteWebhook", {
    drop_pending_updates: dropPendingUpdates,
  });
  console.log("Webhook removed for long polling mode.");
}

async function run() {
  console.log("Starting Telegram long polling worker...");
  await ensureLongPollingMode();

  let offset = undefined;

  while (true) {
    try {
      const updates = await telegramRequest("getUpdates", {
        timeout: pollTimeoutSeconds,
        offset,
      });

      for (const update of updates) {
        try {
          await processTelegramUpdate(update);
        } catch (error) {
          console.error("Failed to process update", update?.update_id, error);
        }

        if (typeof update?.update_id === "number") {
          offset = update.update_id + 1;
        }
      }
    } catch (error) {
      console.error("Polling request failed", error);
      await sleep(retryDelayMs);
    }
  }
}

run()
  .catch(async (error) => {
    console.error("Telegram polling worker crashed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => null);
  });
