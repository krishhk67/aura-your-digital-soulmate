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

const REPLY_STYLES = ["chill", "funny", "savage", "romantic", "formal", "genz"] as const;
type ReplyStyle = (typeof REPLY_STYLES)[number];

const SmartRepliesInput = z.object({
  messages: MessagesInput.shape.messages,
  style: z.enum(REPLY_STYLES).optional(),
});

export const smartReplies = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SmartRepliesInput.parse(input))
  .handler(async ({ data }) => {
    const transcript = data.messages.map((m) => `${m.sender}: ${m.content}`).join("\n");
    const styleHint: Record<ReplyStyle, string> = {
      chill: "casual, easy-going, warm",
      funny: "light, witty, playful (no cringe)",
      savage: "playfully sharp, confident clapback (never mean or offensive)",
      romantic: "sweet, affectionate, sincere",
      formal: "polite, professional, well-formed",
      genz: "Gen-Z slang, lowercase, brief, vibey (no hashtags)",
    };
    const tone = data.style ? styleHint[data.style] : "natural, friendly, context-appropriate";
    const raw = await callGateway(
      [
        {
          role: "system",
          content:
            `You suggest short chat replies. Return strict JSON: {"replies":["...","...","..."]} with exactly 3 replies, each under 90 chars. Tone: ${tone}. No surrounding quotes. No emojis unless natural.`,
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

const REWRITE_TONES = [
  "friendly",
  "professional",
  "flirty",
  "concise",
  "funny",
  "supportive",
  "formal",
  "confident",
  "genz",
] as const;

const RewriteInput = z.object({
  text: z.string().min(1).max(2000),
  tone: z.enum(REWRITE_TONES),
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

const SingleTextInput = z.object({ text: z.string().min(1).max(4000) });

export const fixGrammar = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SingleTextInput.parse(input))
  .handler(async ({ data }) => {
    const text = await callGateway([
      {
        role: "system",
        content:
          "Correct grammar, spelling and punctuation while preserving the original meaning, language and tone. Return only the corrected text — no preface, no quotes.",
      },
      { role: "user", content: data.text },
    ]);
    return { text };
  });

export const shortenMessage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SingleTextInput.parse(input))
  .handler(async ({ data }) => {
    const text = await callGateway([
      {
        role: "system",
        content:
          "Rewrite the message to be much shorter while keeping meaning and tone. Same language. Return only the rewritten text.",
      },
      { role: "user", content: data.text },
    ]);
    return { text };
  });

export const expandMessage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SingleTextInput.parse(input))
  .handler(async ({ data }) => {
    const text = await callGateway([
      {
        role: "system",
        content:
          "Expand the message with helpful detail and clearer phrasing while preserving meaning, language and tone. Return only the rewritten text.",
      },
      { role: "user", content: data.text },
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

const MOODS = ["happy", "calm", "professional", "sad", "heated", "late_night", "excited", "neutral"] as const;

export const detectMood = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => MessagesInput.parse(input))
  .handler(async ({ data }) => {
    const transcript = data.messages.slice(-14).map((m) => `${m.sender}: ${m.content}`).join("\n");
    const raw = await callGateway(
      [
        {
          role: "system",
          content:
            `Classify the overall mood of the conversation into exactly one of: ${MOODS.join(", ")}. Return strict JSON: {"mood":"<one>","emoji":"<single emoji>","summary":"<one sentence, <120 chars>"}.`,
        },
        { role: "user", content: transcript },
      ],
      { json: true },
    );
    try {
      const parsed = JSON.parse(raw) as { mood?: string; emoji?: string; summary?: string };
      const mood = (MOODS as readonly string[]).includes(parsed.mood ?? "") ? (parsed.mood as string) : "neutral";
      return { mood, emoji: parsed.emoji ?? "😐", summary: parsed.summary ?? "" };
    } catch {
      return { mood: "neutral", emoji: "😐", summary: "" };
    }
  });

// ───── Profile / Group / Room generators ─────

const ProfileGenInput = z.object({
  kind: z.enum(["bio", "username", "status"]),
  hint: z.string().max(500).optional(),
});

export const generateProfileText = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ProfileGenInput.parse(input))
  .handler(async ({ data }) => {
    const systemByKind: Record<typeof data.kind, string> = {
      bio: "Generate a short, original chat-app profile bio (max 140 chars). Friendly, modern, no hashtags. Return only the bio.",
      username: 'Suggest 5 short creative usernames (3-15 chars, lowercase, letters/numbers/underscore only). Return strict JSON: {"items":["...", ...]}.',
      status: "Generate a single short status line for a chat profile (max 60 chars). Casual, vibey. Return only the status.",
    };
    if (data.kind === "username") {
      const raw = await callGateway(
        [
          { role: "system", content: systemByKind.username },
          { role: "user", content: data.hint?.trim() || "Generic creative usernames." },
        ],
        { json: true },
      );
      try {
        const parsed = JSON.parse(raw) as { items?: unknown };
        const items = Array.isArray(parsed.items)
          ? parsed.items.filter((s): s is string => typeof s === "string").slice(0, 5)
          : [];
        return { items };
      } catch {
        return { items: [] as string[] };
      }
    }
    const text = await callGateway([
      { role: "system", content: systemByKind[data.kind] },
      { role: "user", content: data.hint?.trim() || "No specific hint, be creative." },
    ]);
    return { text };
  });

const CommunityGenInput = z.object({
  kind: z.enum(["welcome", "description", "rules", "activity_summary"]),
  name: z.string().max(120).optional(),
  topic: z.string().max(500).optional(),
  messages: z
    .array(z.object({ sender: z.string().min(1).max(80), content: z.string().min(1).max(2000) }))
    .max(40)
    .optional(),
});

export const generateCommunityText = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => CommunityGenInput.parse(input))
  .handler(async ({ data }) => {
    const ctx = `${data.name ? `Name: ${data.name}\n` : ""}${data.topic ? `Topic: ${data.topic}\n` : ""}`.trim();
    const transcript =
      data.messages?.slice(-30).map((m) => `${m.sender}: ${m.content}`).join("\n") ?? "";
    const sys: Record<typeof data.kind, string> = {
      welcome: "Write a warm, concise welcome message for a new member of this community (max 280 chars). Return only the message.",
      description: "Write a clear, friendly community description (1-2 sentences, max 200 chars). Return only the description.",
      rules: "Generate 5 short, fair community rules as a markdown numbered list. Keep each rule under 90 chars.",
      activity_summary: "Summarize recent activity in 3-6 markdown bullets covering topics, key moments and open questions.",
    };
    const text = await callGateway([
      { role: "system", content: sys[data.kind] },
      {
        role: "user",
        content:
          data.kind === "activity_summary"
            ? `${ctx}\n\nRecent messages:\n${transcript || "(no recent messages)"}`
            : ctx || "No specific context, be creative but generic.",
      },
    ]);
    return { text };
  });
