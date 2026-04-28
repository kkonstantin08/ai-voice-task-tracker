"use client";

import { useState } from "react";

type TelegramConnection = {
  chatId: string;
  telegramUsername: string | null;
  linkedAt?: string;
};

type TelegramLinkPanelProps = {
  initialConnection: TelegramConnection | null;
};

type GenerateCodeResponse = {
  error?: string;
  alreadyConnected?: boolean;
  code?: string;
  expiresAt?: string;
  ttlMinutes?: number;
  connection?: TelegramConnection;
};

export function TelegramLinkPanel({ initialConnection }: TelegramLinkPanelProps) {
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
        setError(data.error ?? "Failed to generate code.");
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
      setError("Network error while generating code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Telegram Connection</h2>
      <p className="mt-2 text-sm text-slate-600">
        Connect your Telegram account to receive task notifications.
      </p>

      {connection ? (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Telegram is connected.
          <br />
          Username: {connection.telegramUsername ? `@${connection.telegramUsername}` : "not set"}
          <br />
          Chat ID: {connection.chatId}
        </div>
      ) : (
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <p>1. Click Generate Linking Code.</p>
          <p>2. Open your Telegram bot and send: `/link 123456` (replace with your code).</p>
          <p>3. Once linked, new tasks from voice input will trigger Telegram notifications.</p>
        </div>
      )}

      {!connection ? (
        <button
          type="button"
          onClick={handleGenerateCode}
          disabled={loading}
          className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Generating..." : "Generate Linking Code"}
        </button>
      ) : null}

      {code ? (
        <div className="mt-4 rounded-md border border-indigo-200 bg-indigo-50 px-4 py-3">
          <p className="text-sm text-indigo-700">One-time linking code:</p>
          <p className="mt-1 font-mono text-3xl font-bold tracking-widest text-indigo-900">{code}</p>
          <p className="mt-2 text-xs text-indigo-700">
            Expires at: {expiresAt ? new Date(expiresAt).toLocaleString() : "Unknown"}
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
