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
import { getDashboardStats } from "@/lib/dashboard-stats";

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
    tasksHeader: "рџ—‚ *Recent voice tasks*",
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
    btnDone: "вњ… Complete",
    btnUndo: "в†©пёЏ Undo",
    btnDelete: "🗑️ Delete",
    btnRefresh: "рџ”„ Refresh",
    btnConfirm: "вњ… Confirm",
    btnCancel: "вњ–пёЏ Cancel",
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
    taskMissingInMessage: "Task details are no longer available.",
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
      "РљРѕРґ РїСЂРёРІСЏР·РєРё РЅРµРІРµСЂРЅС‹Р№ РёР»Рё РёСЃС‚РµРє. РЎРіРµРЅРµСЂРёСЂСѓР№С‚Рµ РЅРѕРІС‹Р№ РєРѕРґ РІ РЅР°СЃС‚СЂРѕР№РєР°С… РїСЂРёР»РѕР¶РµРЅРёСЏ.",
    linked:
      "Telegram успешно подключен. Вы будете получать уведомления о задачах.\nКоманды: /lang ru|en, /tasks, /dashboard, /done <task_id>, /undo <task_id>, /delete <task_id>",
    linkFirst:
      "Сначала привяжите аккаунт через /link 123456, затем используйте /lang ru|en, /tasks, /dashboard, /done <task_id>, /undo <task_id>, /delete <task_id>.",
    languageStatus: "РўРµРєСѓС‰РёР№ СЏР·С‹Рє Р±РѕС‚Р°: RU\nРСЃРїРѕР»СЊР·СѓР№С‚Рµ /lang ru РёР»Рё /lang en",
    languageChangedToEn: "РЇР·С‹Рє Р±РѕС‚Р° РёР·РјРµРЅРµРЅ РЅР° EN.",
    languageChangedToRu: "РЇР·С‹Рє Р±РѕС‚Р° РёР·РјРµРЅРµРЅ РЅР° RU.",
    tasksHeader: "рџ—‚ *РџРѕСЃР»РµРґРЅРёРµ РіРѕР»РѕСЃРѕРІС‹Рµ Р·Р°РґР°С‡Рё*",
    tasksEmpty: "РџРѕРєР° РЅРµС‚ РіРѕР»РѕСЃРѕРІС‹С… Р·Р°РґР°С‡.",
    doneUsage: "РСЃРїРѕР»СЊР·РѕРІР°РЅРёРµ: /done <task_id>. РЎРјРѕС‚СЂРёС‚Рµ ID С‡РµСЂРµР· /tasks.",
    doneNotFound: "Р—Р°РґР°С‡Р° РґР»СЏ СЌС‚РѕРіРѕ Р°РєРєР°СѓРЅС‚Р° РЅРµ РЅР°Р№РґРµРЅР°.",
    doneAmbiguous:
      "РџРѕ СЌС‚РѕРјСѓ РїСЂРµС„РёРєСЃСѓ РЅР°Р№РґРµРЅРѕ РЅРµСЃРєРѕР»СЊРєРѕ Р·Р°РґР°С‡. РСЃРїРѕР»СЊР·СѓР№С‚Рµ РїРѕР»РЅС‹Р№ task_id РёР· /tasks.",
    doneAlready: "Р—Р°РґР°С‡Р° СѓР¶Рµ РІС‹РїРѕР»РЅРµРЅР°.",
    doneSuccess: "Р—Р°РґР°С‡Р° РѕС‚РјРµС‡РµРЅР° РєР°Рє РІС‹РїРѕР»РЅРµРЅРЅР°СЏ.",
    undoUsage: "РСЃРїРѕР»СЊР·РѕРІР°РЅРёРµ: /undo <task_id>. РЎРјРѕС‚СЂРёС‚Рµ ID С‡РµСЂРµР· /tasks.",
    undoNotDone: "Р—Р°РґР°С‡Р° Рё С‚Р°Рє РЅРµ РІС‹РїРѕР»РЅРµРЅР°.",
    undoSuccess: "Р—Р°РґР°С‡Р° РІРѕР·РІСЂР°С‰РµРЅР° РІ СЃС‚Р°С‚СѓСЃ Рє РІС‹РїРѕР»РЅРµРЅРёСЋ.",
    deleteUsage: "Использование: /delete <task_id>. Смотрите ID через /tasks.",
    deleteSuccess: "Задача удалена.",
    btnDone: "вњ… Р’С‹РїРѕР»РЅРёС‚СЊ",
    btnUndo: "в†©пёЏ РћС‚РјРµРЅРёС‚СЊ",
    btnDelete: "🗑️ Удалить",
    btnRefresh: "рџ”„ РћР±РЅРѕРІРёС‚СЊ",
    btnConfirm: "вњ… РџРѕРґС‚РІРµСЂРґРёС‚СЊ",
    btnCancel: "вњ–пёЏ РћС‚РјРµРЅР°",
    callbackNeedLink: "РЎРЅР°С‡Р°Р»Р° РїСЂРёРІСЏР¶РёС‚Рµ Р°РєРєР°СѓРЅС‚.",
    callbackTasksRefreshed: "РЎРїРёСЃРѕРє РѕР±РЅРѕРІР»РµРЅ.",
    callbackTaskNotFound: "Р—Р°РґР°С‡Р° РЅРµ РЅР°Р№РґРµРЅР°.",
    callbackAlreadyDone: "Р—Р°РґР°С‡Р° СѓР¶Рµ РІС‹РїРѕР»РЅРµРЅР°.",
    callbackNotDone: "Р—Р°РґР°С‡Р° РµС‰Рµ РЅРµ РІС‹РїРѕР»РЅРµРЅР°.",
    callbackActionCancelled: "Р”РµР№СЃС‚РІРёРµ РѕС‚РјРµРЅРµРЅРѕ.",
    callbackActionDonePrompt: "РџРѕРґС‚РІРµСЂРґРёС‚Рµ РІС‹РїРѕР»РЅРµРЅРёРµ.",
    callbackActionUndoPrompt: "РџРѕРґС‚РІРµСЂРґРёС‚Рµ РѕС‚РјРµРЅСѓ РІС‹РїРѕР»РЅРµРЅРёСЏ.",
    callbackActionDeletePrompt: "Подтвердите удаление.",
    callbackCompleted: "Р’С‹РїРѕР»РЅРµРЅРѕ.",
    callbackUncompleted: "Р’РѕР·РІСЂР°С‰РµРЅРѕ РІ В«Рє РІС‹РїРѕР»РЅРµРЅРёСЋВ».",
    callbackDeleted: "Удалено.",
    callbackUnknownAction: "РќРµРёР·РІРµСЃС‚РЅРѕРµ РґРµР№СЃС‚РІРёРµ.",
    callbackError: "РќРµ СѓРґР°Р»РѕСЃСЊ РѕР±СЂР°Р±РѕС‚Р°С‚СЊ РґРµР№СЃС‚РІРёРµ.",
    confirmDoneText: "Р’С‹РїРѕР»РЅРёС‚СЊ СЌС‚Сѓ Р·Р°РґР°С‡Сѓ?",
    confirmUndoText: "Р’РµСЂРЅСѓС‚СЊ Р·Р°РґР°С‡Сѓ РІ СЃС‚Р°С‚СѓСЃ В«Рє РІС‹РїРѕР»РЅРµРЅРёСЋВ»?",
    confirmDeleteText: "Удалить эту задачу?",
    taskLabel: "Р—Р°РґР°С‡Р°",
    statusLabel: "РЎС‚Р°С‚СѓСЃ",
    taskMissingInMessage: "Р”Р°РЅРЅС‹Рµ Р·Р°РґР°С‡Рё Р±РѕР»СЊС€Рµ РЅРµРґРѕСЃС‚СѓРїРЅС‹.",
    statusTodo: "Рљ РІС‹РїРѕР»РЅРµРЅРёСЋ",
    statusInProgress: "Р’ РїСЂРѕС†РµСЃСЃРµ",
    statusDone: "Р’С‹РїРѕР»РЅРµРЅРѕ",
    dashboardHeader: "📊 *Дашборд*",
    dashboardTasks: "Р’СЃРµРіРѕ Р·Р°РґР°С‡",
    dashboardVoiceInputs: "Р“РѕР»РѕСЃРѕРІС‹С… РІРІРѕРґРѕРІ",
    dashboardVoiceTasks: "Р“РѕР»РѕСЃРѕРІС‹С… Р·Р°РґР°С‡",
    dashboardTranscriptionRate: "РЈСЃРїРµС€РЅРѕСЃС‚СЊ С‚СЂР°РЅСЃРєСЂРёРїС†РёРё",
    dashboardConversionRate: "РљРѕРЅРІРµСЂСЃРёСЏ РІ Р·Р°РґР°С‡Сѓ",
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
    return `${index + 1}. ${title}\n\`${shortTaskId(task.id)}\` вЂў ${status}`;
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
  return `вљ пёЏ *${prompt}*\n\n${t.taskLabel}: ${title}\nID: \`${shortTaskId(task.id)}\`\n${t.statusLabel}: ${status}`;
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

async function handleDashboardCommand(chatId: string, userId: string, language: TelegramUiLanguage) {
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

  if (commandText.match(/^\/dashboard(?:@\w+)?$/i)) {
    if (!existingConnection) {
      await sendTelegramMessage(chatId, t.linkFirst);
      return { handled: true as const };
    }
    await handleDashboardCommand(chatId, existingConnection.userId, currentLanguage);
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
