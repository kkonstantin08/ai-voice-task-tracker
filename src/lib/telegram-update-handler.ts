import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  answerTelegramCallback,
  editTelegramMessage,
  normalizeTelegramUiLanguage,
  sendTelegramMessage,
  type TelegramInlineKeyboardMarkup,
  type TelegramUiLanguage,
} from "@/lib/telegram";
import { trackEvent } from "@/lib/analytics";

type TelegramChat = {
  id?: number | string;
};

type TelegramMessage = {
  message_id?: number;
  text?: string;
  chat?: TelegramChat;
  from?: {
    username?: string;
  };
};

type TelegramCallbackQuery = {
  id?: string;
  data?: string;
  message?: {
    message_id?: number;
    chat?: TelegramChat;
  };
};

export type TelegramUpdate = {
  update_id?: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

type VoiceTaskLite = {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
};

type TaskAction = "done" | "undo" | "delete";

type ParsedCallbackData =
  | { kind: "refresh" }
  | { kind: "cancel" }
  | { kind: "intent"; action: TaskAction; taskId: string }
  | { kind: "confirm"; action: TaskAction; taskId: string }
  | { kind: "invalid" };

const TASKS_LIMIT = 5;
const CALLBACK_REFRESH = "tasks:refresh";
const CALLBACK_CANCEL = "task:cancel";

const text = {
  en: {
    start:
      "Hello! To connect your account, send: /link 123456\nTo switch language: /lang ru or /lang en\nTo view tasks: /tasks\nTo complete task: /done <task_id>\nTo undo completion: /undo <task_id>\nTo delete task: /delete <task_id>",
    unknown:
      "Unknown command. Use /link 123456, /lang ru|en, /tasks, /done <task_id>, /undo <task_id>, /delete <task_id>.",
    invalidOrExpired: "Link code is invalid or expired. Generate a new code in app settings.",
    linked:
      "Telegram linked successfully. You will receive task notifications.\nCommands: /lang ru|en, /tasks, /done <task_id>, /undo <task_id>, /delete <task_id>",
    linkFirst:
      "Link your account first with /link 123456, then use /lang ru|en, /tasks, /done <task_id>, /undo <task_id>, /delete <task_id>.",
    languageStatus: "Current bot language: EN\nUse /lang ru or /lang en",
    languageChangedToEn: "Bot language changed to EN.",
    languageChangedToRu: "Bot language changed to RU.",
    tasksHeader: "🗂 *Recent voice tasks*",
    tasksEmpty: "No voice-created tasks yet.",
    doneUsage: "Usage: /done <task_id>. Use /tasks to get IDs.",
    doneNotFound: "Task not found for this account.",
    doneAmbiguous: "Found several tasks by this prefix. Use full task ID from /tasks.",
    doneAlready: "Task is already completed.",
    doneSuccess: "Task marked as completed.",
    undoUsage: "Usage: /undo <task_id>. Use /tasks to get IDs.",
    undoNotDone: "Task is not completed yet.",
    undoSuccess: "Task moved back to To do.",
    deleteUsage: "Использование: /delete <task_id>. Смотрите ID через /tasks.",
    deleteSuccess: "Задача удалена.",
    btnDone: "✅ Complete",
    btnUndo: "↩️ Undo",
    btnDelete: "🗑️ Удалить",
    btnRefresh: "🔄 Refresh",
    btnConfirm: "✅ Confirm",
    btnCancel: "✖️ Cancel",
    callbackNeedLink: "Link account first.",
    callbackTasksRefreshed: "List updated.",
    callbackTaskNotFound: "Task not found.",
    callbackAlreadyDone: "Task is already done.",
    callbackNotDone: "Task is not done yet.",
    callbackActionCancelled: "Action cancelled.",
    callbackActionDonePrompt: "Confirm completion?",
    callbackActionUndoPrompt: "Confirm undo?",
    callbackActionDeletePrompt: "Подтвердите удаление.",
    callbackCompleted: "Completed.",
    callbackUncompleted: "Moved back to To do.",
    callbackDeleted: "Удалено.",
    callbackUnknownAction: "Unknown action.",
    callbackError: "Could not process action.",
    confirmDoneText: "Complete this task?",
    confirmUndoText: "Move this task back to To do?",
    confirmDeleteText: "Удалить эту задачу?",
    taskLabel: "Task",
    statusLabel: "Status",
    taskMissingInMessage: "Task details are no longer available.",
    statusTodo: "To do",
    statusInProgress: "In progress",
    statusDone: "Done",
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
    languageChangedToEn: "Язык бота изменен на EN.",
    languageChangedToRu: "Язык бота изменен на RU.",
    tasksHeader: "🗂 *Последние голосовые задачи*",
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
    deleteUsage: "Usage: /delete <task_id>. Use /tasks to get IDs.",
    deleteSuccess: "Task deleted.",
    btnDone: "✅ Выполнить",
    btnUndo: "↩️ Отменить",
    btnDelete: "Delete",
    btnRefresh: "🔄 Обновить",
    btnConfirm: "✅ Подтвердить",
    btnCancel: "✖️ Отмена",
    callbackNeedLink: "Сначала привяжите аккаунт.",
    callbackTasksRefreshed: "Список обновлен.",
    callbackTaskNotFound: "Задача не найдена.",
    callbackAlreadyDone: "Задача уже выполнена.",
    callbackNotDone: "Задача еще не выполнена.",
    callbackActionCancelled: "Действие отменено.",
    callbackActionDonePrompt: "Подтвердите выполнение.",
    callbackActionUndoPrompt: "Подтвердите отмену выполнения.",
    callbackActionDeletePrompt: "Confirm deletion?",
    callbackCompleted: "Выполнено.",
    callbackUncompleted: "Возвращено в «к выполнению».",
    callbackDeleted: "Deleted.",
    callbackUnknownAction: "Неизвестное действие.",
    callbackError: "Не удалось обработать действие.",
    confirmDoneText: "Выполнить эту задачу?",
    confirmUndoText: "Вернуть задачу в статус «к выполнению»?",
    confirmDeleteText: "Delete this task?",
    taskLabel: "Задача",
    statusLabel: "Статус",
    taskMissingInMessage: "Данные задачи больше недоступны.",
    statusTodo: "К выполнению",
    statusInProgress: "В процессе",
    statusDone: "Выполнено",
  },
} as const;

function extractChatId(chat: TelegramChat | undefined): string | null {
  const chatId = chat?.id;
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

function shortTaskId(id: string): string {
  return id.slice(-6);
}

function formatTaskStatus(status: VoiceTaskLite["status"], language: TelegramUiLanguage): string {
  const t = text[language];
  if (status === "done") return t.statusDone;
  if (status === "in_progress") return t.statusInProgress;
  return t.statusTodo;
}

function callbackIntent(action: TaskAction, taskId: string) {
  return `task:intent:${action}:${taskId}`;
}

function callbackConfirm(action: TaskAction, taskId: string) {
  return `task:confirm:${action}:${taskId}`;
}

function parseCallbackData(rawData: string | undefined): ParsedCallbackData {
  if (!rawData) return { kind: "invalid" };
  if (rawData === CALLBACK_REFRESH) return { kind: "refresh" };
  if (rawData === CALLBACK_CANCEL) return { kind: "cancel" };

  const match = rawData.match(/^task:(intent|confirm):(done|undo|delete):([a-zA-Z0-9_-]{6,})$/);
  if (!match) {
    return { kind: "invalid" };
  }

  const kind = match[1] as "intent" | "confirm";
  const action = match[2] as TaskAction;
  const taskId = match[3];
  return { kind, action, taskId };
}

async function getRecentVoiceTasks(userId: string): Promise<VoiceTaskLite[]> {
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      voiceInputId: { not: null },
    },
    orderBy: { createdAt: "desc" },
    take: TASKS_LIMIT,
    select: {
      id: true,
      title: true,
      status: true,
    },
  });

  return tasks as VoiceTaskLite[];
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

async function findTaskById(userId: string, taskId: string) {
  return prisma.task.findFirst({
    where: {
      id: taskId,
      userId,
      voiceInputId: { not: null },
    },
    select: {
      id: true,
      title: true,
      status: true,
    },
  });
}

function buildTasksText(tasks: VoiceTaskLite[], language: TelegramUiLanguage): string {
  const t = text[language];
  if (tasks.length === 0) {
    return `${t.tasksHeader}\n${t.tasksEmpty}`;
  }

  const lines = tasks.map((task, index) => {
    const title = escapeMarkdown(task.title).slice(0, 80);
    const status = formatTaskStatus(task.status, language);
    return `${index + 1}. ${title}\n\`${shortTaskId(task.id)}\` • ${status}`;
  });

  return `${t.tasksHeader}\n\n${lines.join("\n\n")}`;
}

function buildTasksKeyboard(
  tasks: VoiceTaskLite[],
  language: TelegramUiLanguage,
): TelegramInlineKeyboardMarkup {
  const t = text[language];
  const inline_keyboard: TelegramInlineKeyboardMarkup["inline_keyboard"] = tasks.map((task) => {
    const action: TaskAction = task.status === "done" ? "undo" : "done";
    const textLabel = action === "done" ? t.btnDone : t.btnUndo;
    return [
      {
        text: `${textLabel} ${shortTaskId(task.id)}`,
        callback_data: callbackIntent(action, task.id),
      },
      {
        text: `${t.btnDelete} ${shortTaskId(task.id)}`,
        callback_data: callbackIntent("delete", task.id),
      },
    ];
  });

  inline_keyboard.push([{ text: t.btnRefresh, callback_data: CALLBACK_REFRESH }]);

  return { inline_keyboard };
}

function buildConfirmText(task: VoiceTaskLite, action: TaskAction, language: TelegramUiLanguage): string {
  const t = text[language];
  const prompt =
    action === "done"
      ? t.confirmDoneText
      : action === "undo"
        ? t.confirmUndoText
        : t.confirmDeleteText;
  const status = formatTaskStatus(task.status, language);
  const title = escapeMarkdown(task.title).slice(0, 80);
  return `⚠️ *${prompt}*\n\n${t.taskLabel}: ${title}\nID: \`${shortTaskId(task.id)}\`\n${t.statusLabel}: ${status}`;
}

function buildConfirmKeyboard(taskId: string, action: TaskAction, language: TelegramUiLanguage) {
  const t = text[language];
  return {
    inline_keyboard: [
      [
        { text: t.btnConfirm, callback_data: callbackConfirm(action, taskId) },
        { text: t.btnCancel, callback_data: CALLBACK_CANCEL },
      ],
    ],
  } satisfies TelegramInlineKeyboardMarkup;
}

async function refreshTasksMessage(
  chatId: string,
  messageId: number,
  userId: string,
  language: TelegramUiLanguage,
) {
  const tasks = await getRecentVoiceTasks(userId);
  await editTelegramMessage(chatId, messageId, buildTasksText(tasks, language), {
    parseMode: "Markdown",
    replyMarkup: buildTasksKeyboard(tasks, language),
  });
}

async function handleTasksCommand(chatId: string, userId: string, language: TelegramUiLanguage) {
  const tasks = await getRecentVoiceTasks(userId);
  await sendTelegramMessage(chatId, buildTasksText(tasks, language), {
    parseMode: "Markdown",
    replyMarkup: buildTasksKeyboard(tasks, language),
  });
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

async function handleDeleteCommand(
  chatId: string,
  userId: string,
  commandText: string,
  language: TelegramUiLanguage,
) {
  const t = text[language];
  const match = commandText.match(/^\/delete(?:@\w+)?\s+([a-zA-Z0-9_-]{4,})$/);
  if (!match) {
    await sendTelegramMessage(chatId, t.deleteUsage);
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
  await prisma.task.delete({
    where: { id: task.id },
  });

  await trackEvent(userId, "task_deleted_from_telegram", { taskId: task.id });
  await sendTelegramMessage(chatId, `${t.deleteSuccess}\n${task.id}`);
}

async function handleCallbackQuery(update: TelegramUpdate) {
  const callback = update.callback_query;
  if (!callback?.id) {
    return { handled: false as const };
  }

  const callbackData = parseCallbackData(callback.data);
  const chatId = extractChatId(callback.message?.chat);
  const messageId = callback.message?.message_id;

  if (!chatId || !messageId) {
    await answerTelegramCallback(callback.id, "Message is unavailable.");
    return { handled: true as const };
  }

  const existingConnection = await prisma.telegramConnection.findFirst({
    where: { chatId },
    select: { userId: true, uiLanguage: true },
  });

  const language = normalizeTelegramUiLanguage(existingConnection?.uiLanguage);
  const t = text[language];

  if (!existingConnection) {
    await answerTelegramCallback(callback.id, t.callbackNeedLink);
    return { handled: true as const };
  }

  const userId = existingConnection.userId;

  try {
    if (callbackData.kind === "refresh") {
      await refreshTasksMessage(chatId, messageId, userId, language);
      await answerTelegramCallback(callback.id, t.callbackTasksRefreshed);
      return { handled: true as const };
    }

    if (callbackData.kind === "cancel") {
      await refreshTasksMessage(chatId, messageId, userId, language);
      await answerTelegramCallback(callback.id, t.callbackActionCancelled);
      return { handled: true as const };
    }

    if (callbackData.kind === "invalid") {
      await answerTelegramCallback(callback.id, t.callbackUnknownAction);
      return { handled: true as const };
    }

    const task = await findTaskById(userId, callbackData.taskId);
    if (!task) {
      await refreshTasksMessage(chatId, messageId, userId, language);
      await answerTelegramCallback(callback.id, t.callbackTaskNotFound);
      return { handled: true as const };
    }

    if (callbackData.kind === "intent") {
      if (callbackData.action === "done" && task.status === "done") {
        await refreshTasksMessage(chatId, messageId, userId, language);
        await answerTelegramCallback(callback.id, t.callbackAlreadyDone);
        return { handled: true as const };
      }

      if (callbackData.action === "undo" && task.status !== "done") {
        await refreshTasksMessage(chatId, messageId, userId, language);
        await answerTelegramCallback(callback.id, t.callbackNotDone);
        return { handled: true as const };
      }

      await editTelegramMessage(chatId, messageId, buildConfirmText(task as VoiceTaskLite, callbackData.action, language), {
        parseMode: "Markdown",
        replyMarkup: buildConfirmKeyboard(task.id, callbackData.action, language),
      });

      await answerTelegramCallback(
        callback.id,
        callbackData.action === "done"
          ? t.callbackActionDonePrompt
          : callbackData.action === "undo"
            ? t.callbackActionUndoPrompt
            : t.callbackActionDeletePrompt,
      );
      return { handled: true as const };
    }

    if (callbackData.action === "delete") {
      await prisma.task.delete({
        where: { id: task.id },
      });
      await trackEvent(userId, "task_deleted_from_telegram", { taskId: task.id });
      await refreshTasksMessage(chatId, messageId, userId, language);
      await answerTelegramCallback(callback.id, t.callbackDeleted);
      return { handled: true as const };
    }

    if (callbackData.action === "done") {
      if (task.status === "done") {
        await refreshTasksMessage(chatId, messageId, userId, language);
        await answerTelegramCallback(callback.id, t.callbackAlreadyDone);
        return { handled: true as const };
      }

      await prisma.task.update({
        where: { id: task.id },
        data: { status: "done" },
      });
      await trackEvent(userId, "task_completed_from_telegram", { taskId: task.id });
      await refreshTasksMessage(chatId, messageId, userId, language);
      await answerTelegramCallback(callback.id, t.callbackCompleted);
      return { handled: true as const };
    }

    if (task.status !== "done") {
      await refreshTasksMessage(chatId, messageId, userId, language);
      await answerTelegramCallback(callback.id, t.callbackNotDone);
      return { handled: true as const };
    }

    await prisma.task.update({
      where: { id: task.id },
      data: { status: "todo" },
    });
    await trackEvent(userId, "task_uncompleted_from_telegram", { taskId: task.id });
    await refreshTasksMessage(chatId, messageId, userId, language);
    await answerTelegramCallback(callback.id, t.callbackUncompleted);
    return { handled: true as const };
  } catch (error) {
    console.error("Telegram callback processing failed", error);
    await answerTelegramCallback(callback.id, t.callbackError);
    return { handled: true as const };
  }
}

export async function handleTelegramUpdate(update: TelegramUpdate) {
  if (update.callback_query) {
    return handleCallbackQuery(update);
  }

  const rawText = update.message?.text ?? "";
  const commandText = rawText.trim();
  const chatId = extractChatId(update.message?.chat);
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
      await sendTelegramMessage(
        chatId,
        currentLanguage === "ru" ? text.ru.languageStatus : text.en.languageStatus,
      );
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

  if (commandText.match(/^\/delete(?:@\w+)?/i)) {
    if (!existingConnection) {
      await sendTelegramMessage(chatId, t.linkFirst);
      return { handled: true as const };
    }
    await handleDeleteCommand(chatId, existingConnection.userId, commandText, currentLanguage);
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
