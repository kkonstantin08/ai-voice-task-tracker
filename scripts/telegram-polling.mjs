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

const text = {
  en: {
    start:
      "Hello! To connect your account, send: /link 123456\nTo switch language: /lang ru or /lang en\nTo view tasks: /tasks\nTo complete task: /done <task_id>",
    unknown:
      "Unknown command. Use /link 123456, /lang ru|en, /tasks, /done <task_id>.",
    invalidOrExpired: "Link code is invalid or expired. Generate a new code in app settings.",
    linked:
      "Telegram linked successfully. You will receive task notifications.\nCommands: /lang ru|en, /tasks, /done <task_id>",
    linkFirst:
      "Link your account first with /link 123456, then use /lang ru|en, /tasks, /done <task_id>.",
    languageStatus: "Current bot language: EN\nUse /lang ru or /lang en",
    languageChangedToEn: "Bot language changed to EN.",
    languageChangedToRu: "Язык бота изменен на RU.",
    tasksHeader: "Open voice tasks:",
    tasksEmpty: "No open voice-created tasks.",
    doneUsage: "Usage: /done <task_id>. Use /tasks to get IDs.",
    doneNotFound: "Task not found for this account.",
    doneAmbiguous: "Found several tasks by this prefix. Use full task ID from /tasks.",
    doneAlready: "Task is already completed.",
    doneSuccess: "Task marked as completed.",
  },
  ru: {
    start:
      "Привет! Чтобы подключить аккаунт, отправьте: /link 123456\nЧтобы сменить язык: /lang ru или /lang en\nСписок задач: /tasks\nВыполнить задачу: /done <task_id>",
    unknown:
      "Неизвестная команда. Используйте /link 123456, /lang ru|en, /tasks, /done <task_id>.",
    invalidOrExpired:
      "Код привязки неверный или истек. Сгенерируйте новый код в настройках приложения.",
    linked:
      "Telegram успешно подключен. Вы будете получать уведомления о задачах.\nКоманды: /lang ru|en, /tasks, /done <task_id>",
    linkFirst:
      "Сначала привяжите аккаунт через /link 123456, затем используйте /lang ru|en, /tasks, /done <task_id>.",
    languageStatus: "Текущий язык бота: RU\nИспользуйте /lang ru или /lang en",
    languageChangedToEn: "Bot language changed to EN.",
    languageChangedToRu: "Язык бота изменен на RU.",
    tasksHeader: "Открытые голосовые задачи:",
    tasksEmpty: "Нет открытых задач, созданных голосом.",
    doneUsage: "Использование: /done <task_id>. Смотрите ID через /tasks.",
    doneNotFound: "Задача для этого аккаунта не найдена.",
    doneAmbiguous:
      "По этому префиксу найдено несколько задач. Используйте полный task_id из /tasks.",
    doneAlready: "Задача уже выполнена.",
    doneSuccess: "Задача отмечена как выполненная.",
  },
};

function normalizeLanguage(language) {
  return language === "ru" ? "ru" : "en";
}

function parseLanguageCommand(input) {
  const match = input.match(/^\/lang(?:@\w+)?(?:\s+(ru|en))?$/i);
  if (!match) {
    return null;
  }
  return normalizeLanguage(match[1]?.toLowerCase());
}

function isLanguageCommand(input) {
  return /^\/lang(?:@\w+)?(?:\s+\w+)?$/i.test(input);
}

function formatTaskStatus(status, language) {
  if (language === "ru") {
    if (status === "done") return "Выполнено";
    if (status === "in_progress") return "В процессе";
    return "К выполнению";
  }
  if (status === "done") return "Done";
  if (status === "in_progress") return "In progress";
  return "To do";
}

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

async function sendTelegramMessage(chatId, messageText) {
  await telegramRequest("sendMessage", {
    chat_id: chatId,
    text: messageText,
  });
}

async function getOpenVoiceTasks(userId) {
  return prisma.task.findMany({
    where: {
      userId,
      voiceInputId: { not: null },
      status: { in: ["todo", "in_progress"] },
    },
    orderBy: { createdAt: "desc" },
    take: 15,
    select: {
      id: true,
      title: true,
      status: true,
    },
  });
}

async function handleTasksCommand(chatId, userId, language) {
  const t = text[language];
  const tasks = await getOpenVoiceTasks(userId);
  if (tasks.length === 0) {
    await sendTelegramMessage(chatId, t.tasksEmpty);
    return;
  }

  const lines = tasks.map((task) => {
    const safeTitle = task.title.slice(0, 80);
    const status = formatTaskStatus(task.status, language);
    return `• ${task.id} — ${safeTitle} (${status})`;
  });

  await sendTelegramMessage(chatId, `${t.tasksHeader}\n${lines.join("\n")}`);
}

async function handleDoneCommand(chatId, userId, commandText, language) {
  const t = text[language];
  const match = commandText.match(/^\/done(?:@\w+)?\s+([a-zA-Z0-9_-]{4,})$/);
  if (!match) {
    await sendTelegramMessage(chatId, t.doneUsage);
    return;
  }

  const taskRef = match[1];
  const matches = await prisma.task.findMany({
    where: {
      userId,
      voiceInputId: { not: null },
      OR: [{ id: taskRef }, { id: { startsWith: taskRef } }],
    },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: {
      id: true,
      status: true,
    },
  });

  if (matches.length === 0) {
    await sendTelegramMessage(chatId, t.doneNotFound);
    return;
  }

  if (matches.length > 1) {
    await sendTelegramMessage(chatId, t.doneAmbiguous);
    return;
  }

  const task = matches[0];
  if (task.status === "done") {
    await sendTelegramMessage(chatId, `${t.doneAlready}\n${task.id}`);
    return;
  }

  await prisma.task.update({
    where: { id: task.id },
    data: { status: "done" },
  });

  await prisma.analyticsEvent.create({
    data: {
      userId,
      eventName: "task_completed_from_telegram",
      metadata: { taskId: task.id },
    },
  });

  await sendTelegramMessage(chatId, `${t.doneSuccess}\n${task.id}`);
}

async function processTelegramUpdate(update) {
  const commandText = update?.message?.text?.trim() ?? "";
  const chatIdRaw = update?.message?.chat?.id;
  const username = update?.message?.from?.username ?? null;
  const chatId = chatIdRaw === undefined || chatIdRaw === null ? null : String(chatIdRaw);

  if (!chatId || !commandText) {
    return;
  }

  const existingConnection = await prisma.telegramConnection.findFirst({
    where: { chatId },
    select: { userId: true, uiLanguage: true },
  });
  const currentLanguage = normalizeLanguage(existingConnection?.uiLanguage);
  const t = text[currentLanguage];

  if (commandText.startsWith("/start")) {
    await sendTelegramMessage(chatId, t.start);
    return;
  }

  if (isLanguageCommand(commandText)) {
    if (!existingConnection) {
      await sendTelegramMessage(chatId, t.linkFirst);
      return;
    }

    const requestedLanguage = parseLanguageCommand(commandText);
    const hasArgument = /^\/lang(?:@\w+)?\s+/i.test(commandText);
    if (!hasArgument) {
      await sendTelegramMessage(
        chatId,
        currentLanguage === "ru" ? text.ru.languageStatus : text.en.languageStatus,
      );
      return;
    }

    if (!requestedLanguage) {
      await sendTelegramMessage(chatId, t.unknown);
      return;
    }

    await prisma.telegramConnection.update({
      where: { userId: existingConnection.userId },
      data: { uiLanguage: requestedLanguage },
    });

    await prisma.analyticsEvent.create({
      data: {
        userId: existingConnection.userId,
        eventName: "telegram_language_changed",
        metadata: { language: requestedLanguage },
      },
    });

    await sendTelegramMessage(
      chatId,
      requestedLanguage === "ru" ? text.ru.languageChangedToRu : text.en.languageChangedToEn,
    );

    return;
  }

  if (commandText.match(/^\/tasks(?:@\w+)?$/i)) {
    if (!existingConnection) {
      await sendTelegramMessage(chatId, t.linkFirst);
      return;
    }
    await handleTasksCommand(chatId, existingConnection.userId, currentLanguage);
    return;
  }

  if (commandText.match(/^\/done(?:@\w+)?/i)) {
    if (!existingConnection) {
      await sendTelegramMessage(chatId, t.linkFirst);
      return;
    }
    await handleDoneCommand(chatId, existingConnection.userId, commandText, currentLanguage);
    return;
  }

  const linkMatch = commandText.match(/^\/link\s+(\d{6})$/);
  if (!linkMatch) {
    await sendTelegramMessage(chatId, t.unknown);
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
    await sendTelegramMessage(chatId, t.invalidOrExpired);
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

    await tx.analyticsEvent.create({
      data: {
        userId: codeRecord.userId,
        eventName: "telegram_linked",
        metadata: { telegramUsername: username ?? "" },
      },
    });
  });

  await sendTelegramMessage(chatId, text.en.linked);
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
