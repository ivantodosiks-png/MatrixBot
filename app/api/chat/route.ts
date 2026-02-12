import { NextResponse } from "next/server";

export const runtime = "nodejs";

const OPENAI_API_URL =
  process.env.OPENAI_API_URL || "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const SYSTEM_PROMPT = String(process.env.SYSTEM_PROMPT ?? "").trim();

type ChatBody = {
  messages?: Array<{ role: string; content: string }>;
  model?: string;
  max_tokens?: number;
  maxTokens?: number;
  temperature?: number;
};

export async function POST(request: Request) {
  const apiKey = String(process.env.OPENAI_API_KEY ?? "").trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: { message: "OPENAI_API_KEY is missing in environment" } },
      { status: 500 }
    );
  }
  if (apiKey.includes("*")) {
    return NextResponse.json(
      {
        error: {
          message:
            "OPENAI_API_KEY looks masked (contains *). Set the full real key in environment variables.",
        },
      },
      { status: 500 }
    );
  }

  let body: ChatBody = {};
  try {
    body = (await request.json()) as ChatBody;
  } catch {
    return NextResponse.json(
      { error: { message: "invalid JSON body" } },
      { status: 400 }
    );
  }

  const { messages, model, max_tokens, maxTokens, temperature } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: { message: "messages must be a non-empty array" } },
      { status: 400 }
    );
  }

  const normalizedMessages = messages.filter(
    (m) =>
      m &&
      typeof m.role === "string" &&
      typeof m.content === "string" &&
      m.content.trim() !== ""
  );

  if (normalizedMessages.length === 0) {
    return NextResponse.json(
      { error: { message: "messages must contain at least one valid item" } },
      { status: 400 }
    );
  }

  const hasSystemMessage = normalizedMessages.some((m) => m.role === "system");
  const finalMessages =
    SYSTEM_PROMPT && !hasSystemMessage
      ? [{ role: "system", content: SYSTEM_PROMPT }, ...normalizedMessages]
      : normalizedMessages;

  const payload = {
    model: model || OPENAI_MODEL,
    messages: finalMessages,
    max_tokens: Number.isFinite(max_tokens) ? max_tokens : maxTokens,
    temperature: Number.isFinite(temperature) ? temperature : 0.7,
  };

  try {
    const upstream = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const text = await upstream.text();
    const contentType = upstream.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }

      if (!upstream.ok && parsed && typeof parsed === "object" && "error" in parsed) {
        return NextResponse.json(parsed, { status: upstream.status });
      }

      return new NextResponse(text, {
        status: upstream.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new NextResponse(text, { status: upstream.status });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: {
          message: "Failed to reach upstream AI API",
          details:
            error instanceof Error ? error.message : "Unknown upstream error",
        },
      },
      { status: 502 }
    );
  }
}
