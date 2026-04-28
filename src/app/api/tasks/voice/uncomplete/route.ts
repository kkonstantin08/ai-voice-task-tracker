import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestUser } from "@/lib/request-auth";
import { trackEvent } from "@/lib/analytics";

type UncompleteVoiceTaskPayload = {
  taskId?: string;
};

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as UncompleteVoiceTaskPayload;
    const taskId = body?.taskId?.trim();
    if (!taskId) {
      return NextResponse.json({ error: "taskId is required." }, { status: 400 });
    }

    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId: user.id,
        voiceInputId: { not: null },
      },
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

    if (!existingTask) {
      return NextResponse.json({ error: "Voice task not found." }, { status: 404 });
    }

    if (existingTask.status !== "done") {
      return NextResponse.json({
        task: {
          ...existingTask,
          dueDate: existingTask.dueDate ? existingTask.dueDate.toISOString() : null,
          createdAt: existingTask.createdAt.toISOString(),
        },
      });
    }

    const updatedTask = await prisma.task.update({
      where: { id: existingTask.id },
      data: { status: "todo" },
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

    await trackEvent(user.id, "task_uncompleted_from_web", { taskId: updatedTask.id });

    return NextResponse.json({
      task: {
        ...updatedTask,
        dueDate: updatedTask.dueDate ? updatedTask.dueDate.toISOString() : null,
        createdAt: updatedTask.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("POST /api/tasks/voice/uncomplete failed", error);
    return NextResponse.json({ error: "Unable to uncomplete voice task." }, { status: 500 });
  }
}
