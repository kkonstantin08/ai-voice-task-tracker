function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  mistralApiKey: process.env.MISTRAL_API_KEY ?? "",
  mistralBaseUrl: process.env.MISTRAL_BASE_URL ?? "https://api.mistral.ai",
  mistralChatModel: process.env.MISTRAL_CHAT_MODEL ?? "mistral-small-latest",
  mistralTranscriptionModel:
    process.env.MISTRAL_TRANSCRIPTION_MODEL ?? "voxtral-mini-latest",
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  telegramWebhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET ?? "",
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
};

export function getMistralApiKey(): string {
  return getRequiredEnv("MISTRAL_API_KEY");
}

export function getTelegramBotToken(): string {
  return getRequiredEnv("TELEGRAM_BOT_TOKEN");
}
