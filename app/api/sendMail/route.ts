import { NextResponse } from "next/server";

export const runtime = "nodejs";

type SendMailBody = {
  name?: string;
  email?: string;
  message?: string;
  website?: string; // honeypot
  clientTs?: number;
};

type RateEntry = {
  count: number;
  resetAt: number;
};

const WINDOW_MS = 10 * 60 * 1000;
const LIMIT_PER_WINDOW = 5;

const globalForRateLimit = globalThis as typeof globalThis & {
  __sendMailRateLimit?: Map<string, RateEntry>;
};

const rateLimitStore = globalForRateLimit.__sendMailRateLimit ?? new Map<string, RateEntry>();
if (!globalForRateLimit.__sendMailRateLimit) {
  globalForRateLimit.__sendMailRateLimit = rateLimitStore;
}

function readRequiredEnv(name: string) {
  const value = String(process.env[name] ?? "").trim();
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function getSmtpConfig() {
  const host = readRequiredEnv("SMTP_HOST");
  const portRaw = readRequiredEnv("SMTP_PORT");
  const port = Number(portRaw);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("Invalid SMTP_PORT");
  }

  return {
    host,
    port,
    user: readRequiredEnv("SMTP_USER"),
    pass: readRequiredEnv("SMTP_PASS"),
    from: readRequiredEnv("SMTP_FROM"),
    secure: port === 465,
  };
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") || "unknown";
}

function hitRateLimit(ip: string) {
  const now = Date.now();
  const current = rateLimitStore.get(ip);

  if (!current || now >= current.resetAt) {
    rateLimitStore.set(ip, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });
    return false;
  }

  if (current.count >= LIMIT_PER_WINDOW) {
    return true;
  }

  current.count += 1;
  rateLimitStore.set(ip, current);
  return false;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeText(input: unknown) {
  return String(input ?? "").trim();
}

function sanitize(input: string) {
  return input.replace(/[<>]/g, "");
}

function isTlsVersionError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    message.includes("wrong version number") ||
    message.includes("ssl routines") ||
    message.includes("tls") ||
    message.includes("eproto")
  );
}

async function sendWithTransport(
  smtp: ReturnType<typeof getSmtpConfig>,
  secure: boolean,
  payload: Record<string, unknown>
) {
  const nodemailer = await loadNodemailer();
  const transporter = nodemailer.default.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure,
    requireTLS: !secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
    tls: {
      minVersion: "TLSv1.2",
    },
  });

  await transporter.sendMail(payload);
}

async function loadNodemailer() {
  const dynamicImport = new Function("m", "return import(m)") as (m: string) => Promise<{
    default: {
      createTransport: (options: Record<string, unknown>) => {
        sendMail: (options: Record<string, unknown>) => Promise<unknown>;
      };
    };
  }>;

  return dynamicImport("nodemailer");
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (hitRateLimit(ip)) {
      return NextResponse.json(
        { error: { message: "Too many requests. Try again later." } },
        { status: 429 }
      );
    }

    const body = (await request.json()) as SendMailBody;
    const name = sanitize(normalizeText(body.name));
    const email = normalizeText(body.email).toLowerCase();
    const message = sanitize(normalizeText(body.message));
    const website = normalizeText(body.website);
    const clientTs = Number(body.clientTs ?? 0);

    if (website) {
      return NextResponse.json({ ok: true });
    }

    const now = Date.now();
    if (!Number.isFinite(clientTs) || clientTs <= 0 || now - clientTs < 3000 || now - clientTs > 2 * 60 * 60 * 1000) {
      return NextResponse.json(
        { error: { message: "Spam protection triggered." } },
        { status: 400 }
      );
    }

    if (name.length < 2 || name.length > 120) {
      return NextResponse.json(
        { error: { message: "Invalid name length." } },
        { status: 400 }
      );
    }

    if (!isValidEmail(email) || email.length > 254) {
      return NextResponse.json(
        { error: { message: "Invalid email." } },
        { status: 400 }
      );
    }

    if (message.length < 10 || message.length > 5000) {
      return NextResponse.json(
        { error: { message: "Message must be 10-5000 chars." } },
        { status: 400 }
      );
    }

    const smtp = getSmtpConfig();
    const text = [
      "New contact form message",
      `Name: ${name}`,
      `Email: ${email}`,
      "",
      "Message:",
      message,
    ].join("\n");

    const html = `
      <h2>New contact form message</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Message:</strong></p>
      <pre style="white-space:pre-wrap;font-family:inherit">${message}</pre>
    `;

    const payload = {
      from: smtp.from,
      to: smtp.from,
      replyTo: email,
      subject: `Contact form: ${name}`,
      text,
      html,
    };

    try {
      await sendWithTransport(smtp, smtp.secure, payload);
    } catch (error) {
      if (!isTlsVersionError(error)) {
        throw error;
      }

      await sendWithTransport(smtp, !smtp.secure, payload);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email";
    return NextResponse.json(
      { error: { message } },
      { status: 500 }
    );
  }
}
