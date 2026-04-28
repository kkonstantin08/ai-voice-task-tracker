"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
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
    confirmPassword: "Confirm password",
    emailPlaceholder: "you@example.com",
    passwordPlaceholder: "At least 8 characters",
    confirmPasswordPlaceholder: "Repeat your password",
    passwordMismatch: "Passwords do not match.",
    showPassword: "Show password",
    hidePassword: "Hide password",
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
    confirmPassword: "Повторите пароль",
    emailPlaceholder: "you@example.com",
    passwordPlaceholder: "Минимум 8 символов",
    confirmPasswordPlaceholder: "Введите пароль еще раз",
    passwordMismatch: "Пароли не совпадают.",
    showPassword: "Показать пароль",
    hidePassword: "Скрыть пароль",
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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isRegister = mode === "register";
  const t = labels[locale];
  const passwordMismatch = isRegister && password !== confirmPassword;
  const passwordType = showPassword ? "text" : "password";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) {
      return;
    }

    if (isRegister && passwordMismatch) {
      setError(t.passwordMismatch);
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
            <div className="relative">
              <Input
                id="password"
                type={passwordType}
                required
                minLength={8}
                autoComplete={isRegister ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t.passwordPlaceholder}
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                title={showPassword ? t.hidePassword : t.showPassword}
                aria-label={showPassword ? t.hidePassword : t.showPassword}
                className="absolute top-1/2 right-2 inline-flex -translate-y-1/2 items-center justify-center rounded p-1 text-muted-foreground transition hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {isRegister ? (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t.confirmPassword}</Label>
              <Input
                id="confirmPassword"
                type={passwordType}
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder={t.confirmPasswordPlaceholder}
              />
              {passwordMismatch ? <p className="text-xs text-red-600">{t.passwordMismatch}</p> : null}
            </div>
          ) : null}

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Button type="submit" disabled={submitting || passwordMismatch} className="w-full">
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
