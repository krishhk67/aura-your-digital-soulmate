import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

async function callGateway(messages: ChatMsg[], opts?: { json?: boolean }) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI is not configured (missing LOVABLE_API_KEY).");

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      ...(opts?.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (res.status === 429) throw new Error("AI rate limit reached. Try again in a moment.");
  if (res.status === 402) throw new Error("AI credits exhausted. Please add credits to continue.");
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI request failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

const MessagesInput = z.object({
  messages: z
    .array(z.object({ sender: z.string().min(1).max(80), content: z.string().min(1).max(2000) }))
    .min(1)
    .max(40),
});

export const smartReplies = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => MessagesInput.parse(input))
  .handler(async ({ data }) => {
    const transcript = data.messages.map((m) => `${m.sender}: ${m.content}`).join("\n");
    const raw = await callGateway(
      [
        {
          role: "system",
          content:
            'You suggest short, natural chat replies. Return strict JSON: {"replies": ["...", "...", "..."]} with exactly 3 replies, each under 80 chars, friendly tone, no quotes around them, no emojis unless natural.',
        },
        {
          role: "user",
          content: `Recent conversation (most recent last). Suggest 3 reply options for the LAST sender's counterpart.\n\n${transcript}`,
        },
      ],
      { json: true },
    );
    try {
      const parsed = JSON.parse(raw) as { replies?: unknown };
      const replies = Array.isArray(parsed.replies)
        ? parsed.replies.filter((r): r is string => typeof r === "string").slice(0, 3)
        : [];
      return { replies };
    } catch {
      return { replies: [] as string[] };
    }
  });

const RewriteInput = z.object({
  text: z.string().min(1).max(2000),
  tone: z.enum(["friendly", "professional", "flirty", "concise", "funny", "supportive"]),
});

export const rewriteTone = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => RewriteInput.parse(input))
  .handler(async ({ data }) => {
    const text = await callGateway([
      {
        role: "system",
        content:
          "Rewrite the user's message in the requested tone. Keep meaning and language. Return only the rewritten message — no preface, no quotes.",
      },
      { role: "user", content: `Tone: ${data.tone}\n\nMessage:\n${data.text}` },
    ]);
    return { text };
  });

export const summarizeChat = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => MessagesInput.parse(input))
  .handler(async ({ data }) => {
    const transcript = data.messages.map((m) => `${m.sender}: ${m.content}`).join("\n");
    const summary = await callGateway([
      {
        role: "system",
        content:
          "Summarize the chat in 3-6 short bullet points. Capture key topics, decisions, and open questions. Use markdown bullets.",
      },
      { role: "user", content: transcript },
    ]);
    return { summary };
  });

export const detectMood = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => MessagesInput.parse(input))
  .handler(async ({ data }) => {
    const transcript = data.messages.slice(-12).map((m) => `${m.sender}: ${m.content}`).join("\n");
    const raw = await callGateway(
      [
        {
          role: "system",
          content:
            'Analyze the overall mood of the conversation. Return strict JSON: {"mood": "<one-word>", "emoji": "<single emoji>", "summary": "<one sentence, <120 chars>"}.',
        },
        { role: "user", content: transcript },
      ],
      { json: true },
    );
    try {
      const parsed = JSON.parse(raw) as { mood?: string; emoji?: string; summary?: string };
      return {
        mood: parsed.mood ?? "neutral",
        emoji: parsed.emoji ?? "😐",
        summary: parsed.summary ?? "",
      };
    } catch {
      return { mood: "neutral", emoji: "😐", summary: "" };
    }
  });
