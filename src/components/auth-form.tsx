"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader>
        <CardTitle>{isRegister ? t.createAccount : t.welcomeBack}</CardTitle>
        <CardDescription>{isRegister ? t.registerIntro : t.loginIntro}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t.email}</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t.emailPlaceholder}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t.password}</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete={isRegister ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t.passwordPlaceholder}
            />
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? t.pleaseWait : isRegister ? t.register : t.login}
          </Button>
        </form>

        <Separator className="my-5" />

        <p className="text-sm text-muted-foreground">
          {isRegister ? t.alreadyHaveAccount : t.needAccount}{" "}
          <Link href={isRegister ? "/login" : "/register"} className="font-medium text-foreground">
            {isRegister ? t.login : t.register}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
