import { NextResponse } from "next/server";
import crypto from "node:crypto";

export const runtime = "nodejs";

const OPENAI_API_URL =
  process.env.OPENAI_API_URL || "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const SYSTEM_PROMPT = String(
  process.env.SYSTEM_PROMPT ??
    "You are a helpful assistant. Reply in the same language as the user. Keep default replies short (1-3 concise paragraphs) unless the user asks for details."
).trim();
const DEFAULT_MAX_TOKENS = Number(process.env.MAX_TOKENS ?? 450);

type ChatBody = {
  messages?: Array<{ role: string; content: string }>;
  model?: string;
  max_tokens?: number;
  maxTokens?: number;
  temperature?: number;
};

function normalizeEnvSecret(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length > 1) {
    return trimmed.slice(1, -1).trim();
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length > 1) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed.replace(/\s+/g, "");
}

export async function POST(request: Request) {
  const apiKey = normalizeEnvSecret(
    String(process.env.OPENAI_API_KEY ?? process.env.OPENAI_KEY ?? "")
  );
  if (!apiKey) {
    return NextResponse.json(
      {
        error: {
          message: "OPENAI_API_KEY is missing in environment",
          hint: "Set OPENAI_API_KEY in Vercel Project Settings for Production",
        },
      },
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
  if (!apiKey.startsWith("sk-")) {
    return NextResponse.json(
      {
        error: {
          message:
            "OPENAI_API_KEY has invalid format (must start with sk-)",
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

  const requestedMaxTokens = Number.isFinite(max_tokens)
    ? Number(max_tokens)
    : Number(maxTokens);
  const safeMaxTokens = Number.isFinite(requestedMaxTokens)
    ? Math.max(64, Math.min(requestedMaxTokens, 700))
    : Math.max(64, Math.min(DEFAULT_MAX_TOKENS, 700));

  const payload = {
    model: model || OPENAI_MODEL,
    messages: finalMessages,
    max_tokens: safeMaxTokens,
    temperature: Number.isFinite(temperature) ? temperature : 0.7,
  };

  try {
    const keyFingerprint = crypto
      .createHash("sha256")
      .update(apiKey)
      .digest("hex")
      .slice(0, 12);
    console.info(
      `[chat-api] key_fingerprint=${keyFingerprint} key_len=${apiKey.length}`
    );

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
        const upstreamError = (parsed as { error?: { code?: string; message?: string } }).error;
        if (upstream.status === 401 && upstreamError?.code === "invalid_api_key") {
          return NextResponse.json(
            {
              error: {
                message: "OpenAI rejected server API key (invalid_api_key)",
                hint:
                  "Update OPENAI_API_KEY in Vercel Production env and redeploy. Also verify you are hitting latest deployment.",
              },
            },
            { status: 401 }
          );
        }
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
