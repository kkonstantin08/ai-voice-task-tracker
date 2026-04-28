import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestUser } from "@/lib/request-auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const connection = await prisma.telegramConnection.findUnique({
      where: { userId: user.id },
    });

    if (!connection) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      connection: {
        chatId: connection.chatId,
        telegramUsername: connection.telegramUsername,
        linkedAt: connection.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("GET /api/telegram/status failed", error);
    return NextResponse.json({ error: "Unable to get Telegram status." }, { status: 500 });
  }
}
