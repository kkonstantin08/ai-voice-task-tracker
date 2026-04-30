# AI Voice Task Tracker

Веб-приложение и Telegram-бот для управления задачами, созданными голосом.

Пользователь записывает голос в браузере, сервис расшифровывает речь через Mistral, извлекает структуру задачи и сохраняет ее в PostgreSQL. Дальше задачами можно управлять как в веб-интерфейсе, так и через Telegram.

## Оглавление

- [Возможности](#возможности)
- [Технологический стек](#технологический-стек)
- [Архитектура](#архитектура)
- [Требования](#требования)
- [Быстрый старт через Docker](#быстрый-старт-через-docker)
- [Локальный запуск без Docker для app/poller](#локальный-запуск-без-docker-для-apppoller)
- [Переменные окружения](#переменные-окружения)
- [Настройка Telegram-бота](#настройка-telegram-бота)
- [Команды Telegram-бота](#команды-telegram-бота)
- [Скрипты проекта](#скрипты-проекта)
- [API обзор](#api-обзор)
- [Проверка качества](#проверка-качества)
- [Troubleshooting](#troubleshooting)
- [Структура проекта](#структура-проекта)

## Возможности

- Регистрация и логин с HTTP-only сессиями.
- Создание задач из голосового ввода в браузере.
- Транскрибация аудио через Mistral Audio API.
- Извлечение структуры задачи из текста через Mistral Chat API и валидация Zod.
- Управление задачами на сайте: выполнить, отменить выполнение, удалить.
- Управление задачами в Telegram: текстовые команды и inline-кнопки с подтверждением действий.
- Дашборд со статистикой и конверсией.
- Локализация интерфейса (RU/EN) для сайта и бота.

## Технологический стек

- Frontend/Backend: Next.js 16 (App Router), React 19, TypeScript.
- UI: Tailwind CSS 4, shadcn/ui, lucide-react.
- База данных: PostgreSQL 16.
- ORM: Prisma.
- Telegram: Bot API (long polling + webhook handler).
- Инфраструктура: Docker Compose.

## Архитектура

Сервисы в `docker-compose.yml`:

- `db`: PostgreSQL.
- `app`: Next.js приложение (UI + API).
- `telegram-poller`: отдельный воркер long polling.

Поток обработки голоса:

1. Пользователь записывает аудио на странице `/app`.
2. Файл отправляется в `/api/voice/process`.
3. Приложение делает транскрибацию и извлечение задачи.
4. Создаются записи `voice_inputs` и `tasks`.
5. При привязанном Telegram пользователю отправляется уведомление.

## Требования

- Docker Desktop (или Docker Engine + Compose plugin).
- Node.js 20+ (если запускаете локально без контейнера).
- npm 10+.

## Быстрый старт через Docker

### 1) Клонирование и подготовка `.env`

```bash
git clone <URL_ВАШЕГО_РЕПО> ai-voice-task-tracker
cd ai-voice-task-tracker
cp .env.example .env
```

Для Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

### 2) Заполните обязательные переменные

Минимум нужно указать:

- `MISTRAL_API_KEY`
- `TELEGRAM_BOT_TOKEN`

Остальные значения можно оставить как в `.env.example`.

### 3) Запуск

```bash
docker compose up --build -d
```

### 4) Проверка

```bash
docker compose ps
docker compose logs -f app
docker compose logs -f telegram-poller
```

### 5) Открыть приложение

- [http://localhost:3000](http://localhost:3000)

### Полный сброс и запуск с нуля

Если нужно полностью пересоздать БД и контейнеры:

```bash
docker compose down -v --remove-orphans
docker compose up --build -d
```

## Локальный запуск без Docker для app/poller

Рекомендуемый вариант: БД в Docker, app/poller локально.

1. Поднимите только БД:

```bash
docker compose up -d db
```

2. Установите зависимости:

```bash
npm ci
```

3. Примените миграции:

```bash
npx prisma migrate deploy
```

4. Запустите веб-приложение:

```bash
npm run dev
```

5. В отдельном терминале запустите Telegram poller:

```bash
npm run telegram:poll
```

## Переменные окружения

Файл: `.env` (образец: `.env.example`).

| Переменная                              | Обязательна | Описание                                                   |
| --------------------------------------- | ----------- | ---------------------------------------------------------- |
| `APP_URL`                               | да          | Базовый URL приложения (обычно `http://localhost:3000`).   |
| `NODE_ENV`                              | да          | Режим запуска (`development`/`production`).                |
| `DATABASE_URL`                          | да          | Строка подключения PostgreSQL.                             |
| `MISTRAL_API_KEY`                       | да          | Ключ API Mistral.                                          |
| `MISTRAL_BASE_URL`                      | нет         | Базовый URL Mistral API.                                   |
| `MISTRAL_CHAT_MODEL`                    | нет         | Модель для извлечения структуры задачи.                    |
| `MISTRAL_TRANSCRIPTION_MODEL`           | нет         | Модель для транскрибации аудио.                            |
| `TELEGRAM_BOT_TOKEN`                    | да          | Токен бота от BotFather.                                   |
| `TELEGRAM_WEBHOOK_SECRET`               | нет         | Секрет для webhook-режима. Для long polling не обязателен. |
| `TELEGRAM_POLL_TIMEOUT_SECONDS`         | нет         | Таймаут long polling в секундах.                           |
| `TELEGRAM_POLL_RETRY_DELAY_MS`          | нет         | Пауза перед повтором при ошибке poller.                    |
| `TELEGRAM_POLLING_DELETE_WEBHOOK`       | нет         | Удалять webhook при старте poller (`true/false`).          |
| `TELEGRAM_POLLING_DROP_PENDING_UPDATES` | нет         | Сбрасывать отложенные апдейты (`true/false`).              |

## Настройка Telegram-бота

1. Создайте бота через `@BotFather` (`/newbot`).
2. Сохраните токен и добавьте его в `TELEGRAM_BOT_TOKEN`.
3. Запустите проект.
4. В приложении откройте `/settings` и сгенерируйте linking code.
5. Отправьте боту команду:

```text
/link 123456
```

6. После подтверждения бот привязывается к вашему аккаунту.

## Команды Telegram-бота

- `/start` — приветствие и справка.
- `/link <code>` — привязка Telegram к аккаунту.
- `/lang ru` или `/lang en` — язык интерфейса бота.
- `/tasks` — последние голосовые задачи + inline-кнопки действий.
- `/dashboard` — краткая статистика.
- `/done <task_id>` — отметить задачу выполненной.
- `/undo <task_id>` — вернуть задачу в статус "к выполнению".
- `/delete <task_id>` — удалить задачу.

## Скрипты проекта

- `npm run dev` — dev-режим Next.js.
- `npm run build` — production-сборка.
- `npm run start` — запуск production-сборки.
- `npm run lint` — ESLint.
- `npm run telegram:poll` — запуск Telegram long polling воркера.
- `npm run prisma:generate` — генерация Prisma Client.
- `npm run prisma:migrate` — применение миграций (deploy).
- `npm run prisma:dev` — создание/применение миграций в dev.

## API обзор

Основные маршруты (внутренний API приложения):

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/voice/process`
- `POST /api/tasks/voice/complete`
- `POST /api/tasks/voice/uncomplete`
- `POST /api/tasks/voice/delete`
- `GET /api/telegram/status`
- `POST /api/telegram/generate-link-code`
- `POST /api/telegram/webhook` (для webhook-режима)
- `POST /api/locale`

## Проверка качества

Перед коммитом рекомендуется запускать:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Структура проекта

```text
.
├─ prisma/
├─ public/
├─ scripts/
│  └─ telegram-polling.mjs
├─ src/
│  ├─ app/
│  │  ├─ api/
│  │  ├─ app/
│  │  ├─ dashboard/
│  │  ├─ login/
│  │  ├─ register/
│  │  └─ settings/
│  └─ lib/
├─ docker-compose.yml
├─ Dockerfile
└─ .env.example
```

## Лицензия

Лицензия не указана. При необходимости добавьте файл `LICENSE`.
