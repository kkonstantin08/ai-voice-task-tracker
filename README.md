# AI Voice Task Tracker (режим Telegram Long Polling)

Подробная инструкция для новичка: от первого запуска до проверки аналитики.

В этом проекте Telegram подключается через **long polling** (процесс `telegram-poller`), поэтому публичный webhook для локальной разработки не нужен.

---

## Что уже реализовано

- Next.js App Router + TypeScript + Tailwind
- PostgreSQL + Prisma
- Регистрация/логин (bcrypt + HTTP-only cookie-сессии)
- Запись голоса в браузере (`MediaRecorder`)
- Транскрибация через Mistral Audio API
- Извлечение JSON-задачи через Mistral Chat API + Zod валидация
- Telegram linking через `/link 123456`
- Уведомления в Telegram при создании задач
- Dashboard и funnel-аналитика
- Docker Compose с отдельным сервисом `telegram-poller`

---

## 0) Требования

1. Docker Desktop (Windows/Mac) или Docker Engine + Compose Plugin (Linux)
2. Git

Проверка:

```bash
docker --version
docker compose version
git --version
```

---

## 1) Как создать Mistral API Key

1. Откройте [https://console.mistral.ai/](https://console.mistral.ai/).
2. Войдите в аккаунт.
3. Перейдите в раздел API Keys.
4. Нажмите `Create new key`.
5. Скопируйте ключ.

Ключ вставляется в файл `.env` в переменную:

```env
MISTRAL_API_KEY=...
```

---

## 2) Как создать Telegram-бота в BotFather

1. В Telegram найдите `@BotFather`.
2. Отправьте:

```text
/newbot
```

3. Задайте имя бота.
4. Задайте username (должен заканчиваться на `bot`).
5. BotFather вернет токен вида:

```text
1234567890:AA...
```

6. Сохраните токен — это `TELEGRAM_BOT_TOKEN`.

---

## 3) Как создать `.env` из `.env.example`

В корне проекта:

### Windows PowerShell

```powershell
cd "C:\Users\user\Desktop\Заказы\Эля"
Copy-Item .env.example .env
```

### Linux/macOS/Git Bash

```bash
cp .env.example .env
```

Откройте `.env` и заполните минимум:

```env
APP_URL=http://localhost:3000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_voice_task_tracker

MISTRAL_API_KEY=ваш_ключ_mistral
MISTRAL_BASE_URL=https://api.mistral.ai
MISTRAL_CHAT_MODEL=mistral-small-latest
MISTRAL_TRANSCRIPTION_MODEL=voxtral-mini-latest

TELEGRAM_BOT_TOKEN=ваш_токен_бота
TELEGRAM_POLL_TIMEOUT_SECONDS=50
TELEGRAM_POLL_RETRY_DELAY_MS=3000
TELEGRAM_POLLING_DELETE_WEBHOOK=true
TELEGRAM_POLLING_DROP_PENDING_UPDATES=false
```

Примечание:
- `TELEGRAM_WEBHOOK_SECRET` можно оставить, но в long polling он не нужен.

---

## 4) Как запустить `docker compose up --build`

Из корня проекта:

```bash
docker compose up --build
```

Поднимутся сервисы:
- `db` (PostgreSQL)
- `app` (Next.js)
- `telegram-poller` (long polling worker)

Проверка:

```bash
docker compose ps
```

Логи:

```bash
docker compose logs -f app
docker compose logs -f telegram-poller
docker compose logs -f db
```

---

## 5) Как запускать Prisma migrations

Проект уже применяет миграции при старте `app`, но вручную:

```bash
docker compose exec app npx prisma migrate deploy
docker compose exec app npx prisma migrate status
```

Проверка таблиц:

```bash
docker compose exec db psql -U postgres -d ai_voice_task_tracker -c "\dt"
```

Ожидаемые таблицы:
- `users`
- `sessions`
- `voice_inputs`
- `tasks`
- `telegram_connections`
- `telegram_link_codes`
- `analytics_events`

---

## 6) Как открыть приложение в браузере

Откройте:

[http://localhost:3000](http://localhost:3000)

Основные страницы:
- `/`
- `/register`
- `/login`
- `/app`
- `/settings`
- `/dashboard`

---

## 7) Как протестировать регистрацию

1. Откройте [http://localhost:3000/register](http://localhost:3000/register)
2. Введите email + password (минимум 8 символов)
3. Нажмите `Register`
4. После успеха откроется `/app`

Проверка в БД:

```bash
echo 'select id,email,"createdAt" from users order by "createdAt" desc limit 5;' | docker compose exec -T db psql -U postgres -d ai_voice_task_tracker
```

---

## 8) Как протестировать голосовой ввод

1. Перейдите на `/app`
2. Нажмите `Start Recording`
3. Разрешите микрофон
4. Скажите задачу голосом
5. Нажмите `Stop Recording`
6. Нажмите `Upload & Process`

Ожидаемый результат:
- Появился `Transcript`
- Появился `Extracted Task JSON`

Если ошибка:

```bash
docker compose logs -f app
```

---

## 9) Как протестировать Mistral LLM processing

После шага 8 проверьте:
- в UI есть транскрипт
- в JSON есть поля `title`, `description`, `category`, `priority`, `status`, `dueDate`

Проверка `tasks`:

```bash
echo 'select id,title,category,priority,status,"dueDate","createdAt" from tasks order by "createdAt" desc limit 10;' | docker compose exec -T db psql -U postgres -d ai_voice_task_tracker
```

Проверка `voice_inputs`:

```bash
echo 'select id,transcript,"audioFileName","createdAt" from voice_inputs order by "createdAt" desc limit 10;' | docker compose exec -T db psql -U postgres -d ai_voice_task_tracker
```

---

## 10) Как подключить Telegram (через long polling)

1. Убедитесь, что `telegram-poller` запущен:

```bash
docker compose ps
docker compose logs -f telegram-poller
```

2. Откройте `/settings`
3. Нажмите `Generate Linking Code`
4. Возьмите код, например `123456`
5. В чате с ботом отправьте:

```text
/link 123456
```

6. Бот должен ответить подтверждением
7. В `/settings` статус станет `Telegram is connected`

Проверка в БД:

```bash
echo 'select id,"userId","chatId","telegramUsername","createdAt" from telegram_connections order by "createdAt" desc limit 5;' | docker compose exec -T db psql -U postgres -d ai_voice_task_tracker
```

---

## 11) Как запускать long polling на VM (без webhook)

Ниже пример для Ubuntu VM.

### 11.1 Установка базовых пакетов

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin git
sudo systemctl enable docker
sudo systemctl start docker
```

### 11.2 Клонирование проекта и запуск

```bash
git clone <URL_РЕПОЗИТОРИЯ> ai-voice-task-tracker
cd ai-voice-task-tracker
cp .env.example .env
nano .env
docker compose up -d --build
```

### 11.3 Важно: отключить webhook, если раньше включали

Если бот раньше работал через webhook, удалите его:

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/deleteWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"drop_pending_updates\":false}"
```

Проверка:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

В ответе `url` должен быть пустой (`""`).

### 11.4 Проверка poller на VM

```bash
docker compose logs -f telegram-poller
```

Ожидайте сообщение:
- `Starting Telegram long polling worker...`

---

## 12) Как проверить dashboard и funnel analytics

Откройте:

[http://localhost:3000/dashboard](http://localhost:3000/dashboard)

Проверьте карточки:
- `Total Tasks`
- `Total Voice Inputs`
- `Transcription Success Rate`
- `Task Conversion Rate`

И блоки:
- `Tasks by Category`
- `Funnel Analytics`
- `Recent Tasks`

SQL-проверка событий:

```bash
docker compose exec db psql -U postgres -d ai_voice_task_tracker -c "select \"eventName\", count(*) from analytics_events group by \"eventName\" order by count(*) desc;"
```

Ожидаемые события:
- `register_success`
- `login_success`
- `voice_uploaded`
- `transcription_succeeded`
- `task_created_from_voice`
- `telegram_link_code_generated`
- `telegram_linked`

---

## Полезные команды

Перезапуск всех сервисов:

```bash
docker compose restart
```

Перезапуск только poller:

```bash
docker compose restart telegram-poller
```

Остановка:

```bash
docker compose down
```

Полный сброс БД:

```bash
docker compose down -v
```

---

## Важные файлы

- `docker-compose.yml`
- `.env.example`
- `scripts/telegram-polling.mjs`
- `src/app/api/telegram/webhook/route.ts` (опционально, если захотите webhook-режим)
- `src/lib/telegram-update-handler.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20260428120000_init/migration.sql`

---

## Официальные ссылки

- Mistral Console: [https://console.mistral.ai/](https://console.mistral.ai/)
- Telegram Bot API: [https://core.telegram.org/bots/api](https://core.telegram.org/bots/api)
