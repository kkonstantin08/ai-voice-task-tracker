import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestUser } from "@/lib/request-auth";
import { trackEvent } from "@/lib/analytics";

type DeleteVoiceTaskPayload = {
  taskId?: string;
};

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as DeleteVoiceTaskPayload;
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
      select: { id: true },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Voice task not found." }, { status: 404 });
    }

    await prisma.task.delete({
      where: { id: existingTask.id },
    });

    await trackEvent(user.id, "task_deleted_from_web", { taskId: existingTask.id });

    return NextResponse.json({ deletedTaskId: existingTask.id });
  } catch (error) {
    console.error("POST /api/tasks/voice/delete failed", error);
    return NextResponse.json({ error: "Unable to delete voice task." }, { status: 500 });
  }
}
