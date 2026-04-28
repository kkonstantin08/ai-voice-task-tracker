import { randomInt } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestUser } from "@/lib/request-auth";
import { trackEvent } from "@/lib/analytics";

const LINK_CODE_TTL_MINUTES = 10;

async function makeUniqueCode() {
  for (let index = 0; index < 8; index += 1) {
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const existing = await prisma.telegramLinkCode.findFirst({
      where: {
        code,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!existing) {
      return code;
    }
  }

  throw new Error("Could not allocate a unique Telegram link code.");
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const connection = await prisma.telegramConnection.findUnique({
      where: { userId: user.id },
    });
    if (connection) {
      return NextResponse.json({
        alreadyConnected: true,
        connection: {
          chatId: connection.chatId,
          telegramUsername: connection.telegramUsername,
        },
      });
    }

    const code = await makeUniqueCode();
    const expiresAt = new Date(Date.now() + LINK_CODE_TTL_MINUTES * 60 * 1000);

    await prisma.telegramLinkCode.create({
      data: {
        userId: user.id,
        code,
        expiresAt,
      },
    });

    await trackEvent(user.id, "telegram_link_code_generated");

    return NextResponse.json({
      code,
      expiresAt: expiresAt.toISOString(),
      ttlMinutes: LINK_CODE_TTL_MINUTES,
    });
  } catch (error) {
    console.error("POST /api/telegram/generate-link-code failed", error);
    return NextResponse.json({ error: "Unable to generate link code." }, { status: 500 });
  }
}
