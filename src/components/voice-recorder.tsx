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
  status: string;
  dueDate: string | null;
  createdAt: string;
};

type VoiceApiResponse = {
  error?: string;
  warning?: string;
  transcript?: string;
  task?: ProcessedTask | null;
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
  },
  ru: {
    browserUnsupported: "Ваш браузер не поддерживает запись аудио.",
    micUnavailable: "Нет доступа к микрофону или он недоступен.",
    recordFirst: "Сначала запишите аудио.",
    processFailed: "Не удалось обработать голосовую заметку.",
    networkError: "Сетевая ошибка во время обработки аудио.",
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
  },
} as const;

function extensionFromMimeType(mimeType: string): string {
  if (mimeType.includes("ogg")) return ".ogg";
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return ".m4a";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return ".mp3";
  if (mimeType.includes("wav")) return ".wav";
  return ".webm";
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
  const [transcript, setTranscript] = useState<string>("");
  const [task, setTask] = useState<ProcessedTask | null>(null);
  const [isPending, setIsPending] = useState(false);

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
    } catch {
      setError(t.networkError);
    } finally {
      setIsPending(false);
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
    </section>
  );
}
