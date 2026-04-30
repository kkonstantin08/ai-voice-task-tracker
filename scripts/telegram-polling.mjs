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
const TASKS_LIMIT = 5;
const CALLBACK_REFRESH = "tasks:refresh";
const CALLBACK_CANCEL = "task:cancel";

const text = {
  en: {
    start:
      "Hello! To connect your account, send: /link 123456\nTo switch language: /lang ru or /lang en\nTo view tasks: /tasks\nTo view dashboard: /dashboard\nTo complete task: /done <task_id>\nTo undo completion: /undo <task_id>\nTo delete task: /delete <task_id>",
    unknown:
      "Unknown command. Use /link 123456, /lang ru|en, /tasks, /dashboard, /done <task_id>, /undo <task_id>, /delete <task_id>.",
    invalidOrExpired: "Link code is invalid or expired. Generate a new code in app settings.",
    linked:
      "Telegram linked successfully. You will receive task notifications.\nCommands: /lang ru|en, /tasks, /dashboard, /done <task_id>, /undo <task_id>, /delete <task_id>",
    linkFirst:
      "Link your account first with /link 123456, then use /lang ru|en, /tasks, /dashboard, /done <task_id>, /undo <task_id>, /delete <task_id>.",
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
    deleteUsage: "Usage: /delete <task_id>. Use /tasks to get IDs.",
    deleteSuccess: "Task deleted.",
    btnDone: "✅ Complete",
    btnUndo: "↩️ Undo",
    btnDelete: "🗑️ Delete",
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
    callbackActionDeletePrompt: "Confirm deletion?",
    callbackCompleted: "Completed.",
    callbackUncompleted: "Moved back to To do.",
    callbackDeleted: "Deleted.",
    callbackUnknownAction: "Unknown action.",
    callbackError: "Could not process action.",
    confirmDoneText: "Complete this task?",
    confirmUndoText: "Move this task back to To do?",
    confirmDeleteText: "Delete this task?",
    taskLabel: "Task",
    statusLabel: "Status",
    statusTodo: "To do",
    statusInProgress: "In progress",
    statusDone: "Done",
    dashboardHeader: "📊 *Dashboard*",
    dashboardTasks: "Total tasks",
    dashboardVoiceInputs: "Voice inputs",
    dashboardVoiceTasks: "Voice tasks",
    dashboardTranscriptionRate: "Transcription rate",
    dashboardConversionRate: "Conversion rate",
  },
  ru: {
    start:
      "Привет! Чтобы подключить аккаунт, отправьте: /link 123456\nЧтобы сменить язык: /lang ru или /lang en\nСписок задач: /tasks\nДашборд: /dashboard\nВыполнить задачу: /done <task_id>\nОтменить выполнение: /undo <task_id>\nУдалить задачу: /delete <task_id>",
    unknown:
      "Неизвестная команда. Используйте /link 123456, /lang ru|en, /tasks, /dashboard, /done <task_id>, /undo <task_id>, /delete <task_id>.",
    invalidOrExpired:
      "Код привязки неверный или истек. Сгенерируйте новый код в настройках приложения.",
    linked:
      "Telegram успешно подключен. Вы будете получать уведомления о задачах.\nКоманды: /lang ru|en, /tasks, /dashboard, /done <task_id>, /undo <task_id>, /delete <task_id>",
    linkFirst:
      "Сначала привяжите аккаунт через /link 123456, затем используйте /lang ru|en, /tasks, /dashboard, /done <task_id>, /undo <task_id>, /delete <task_id>.",
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
    deleteUsage: "Использование: /delete <task_id>. Смотрите ID через /tasks.",
    deleteSuccess: "Задача удалена.",
    btnDone: "✅ Выполнить",
    btnUndo: "↩️ Отменить",
    btnDelete: "🗑️ Удалить",
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
    callbackActionDeletePrompt: "Подтвердите удаление.",
    callbackCompleted: "Выполнено.",
    callbackUncompleted: "Возвращено в «к выполнению».",
    callbackDeleted: "Удалено.",
    callbackUnknownAction: "Неизвестное действие.",
    callbackError: "Не удалось обработать действие.",
    confirmDoneText: "Выполнить эту задачу?",
    confirmUndoText: "Вернуть задачу в статус «к выполнению»?",
    confirmDeleteText: "Удалить эту задачу?",
    taskLabel: "Задача",
    statusLabel: "Статус",
    statusTodo: "К выполнению",
    statusInProgress: "В процессе",
    statusDone: "Выполнено",
    dashboardHeader: "📊 *Дашборд*",
    dashboardTasks: "Всего задач",
    dashboardVoiceInputs: "Голосовых вводов",
    dashboardVoiceTasks: "Голосовых задач",
    dashboardTranscriptionRate: "Успешность транскрипции",
    dashboardConversionRate: "Конверсия в задачу",
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

function escapeMarkdown(textValue) {
  return textValue.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

function shortTaskId(id) {
  return id.slice(-6);
}

function formatTaskStatus(status, language) {
  const t = text[language];
  if (status === "done") return t.statusDone;
  if (status === "in_progress") return t.statusInProgress;
  return t.statusTodo;
}

function callbackIntent(action, taskId) {
  return `task:intent:${action}:${taskId}`;
}

function callbackConfirm(action, taskId) {
  return `task:confirm:${action}:${taskId}`;
}

function parseCallbackData(rawData) {
  if (!rawData) return { kind: "invalid" };
  if (rawData === CALLBACK_REFRESH) return { kind: "refresh" };
  if (rawData === CALLBACK_CANCEL) return { kind: "cancel" };

  const match = rawData.match(/^task:(intent|confirm):(done|undo|delete):([a-zA-Z0-9_-]{6,})$/);
  if (!match) return { kind: "invalid" };

  return {
    kind: match[1],
    action: match[2],
    taskId: match[3],
  };
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

function toApiMessageOptions(options) {
  const payload = {};
  if (options?.parseMode) {
    payload.parse_mode = options.parseMode;
  }
  if (options?.replyMarkup) {
    payload.reply_markup = options.replyMarkup;
  }
  return payload;
}

async function sendTelegramMessage(chatId, messageText, options) {
  return telegramRequest("sendMessage", {
    chat_id: chatId,
    text: messageText,
    ...toApiMessageOptions(options),
  });
}

async function editTelegramMessage(chatId, messageId, messageText, options) {
  return telegramRequest("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text: messageText,
    ...toApiMessageOptions(options),
  });
}

async function answerTelegramCallback(callbackQueryId, messageText) {
  const payload = { callback_query_id: callbackQueryId };
  if (messageText) {
    payload.text = messageText;
  }
  await telegramRequest("answerCallbackQuery", payload);
}

function extractChatId(chat) {
  const chatId = chat?.id;
  if (chatId === undefined || chatId === null) {
    return null;
  }
  return String(chatId);
}

async function getRecentVoiceTasks(userId) {
  return prisma.task.findMany({
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
}

async function findTaskByRef(userId, taskRef) {
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

async function findTaskById(userId, taskId) {
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

function percentage(numerator, denominator) {
  if (denominator === 0) {
    return "0%";
  }
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

async function getDashboardStats(userId) {
  const [
    totalTasks,
    totalVoiceInputs,
    totalVoiceTasks,
    groupedStatuses,
    voiceUploadedEvents,
    transcriptionEvents,
  ] = await Promise.all([
    prisma.task.count({ where: { userId } }),
    prisma.voiceInput.count({ where: { userId } }),
    prisma.task.count({ where: { userId, voiceInputId: { not: null } } }),
    prisma.task.groupBy({
      by: ["status"],
      where: { userId },
      _count: { status: true },
    }),
    prisma.analyticsEvent.count({
      where: { userId, eventName: "voice_uploaded" },
    }),
    prisma.analyticsEvent.count({
      where: { userId, eventName: "transcription_succeeded" },
    }),
  ]);

  const statusCounts = { todo: 0, in_progress: 0, done: 0 };
  for (const group of groupedStatuses) {
    statusCounts[group.status] = group._count.status;
  }

  return {
    totalTasks,
    totalVoiceInputs,
    totalVoiceTasks,
    statusCounts,
    transcriptionRate: percentage(transcriptionEvents, voiceUploadedEvents),
    conversionRate: percentage(totalVoiceTasks, voiceUploadedEvents),
  };
}

function buildTasksText(tasks, language) {
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

function buildTasksKeyboard(tasks, language) {
  const t = text[language];
  const rows = tasks.map((task) => {
    const action = task.status === "done" ? "undo" : "done";
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

  rows.push([{ text: t.btnRefresh, callback_data: CALLBACK_REFRESH }]);
  return { inline_keyboard: rows };
}

function buildConfirmText(task, action, language) {
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

function buildConfirmKeyboard(taskId, action, language) {
  const t = text[language];
  return {
    inline_keyboard: [
      [
        { text: t.btnConfirm, callback_data: callbackConfirm(action, taskId) },
        { text: t.btnCancel, callback_data: CALLBACK_CANCEL },
      ],
    ],
  };
}

async function refreshTasksMessage(chatId, messageId, userId, language) {
  const tasks = await getRecentVoiceTasks(userId);
  await editTelegramMessage(chatId, messageId, buildTasksText(tasks, language), {
    parseMode: "Markdown",
    replyMarkup: buildTasksKeyboard(tasks, language),
  });
}

async function handleTasksCommand(chatId, userId, language) {
  const tasks = await getRecentVoiceTasks(userId);
  await sendTelegramMessage(chatId, buildTasksText(tasks, language), {
    parseMode: "Markdown",
    replyMarkup: buildTasksKeyboard(tasks, language),
  });
}

async function handleDashboardCommand(chatId, userId, language) {
  const t = text[language];
  const stats = await getDashboardStats(userId);
  const lines = [
    t.dashboardHeader,
    "",
    `${t.dashboardTasks}: *${stats.totalTasks}*`,
    `${t.dashboardVoiceInputs}: *${stats.totalVoiceInputs}*`,
    `${t.dashboardVoiceTasks}: *${stats.totalVoiceTasks}*`,
    `${t.dashboardTranscriptionRate}: *${stats.transcriptionRate}*`,
    `${t.dashboardConversionRate}: *${stats.conversionRate}*`,
    "",
    `${t.statusTodo}: *${stats.statusCounts.todo}*`,
    `${t.statusInProgress}: *${stats.statusCounts.in_progress}*`,
    `${t.statusDone}: *${stats.statusCounts.done}*`,
  ];

  await sendTelegramMessage(chatId, lines.join("\n"), { parseMode: "Markdown" });
}

async function handleDoneCommand(chatId, userId, commandText, language) {
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

  await prisma.analyticsEvent.create({
    data: {
      userId,
      eventName: "task_completed_from_telegram",
      metadata: { taskId: task.id },
    },
  });

  await sendTelegramMessage(chatId, `${t.doneSuccess}\n${task.id}`);
}

async function handleUndoCommand(chatId, userId, commandText, language) {
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

  await prisma.analyticsEvent.create({
    data: {
      userId,
      eventName: "task_uncompleted_from_telegram",
      metadata: { taskId: task.id },
    },
  });

  await sendTelegramMessage(chatId, `${t.undoSuccess}\n${task.id}`);
}

async function handleDeleteCommand(chatId, userId, commandText, language) {
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

  await prisma.analyticsEvent.create({
    data: {
      userId,
      eventName: "task_deleted_from_telegram",
      metadata: { taskId: task.id },
    },
  });

  await sendTelegramMessage(chatId, `${t.deleteSuccess}\n${task.id}`);
}

async function handleCallbackQuery(update) {
  const callback = update.callback_query;
  if (!callback?.id) {
    return;
  }

  const callbackData = parseCallbackData(callback.data);
  const chatId = extractChatId(callback.message?.chat);
  const messageId = callback.message?.message_id;
  if (!chatId || !messageId) {
    await answerTelegramCallback(callback.id, "Message is unavailable.");
    return;
  }

  const existingConnection = await prisma.telegramConnection.findFirst({
    where: { chatId },
    select: { userId: true, uiLanguage: true },
  });
  const language = normalizeLanguage(existingConnection?.uiLanguage);
  const t = text[language];

  if (!existingConnection) {
    await answerTelegramCallback(callback.id, t.callbackNeedLink);
    return;
  }

  const userId = existingConnection.userId;

  try {
    if (callbackData.kind === "refresh") {
      await refreshTasksMessage(chatId, messageId, userId, language);
      await answerTelegramCallback(callback.id, t.callbackTasksRefreshed);
      return;
    }

    if (callbackData.kind === "cancel") {
      await refreshTasksMessage(chatId, messageId, userId, language);
      await answerTelegramCallback(callback.id, t.callbackActionCancelled);
      return;
    }

    if (callbackData.kind === "invalid") {
      await answerTelegramCallback(callback.id, t.callbackUnknownAction);
      return;
    }

    const task = await findTaskById(userId, callbackData.taskId);
    if (!task) {
      await refreshTasksMessage(chatId, messageId, userId, language);
      await answerTelegramCallback(callback.id, t.callbackTaskNotFound);
      return;
    }

    if (callbackData.kind === "intent") {
      if (callbackData.action === "done" && task.status === "done") {
        await refreshTasksMessage(chatId, messageId, userId, language);
        await answerTelegramCallback(callback.id, t.callbackAlreadyDone);
        return;
      }

      if (callbackData.action === "undo" && task.status !== "done") {
        await refreshTasksMessage(chatId, messageId, userId, language);
        await answerTelegramCallback(callback.id, t.callbackNotDone);
        return;
      }

      await editTelegramMessage(chatId, messageId, buildConfirmText(task, callbackData.action, language), {
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
      return;
    }

    if (callbackData.action === "delete") {
      await prisma.task.delete({
        where: { id: task.id },
      });
      await prisma.analyticsEvent.create({
        data: {
          userId,
          eventName: "task_deleted_from_telegram",
          metadata: { taskId: task.id },
        },
      });
      await refreshTasksMessage(chatId, messageId, userId, language);
      await answerTelegramCallback(callback.id, t.callbackDeleted);
      return;
    }

    if (callbackData.action === "done") {
      if (task.status === "done") {
        await refreshTasksMessage(chatId, messageId, userId, language);
        await answerTelegramCallback(callback.id, t.callbackAlreadyDone);
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
      await refreshTasksMessage(chatId, messageId, userId, language);
      await answerTelegramCallback(callback.id, t.callbackCompleted);
      return;
    }

    if (task.status !== "done") {
      await refreshTasksMessage(chatId, messageId, userId, language);
      await answerTelegramCallback(callback.id, t.callbackNotDone);
      return;
    }

    await prisma.task.update({
      where: { id: task.id },
      data: { status: "todo" },
    });
    await prisma.analyticsEvent.create({
      data: {
        userId,
        eventName: "task_uncompleted_from_telegram",
        metadata: { taskId: task.id },
      },
    });
    await refreshTasksMessage(chatId, messageId, userId, language);
    await answerTelegramCallback(callback.id, t.callbackUncompleted);
  } catch (error) {
    console.error("Telegram callback processing failed", error);
    await answerTelegramCallback(callback.id, t.callbackError);
  }
}

async function processTelegramUpdate(update) {
  if (update?.callback_query) {
    await handleCallbackQuery(update);
    return;
  }

  const commandText = update?.message?.text?.trim() ?? "";
  const chatId = extractChatId(update?.message?.chat);
  const username = update?.message?.from?.username ?? null;

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

  if (commandText.match(/^\/dashboard(?:@\w+)?$/i)) {
    if (!existingConnection) {
      await sendTelegramMessage(chatId, t.linkFirst);
      return;
    }
    await handleDashboardCommand(chatId, existingConnection.userId, currentLanguage);
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

  if (commandText.match(/^\/undo(?:@\w+)?/i)) {
    if (!existingConnection) {
      await sendTelegramMessage(chatId, t.linkFirst);
      return;
    }
    await handleUndoCommand(chatId, existingConnection.userId, commandText, currentLanguage);
    return;
  }

  if (commandText.match(/^\/delete(?:@\w+)?/i)) {
    if (!existingConnection) {
      await sendTelegramMessage(chatId, t.linkFirst);
      return;
    }
    await handleDeleteCommand(chatId, existingConnection.userId, commandText, currentLanguage);
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
