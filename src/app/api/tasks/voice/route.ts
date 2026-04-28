import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestUser } from "@/lib/request-auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tasks = await prisma.task.findMany({
      where: {
        userId: user.id,
        voiceInputId: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        priority: true,
        status: true,
        dueDate: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      tasks: tasks.map((task) => ({
        ...task,
        dueDate: task.dueDate ? task.dueDate.toISOString() : null,
        createdAt: task.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("GET /api/tasks/voice failed", error);
    return NextResponse.json({ error: "Unable to load voice tasks." }, { status: 500 });
  }
}
