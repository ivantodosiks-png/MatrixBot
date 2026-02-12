import { NextResponse } from "next/server";

export const runtime = "nodejs";

const OPENAI_API_URL =
  process.env.OPENAI_API_URL || "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

type ChatBody = {
  messages?: Array<{ role: string; content: string }>;
  model?: string;
  max_tokens?: number;
  maxTokens?: number;
  temperature?: number;
};

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: { message: "OPENAI_API_KEY is missing in environment" } },
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

  const payload = {
    model: model || OPENAI_MODEL,
    messages,
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

