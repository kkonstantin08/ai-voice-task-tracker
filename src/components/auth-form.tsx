"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type { Locale } from "@/lib/i18n";

type AuthFormMode = "register" | "login";

type AuthFormProps = {
  mode: AuthFormMode;
  locale: Locale;
};

const labels = {
  en: {
    authFailed: "Authentication failed.",
    networkError: "Unexpected network error. Please try again.",
    createAccount: "Create account",
    welcomeBack: "Welcome back",
    registerIntro: "Start converting voice notes into structured tasks.",
    loginIntro: "Log in to continue tracking tasks from voice.",
    email: "Email",
    password: "Password",
    emailPlaceholder: "you@example.com",
    passwordPlaceholder: "At least 8 characters",
    pleaseWait: "Please wait...",
    register: "Register",
    login: "Login",
    alreadyHaveAccount: "Already have an account?",
    needAccount: "Need an account?",
  },
  ru: {
    authFailed: "Ошибка авторизации.",
    networkError: "Сетевая ошибка. Попробуйте еще раз.",
    createAccount: "Создать аккаунт",
    welcomeBack: "С возвращением",
    registerIntro: "Преобразуйте голосовые заметки в структурированные задачи.",
    loginIntro: "Войдите, чтобы продолжить работу с задачами.",
    email: "Email",
    password: "Пароль",
    emailPlaceholder: "you@example.com",
    passwordPlaceholder: "Минимум 8 символов",
    pleaseWait: "Подождите...",
    register: "Регистрация",
    login: "Войти",
    alreadyHaveAccount: "Уже есть аккаунт?",
    needAccount: "Нужен аккаунт?",
  },
} as const;

export function AuthForm({ mode, locale }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isRegister = mode === "register";
  const t = labels[locale];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(isRegister ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? t.authFailed);
        return;
      }

      router.push("/app");
      router.refresh();
    } catch {
      setError(t.networkError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
    >
      <h1 className="text-2xl font-semibold text-slate-900">
        {isRegister ? t.createAccount : t.welcomeBack}
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        {isRegister ? t.registerIntro : t.loginIntro}
      </p>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">{t.email}</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-slate-500"
            placeholder={t.emailPlaceholder}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">{t.password}</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete={isRegister ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-slate-500"
            placeholder={t.passwordPlaceholder}
          />
        </label>
      </div>

      {error ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 w-full rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? t.pleaseWait : isRegister ? t.register : t.login}
      </button>

      <p className="mt-4 text-sm text-slate-600">
        {isRegister ? t.alreadyHaveAccount : t.needAccount}{" "}
        <Link
          href={isRegister ? "/login" : "/register"}
          className="font-medium text-slate-900 underline underline-offset-2"
        >
          {isRegister ? t.login : t.register}
        </Link>
      </p>
    </form>
  );
}
