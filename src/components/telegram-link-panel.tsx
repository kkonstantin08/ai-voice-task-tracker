"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n";

type TelegramConnection = {
  chatId: string;
  telegramUsername: string | null;
  linkedAt?: string;
};

type TelegramLinkPanelProps = {
  initialConnection: TelegramConnection | null;
  locale: Locale;
};

type GenerateCodeResponse = {
  error?: string;
  alreadyConnected?: boolean;
  code?: string;
  expiresAt?: string;
  ttlMinutes?: number;
  connection?: TelegramConnection;
};

const labels = {
  en: {
    generateCodeFailed: "Failed to generate code.",
    networkError: "Network error while generating code.",
    title: "Telegram Connection",
    subtitle: "Connect your Telegram account to receive task notifications.",
    connected: "Telegram is connected.",
    username: "Username",
    notSet: "not set",
    chatId: "Chat ID",
    step1: "1. Click Generate Linking Code.",
    step2: "2. Open your Telegram bot and send: `/link 123456` (replace with your code).",
    step3: "3. Once linked, new tasks from voice input will trigger Telegram notifications.",
    generating: "Generating...",
    generateCode: "Generate Linking Code",
    oneTimeCode: "One-time linking code:",
    expiresAt: "Expires at",
    unknown: "Unknown",
  },
  ru: {
    generateCodeFailed: "Не удалось сгенерировать код.",
    networkError: "Сетевая ошибка при генерации кода.",
    title: "Подключение Telegram",
    subtitle: "Подключите Telegram-аккаунт, чтобы получать уведомления о задачах.",
    connected: "Telegram подключен.",
    username: "Имя пользователя",
    notSet: "не указано",
    chatId: "Chat ID",
    step1: "1. Нажмите Сгенерировать код привязки.",
    step2: "2. Откройте бота в Telegram и отправьте: `/link 123456` (замените на свой код).",
    step3: "3. После привязки новые задачи из голосового ввода будут отправляться в Telegram.",
    generating: "Генерация...",
    generateCode: "Сгенерировать код привязки",
    oneTimeCode: "Одноразовый код привязки:",
    expiresAt: "Истекает",
    unknown: "Неизвестно",
  },
} as const;

export function TelegramLinkPanel({ initialConnection, locale }: TelegramLinkPanelProps) {
  const t = labels[locale];
  const [connection, setConnection] = useState<TelegramConnection | null>(initialConnection);
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGenerateCode() {
    if (loading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/telegram/generate-link-code", {
        method: "POST",
        credentials: "include",
      });
      const data = (await response.json()) as GenerateCodeResponse;

      if (!response.ok) {
        setError(data.error ?? t.generateCodeFailed);
        return;
      }

      if (data.alreadyConnected) {
        setConnection(data.connection ?? null);
        setCode(null);
        setExpiresAt(null);
        return;
      }

      setCode(data.code ?? null);
      setExpiresAt(data.expiresAt ?? null);
    } catch {
      setError(t.networkError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">{t.title}</h2>
      <p className="mt-2 text-sm text-slate-600">{t.subtitle}</p>

      {connection ? (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {t.connected}
          <br />
          {t.username}: {connection.telegramUsername ? `@${connection.telegramUsername}` : t.notSet}
          <br />
          {t.chatId}: {connection.chatId}
        </div>
      ) : (
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <p>{t.step1}</p>
          <p>{t.step2}</p>
          <p>{t.step3}</p>
        </div>
      )}

      {!connection ? (
        <button
          type="button"
          onClick={handleGenerateCode}
          disabled={loading}
          className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? t.generating : t.generateCode}
        </button>
      ) : null}

      {code ? (
        <div className="mt-4 rounded-md border border-indigo-200 bg-indigo-50 px-4 py-3">
          <p className="text-sm text-indigo-700">{t.oneTimeCode}</p>
          <p className="mt-1 font-mono text-3xl font-bold tracking-widest text-indigo-900">{code}</p>
          <p className="mt-2 text-xs text-indigo-700">
            {t.expiresAt}: {expiresAt ? new Date(expiresAt).toLocaleString() : t.unknown}
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
    </section>
  );
}
