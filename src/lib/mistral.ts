import { env, getMistralApiKey } from "@/lib/env";
import { taskExtractionSchema, type TaskExtractionResult } from "@/lib/validation";

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
};

type TranscriptionResponse = {
  text?: string;
};

function extractFirstJsonObject(input: string): string {
  const start = input.indexOf("{");
  const end = input.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in model response");
  }

  return input.slice(start, end + 1);
}

function normalizeMessageContent(
  content: string | Array<{ type?: string; text?: string }> | undefined,
): string {
  if (!content) {
    return "";
  }
  if (typeof content === "string") {
    return content;
  }

  return content
    .map((part) => (part.type === "text" || !part.type ? (part.text ?? "") : ""))
    .join("")
    .trim();
}

export async function transcribeWithMistral(file: File): Promise<string> {
  const apiKey = getMistralApiKey();
  const formData = new FormData();
  formData.append("model", env.mistralTranscriptionModel);
  formData.append("file", file, file.name || "voice-note.webm");

  const response = await fetch(`${env.mistralBaseUrl}/v1/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const rawBody = await response.text();
    throw new Error(`Mistral transcription failed: ${response.status} ${rawBody}`);
  }

  const data = (await response.json()) as TranscriptionResponse;
  const transcript = data.text?.trim();

  if (!transcript) {
    throw new Error("Mistral transcription returned an empty transcript");
  }

  return transcript;
}

export async function extractTaskWithMistral(
  transcript: string,
): Promise<TaskExtractionResult> {
  const apiKey = getMistralApiKey();
  const systemPrompt = [
    "You extract structured task data from voice note transcripts.",
    "Return JSON only, no markdown, no explanations.",
    "The JSON must match exactly this schema:",
    '{"title":"string","description":"string","category":"work|personal|study|health|finance|other","priority":"low|medium|high","status":"todo","dueDate":"ISO date string or null"}',
    "If information is missing, infer minimally.",
    "Always set status to todo.",
  ].join("\n");

  const response = await fetch(`${env.mistralBaseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: env.mistralChatModel,
      temperature: 0,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Transcript:\n${transcript}` },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const rawBody = await response.text();
    throw new Error(`Mistral chat completion failed: ${response.status} ${rawBody}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const messageContent = normalizeMessageContent(data.choices?.[0]?.message?.content);
  if (!messageContent) {
    throw new Error("Mistral chat completion returned empty content");
  }

  const parsed = JSON.parse(extractFirstJsonObject(messageContent));
  return taskExtractionSchema.parse(parsed);
}
