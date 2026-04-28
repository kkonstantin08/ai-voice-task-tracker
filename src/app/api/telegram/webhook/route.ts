import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { handleTelegramUpdate, type TelegramUpdate } from "@/lib/telegram-update-handler";

export async function POST(request: NextRequest) {
  try {
    const secretHeader = request.headers.get("x-telegram-bot-api-secret-token");
    if (
      env.telegramWebhookSecret &&
      (!secretHeader || secretHeader !== env.telegramWebhookSecret)
    ) {
      return NextResponse.json({ error: "Invalid webhook secret." }, { status: 401 });
    }

    const payload = (await request.json()) as TelegramUpdate;
    await handleTelegramUpdate(payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/telegram/webhook failed", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
