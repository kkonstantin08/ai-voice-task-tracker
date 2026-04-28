import { NextRequest, NextResponse } from "next/server";
import { ALLOWED_AUDIO_EXTENSIONS, ALLOWED_AUDIO_MIME_TYPES, MAX_AUDIO_SIZE_BYTES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { getRequestUser } from "@/lib/request-auth";
import { extractTaskWithMistral, transcribeWithMistral } from "@/lib/mistral";
import { sendTelegramMessage, taskCreatedMessage } from "@/lib/telegram";
import { trackEvent } from "@/lib/analytics";

function hasAllowedAudioExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  return ALLOWED_AUDIO_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

function validateAudioFile(file: File): string | null {
  if (file.size === 0) {
    return "Uploaded audio file is empty.";
  }

  if (file.size > MAX_AUDIO_SIZE_BYTES) {
    return "Audio file exceeds the 10 MB limit.";
  }

  const mimeTypeAllowed = ALLOWED_AUDIO_MIME_TYPES.includes(file.type.toLowerCase());
  const extensionAllowed = hasAllowedAudioExtension(file.name || "");

  if (!mimeTypeAllowed && !extensionAllowed) {
    return "Unsupported audio type. Allowed: webm, ogg, mp3, wav, m4a.";
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const audio = formData.get("audio");
    if (!(audio instanceof File)) {
      return NextResponse.json({ error: "Audio file is required." }, { status: 400 });
    }

    const validationError = validateAudioFile(audio);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    await trackEvent(user.id, "voice_uploaded", {
      sizeBytes: audio.size,
      mimeType: audio.type || "unknown",
    });

    let transcript: string;
    try {
      transcript = await transcribeWithMistral(audio);
      await trackEvent(user.id, "transcription_succeeded");
    } catch (error) {
      console.error("Mistral transcription failed", error);
      await trackEvent(user.id, "transcription_failed");
      return NextResponse.json(
        { error: "Unable to transcribe audio right now. Please try again." },
        { status: 502 },
      );
    }

    const voiceInput = await prisma.voiceInput.create({
      data: {
        userId: user.id,
        transcript,
        audioFileName: audio.name || "voice-note",
      },
    });

    await trackEvent(user.id, "voice_input_saved", { voiceInputId: voiceInput.id });

    try {
      const extractedTask = await extractTaskWithMistral(transcript);
      const task = await prisma.task.create({
        data: {
          userId: user.id,
          voiceInputId: voiceInput.id,
          title: extractedTask.title,
          description: extractedTask.description,
          category: extractedTask.category,
          priority: extractedTask.priority,
          status: extractedTask.status,
          dueDate: extractedTask.dueDate ? new Date(extractedTask.dueDate) : null,
          sourceTranscript: transcript,
        },
      });

      await trackEvent(user.id, "task_created_from_voice", {
        taskId: task.id,
        category: task.category,
      });

      const telegramConnection = await prisma.telegramConnection.findUnique({
        where: { userId: user.id },
      });

      if (telegramConnection) {
        try {
          await sendTelegramMessage(
            telegramConnection.chatId,
            taskCreatedMessage(task.title, task.dueDate),
          );
          await trackEvent(user.id, "telegram_notification_sent", { taskId: task.id });
        } catch (error) {
          console.error("Telegram notification failed", error);
          await trackEvent(user.id, "telegram_notification_failed", { taskId: task.id });
        }
      }

      return NextResponse.json({
        transcript,
        task: {
          id: task.id,
          title: task.title,
          description: task.description,
          category: task.category,
          priority: task.priority,
          status: task.status,
          dueDate: task.dueDate ? task.dueDate.toISOString() : null,
          createdAt: task.createdAt.toISOString(),
        },
      });
    } catch (error) {
      console.error("Task extraction failed", error);
      await trackEvent(user.id, "task_extraction_failed");
      return NextResponse.json({
        transcript,
        task: null,
        warning:
          "Transcript was saved, but task extraction failed. You can retry with another voice note.",
      });
    }
  } catch (error) {
    console.error("POST /api/voice/process failed", error);
    return NextResponse.json({ error: "Unable to process voice note." }, { status: 500 });
  }
}
