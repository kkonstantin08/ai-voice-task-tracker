"use client";

import { startTransition, useDeferredValue, useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";

type VoiceRecorderProps = {
  locale: Locale;
};

type ProcessedTask = {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: "todo" | "in_progress" | "done";
  dueDate: string | null;
  createdAt: string;
};

type VoiceApiResponse = {
  error?: string;
  warning?: string;
  transcript?: string;
  task?: ProcessedTask | null;
};

type VoiceTasksResponse = {
  error?: string;
  tasks?: ProcessedTask[];
};

type CompleteTaskResponse = {
  error?: string;
  task?: ProcessedTask;
};

const preferredMimeTypes = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/ogg",
  "audio/mp4",
];

const labels = {
  en: {
    browserUnsupported: "Your browser does not support audio recording.",
    micUnavailable: "Microphone permission denied or unavailable.",
    recordFirst: "Record audio first.",
    processFailed: "Failed to process voice note.",
    networkError: "Network error while processing audio.",
    loadTasksFailed: "Failed to load your voice tasks.",
    completeTaskFailed: "Failed to complete task.",
    title: "Voice Input",
    subtitle:
      "Record a voice note, upload it, and we will transcribe and extract a structured task.",
    startRecording: "Start Recording",
    stopRecording: "Stop Recording",
    uploadAndProcess: "Upload & Process",
    processing: "Processing...",
    transcript: "Transcript",
    noTranscript: "No transcript yet.",
    extractedTaskJson: "Extracted Task JSON",
    noTask: "No task extracted yet.",
    voiceTasks: "Voice Tasks",
    refresh: "Refresh",
    loadingTasks: "Loading tasks...",
    noVoiceTasks: "No voice-created tasks yet.",
    due: "Due",
    created: "Created",
    statusTodo: "To do",
    statusInProgress: "In progress",
    statusDone: "Done",
    markDone: "Mark done",
    completing: "Completing...",
    completed: "Completed",
  },
  ru: {
    browserUnsupported: "Ваш браузер не поддерживает запись аудио.",
    micUnavailable: "Нет доступа к микрофону или он недоступен.",
    recordFirst: "Сначала запишите аудио.",
    processFailed: "Не удалось обработать голосовую заметку.",
    networkError: "Сетевая ошибка во время обработки аудио.",
    loadTasksFailed: "Не удалось загрузить голосовые задачи.",
    completeTaskFailed: "Не удалось отметить задачу выполненной.",
    title: "Голосовой ввод",
    subtitle: "Запишите заметку, загрузите ее, и мы расшифруем речь и извлечем структуру задачи.",
    startRecording: "Начать запись",
    stopRecording: "Остановить запись",
    uploadAndProcess: "Загрузить и обработать",
    processing: "Обработка...",
    transcript: "Транскрипт",
    noTranscript: "Транскрипта пока нет.",
    extractedTaskJson: "Извлеченная задача (JSON)",
    noTask: "Задача пока не извлечена.",
    voiceTasks: "Голосовые задачи",
    refresh: "Обновить",
    loadingTasks: "Загрузка задач...",
    noVoiceTasks: "Пока нет задач, созданных голосом.",
    due: "Срок",
    created: "Создано",
    statusTodo: "К выполнению",
    statusInProgress: "В процессе",
    statusDone: "Выполнено",
    markDone: "Выполнить",
    completing: "Выполняем...",
    completed: "Выполнено",
  },
} as const;

function extensionFromMimeType(mimeType: string): string {
  if (mimeType.includes("ogg")) return ".ogg";
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return ".m4a";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return ".mp3";
  if (mimeType.includes("wav")) return ".wav";
  return ".webm";
}

function sortTasksByCreatedAt(tasks: ProcessedTask[]): ProcessedTask[] {
  return [...tasks].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export function VoiceRecorder({ locale }: VoiceRecorderProps) {
  const t = labels[locale];
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedMimeType, setRecordedMimeType] = useState("audio/webm");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [task, setTask] = useState<ProcessedTask | null>(null);
  const [voiceTasks, setVoiceTasks] = useState<ProcessedTask[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const deferredTranscript = useDeferredValue(transcript);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    void fetchVoiceTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function statusLabel(status: ProcessedTask["status"]): string {
    if (status === "done") return t.statusDone;
    if (status === "in_progress") return t.statusInProgress;
    return t.statusTodo;
  }

  async function fetchVoiceTasks() {
    setLoadingTasks(true);
    setTasksError(null);
    try {
      const response = await fetch("/api/tasks/voice", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      const data = (await response.json()) as VoiceTasksResponse;
      if (!response.ok) {
        setTasksError(data.error ?? t.loadTasksFailed);
        return;
      }
      setVoiceTasks(sortTasksByCreatedAt(data.tasks ?? []));
    } catch {
      setTasksError(t.loadTasksFailed);
    } finally {
      setLoadingTasks(false);
    }
  }

  async function startRecording() {
    setError(null);
    setWarning(null);
    setTask(null);
    setTranscript("");
    setRecordedBlob(null);
    chunksRef.current = [];

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(t.browserUnsupported);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const supportedMimeType = preferredMimeTypes.find((type) =>
        MediaRecorder.isTypeSupported(type),
      );

      const recorder = supportedMimeType
        ? new MediaRecorder(stream, { mimeType: supportedMimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setRecordedBlob(blob);
        setRecordedMimeType(recorder.mimeType || "audio/webm");
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      recorder.start();
      setIsRecording(true);
    } catch {
      setError(t.micUnavailable);
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      return;
    }

    if (recorder.state !== "inactive") {
      recorder.stop();
    }
    setIsRecording(false);
  }

  async function uploadAudio() {
    if (!recordedBlob) {
      setError(t.recordFirst);
      return;
    }

    setError(null);
    setWarning(null);
    setIsPending(true);

    const extension = extensionFromMimeType(recordedMimeType);
    const file = new File([recordedBlob], `voice-note-${Date.now()}${extension}`, {
      type: recordedMimeType || recordedBlob.type || "audio/webm",
    });

    const formData = new FormData();
    formData.append("audio", file);

    try {
      const response = await fetch("/api/voice/process", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = (await response.json()) as VoiceApiResponse;

      if (!response.ok) {
        setError(data.error ?? t.processFailed);
        return;
      }

      setTranscript(data.transcript ?? "");
      setTask(data.task ?? null);
      setWarning(data.warning ?? null);

      if (data.task) {
        setVoiceTasks((prev) => sortTasksByCreatedAt([data.task as ProcessedTask, ...prev]));
      }
    } catch {
      setError(t.networkError);
    } finally {
      setIsPending(false);
    }
  }

  async function completeTask(taskId: string) {
    if (updatingTaskId) {
      return;
    }

    setUpdatingTaskId(taskId);
    setTasksError(null);
    try {
      const response = await fetch("/api/tasks/voice/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ taskId }),
      });
      const data = (await response.json()) as CompleteTaskResponse;
      if (!response.ok || !data.task) {
        setTasksError(data.error ?? t.completeTaskFailed);
        return;
      }

      setVoiceTasks((prev) =>
        sortTasksByCreatedAt(prev.map((item) => (item.id === taskId ? data.task! : item))),
      );
      if (task?.id === taskId) {
        setTask(data.task);
      }
    } catch {
      setTasksError(t.completeTaskFailed);
    } finally {
      setUpdatingTaskId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">{t.title}</h2>
      <p className="mt-2 text-sm text-slate-600">{t.subtitle}</p>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={startRecording}
          disabled={isRecording || isPending}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t.startRecording}
        </button>
        <button
          type="button"
          onClick={stopRecording}
          disabled={!isRecording || isPending}
          className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t.stopRecording}
        </button>
        <button
          type="button"
          onClick={() => startTransition(() => void uploadAudio())}
          disabled={isRecording || !recordedBlob || isPending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? t.processing : t.uploadAndProcess}
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {warning ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {warning}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">{t.transcript}</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
            {deferredTranscript || t.noTranscript}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
            {t.extractedTaskJson}
          </h3>
          <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-800">
            {task ? JSON.stringify(task, null, 2) : t.noTask}
          </pre>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">{t.voiceTasks}</h3>
          <button
            type="button"
            onClick={() => void fetchVoiceTasks()}
            disabled={loadingTasks}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t.refresh}
          </button>
        </div>

        {tasksError ? (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {tasksError}
          </div>
        ) : null}

        {loadingTasks ? (
          <p className="mt-3 text-sm text-slate-600">{t.loadingTasks}</p>
        ) : voiceTasks.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">{t.noVoiceTasks}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {voiceTasks.map((item) => {
              const isDone = item.status === "done";
              const isUpdating = updatingTaskId === item.id;
              return (
                <li
                  key={item.id}
                  className="flex flex-col gap-2 rounded-md border border-slate-200 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {t.created}: {new Date(item.createdAt).toLocaleString()} • {t.due}:{" "}
                      {item.dueDate ? new Date(item.dueDate).toLocaleString() : "-"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{statusLabel(item.status)}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void completeTask(item.id)}
                    disabled={isDone || isUpdating || Boolean(updatingTaskId)}
                    className="shrink-0 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDone ? t.completed : isUpdating ? t.completing : t.markDone}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
