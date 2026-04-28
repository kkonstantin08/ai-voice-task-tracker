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
    start:
      "Hello! To connect your account, send: /link 123456\nTo switch language: /lang ru or /lang en\nTo view tasks: /tasks\nTo complete task: /done <task_id>\nTo undo completion: /undo <task_id>",
    unknown:
      "Unknown command. Use /link 123456, /lang ru|en, /tasks, /done <task_id>, /undo <task_id>.",
    invalidOrExpired: "Link code is invalid or expired. Generate a new code in app settings.",
    linked:
      "Telegram linked successfully. You will receive task notifications.\nCommands: /lang ru|en, /tasks, /done <task_id>, /undo <task_id>",
    linkFirst:
      "Link your account first with /link 123456, then use /lang ru|en, /tasks, /done <task_id>, /undo <task_id>.",
    languageStatus: "Current bot language: EN\nUse /lang ru or /lang en",
    languageChangedToEn: "Bot language changed to EN.",
    languageChangedToRu: "Язык бота изменен на RU.",
    tasksHeader: "Recent voice tasks:",
    tasksEmpty: "No voice-created tasks yet.",
    doneUsage: "Usage: /done <task_id>. Use /tasks to get IDs.",
    doneNotFound: "Task not found for this account.",
    doneAmbiguous: "Found several tasks by this prefix. Use full task ID from /tasks.",
    doneAlready: "Task is already completed.",
    doneSuccess: "Task marked as completed.",
    undoUsage: "Usage: /undo <task_id>. Use /tasks to get IDs.",
    undoNotDone: "Task is not completed yet.",
    undoSuccess: "Task moved back to To do.",
  },
  ru: {
    start:
      "Привет! Чтобы подключить аккаунт, отправьте: /link 123456\nЧтобы сменить язык: /lang ru или /lang en\nСписок задач: /tasks\nВыполнить задачу: /done <task_id>\nОтменить выполнение: /undo <task_id>",
    unknown:
      "Неизвестная команда. Используйте /link 123456, /lang ru|en, /tasks, /done <task_id>, /undo <task_id>.",
    invalidOrExpired:
      "Код привязки неверный или истек. Сгенерируйте новый код в настройках приложения.",
    linked:
      "Telegram успешно подключен. Вы будете получать уведомления о задачах.\nКоманды: /lang ru|en, /tasks, /done <task_id>, /undo <task_id>",
    linkFirst:
      "Сначала привяжите аккаунт через /link 123456, затем используйте /lang ru|en, /tasks, /done <task_id>, /undo <task_id>.",
    languageStatus: "Текущий язык бота: RU\nИспользуйте /lang ru или /lang en",
    languageChangedToEn: "Bot language changed to EN.",
    languageChangedToRu: "Язык бота изменен на RU.",
    tasksHeader: "Последние голосовые задачи:",
    tasksEmpty: "Пока нет голосовых задач.",
    doneUsage: "Использование: /done <task_id>. Смотрите ID через /tasks.",
    doneNotFound: "Задача для этого аккаунта не найдена.",
    doneAmbiguous:
      "По этому префиксу найдено несколько задач. Используйте полный task_id из /tasks.",
    doneAlready: "Задача уже выполнена.",
    doneSuccess: "Задача отмечена как выполненная.",
    undoUsage: "Использование: /undo <task_id>. Смотрите ID через /tasks.",
    undoNotDone: "Задача и так не выполнена.",
    undoSuccess: "Задача возвращена в статус к выполнению.",
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

function escapeMarkdown(textValue: string): string {
  return textValue.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

function formatTaskStatus(status: "todo" | "in_progress" | "done", language: TelegramUiLanguage) {
  if (language === "ru") {
    if (status === "done") return "Выполнено";
    if (status === "in_progress") return "В процессе";
    return "К выполнению";
  }
  if (status === "done") return "Done";
  if (status === "in_progress") return "In progress";
  return "To do";
}

async function getRecentVoiceTasks(userId: string) {
  return prisma.task.findMany({
    where: {
      userId,
      voiceInputId: { not: null },
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

async function handleTasksCommand(
  chatId: string,
  userId: string,
  language: TelegramUiLanguage,
) {
  const t = text[language];
  const tasks = await getRecentVoiceTasks(userId);
  if (tasks.length === 0) {
    await sendTelegramMessage(chatId, t.tasksEmpty);
    return;
  }

  const lines = tasks.map((task) => {
    const title = escapeMarkdown(task.title).slice(0, 80);
    const status = formatTaskStatus(task.status, language);
    return `- ${task.id} — ${title} \\(${status}\\)`;
  });

  await sendTelegramMessage(chatId, `${t.tasksHeader}\n${lines.join("\n")}`);
}

async function handleDoneCommand(
  chatId: string,
  userId: string,
  commandText: string,
  language: TelegramUiLanguage,
) {
  const t = text[language];
  const match = commandText.match(/^\/done(?:@\w+)?\s+([a-zA-Z0-9_-]{4,})$/);
  if (!match) {
    await sendTelegramMessage(chatId, t.doneUsage);
    return;
  }

  const taskRef = match[1];
  const matches = await findTaskByRef(userId, taskRef);

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

  await trackEvent(userId, "task_completed_from_telegram", { taskId: task.id });
  await sendTelegramMessage(chatId, `${t.doneSuccess}\n${task.id}`);
}

async function findTaskByRef(userId: string, taskRef: string) {
  return prisma.task.findMany({
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
}

async function handleUndoCommand(
  chatId: string,
  userId: string,
  commandText: string,
  language: TelegramUiLanguage,
) {
  const t = text[language];
  const match = commandText.match(/^\/undo(?:@\w+)?\s+([a-zA-Z0-9_-]{4,})$/);
  if (!match) {
    await sendTelegramMessage(chatId, t.undoUsage);
    return;
  }

  const taskRef = match[1];
  const matches = await findTaskByRef(userId, taskRef);

  if (matches.length === 0) {
    await sendTelegramMessage(chatId, t.doneNotFound);
    return;
  }

  if (matches.length > 1) {
    await sendTelegramMessage(chatId, t.doneAmbiguous);
    return;
  }

  const task = matches[0];
  if (task.status !== "done") {
    await sendTelegramMessage(chatId, `${t.undoNotDone}\n${task.id}`);
    return;
  }

  await prisma.task.update({
    where: { id: task.id },
    data: { status: "todo" },
  });

  await trackEvent(userId, "task_uncompleted_from_telegram", { taskId: task.id });
  await sendTelegramMessage(chatId, `${t.undoSuccess}\n${task.id}`);
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

    await sendTelegramMessage(
      chatId,
      requestedLanguage === "ru" ? text.ru.languageChangedToRu : text.en.languageChangedToEn,
    );

    return { handled: true as const };
  }

  if (commandText.match(/^\/tasks(?:@\w+)?$/i)) {
    if (!existingConnection) {
      await sendTelegramMessage(chatId, t.linkFirst);
      return { handled: true as const };
    }
    await handleTasksCommand(chatId, existingConnection.userId, currentLanguage);
    return { handled: true as const };
  }

  if (commandText.match(/^\/done(?:@\w+)?/i)) {
    if (!existingConnection) {
      await sendTelegramMessage(chatId, t.linkFirst);
      return { handled: true as const };
    }
    await handleDoneCommand(chatId, existingConnection.userId, commandText, currentLanguage);
    return { handled: true as const };
  }

  if (commandText.match(/^\/undo(?:@\w+)?/i)) {
    if (!existingConnection) {
      await sendTelegramMessage(chatId, t.linkFirst);
      return { handled: true as const };
    }
    await handleUndoCommand(chatId, existingConnection.userId, commandText, currentLanguage);
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
