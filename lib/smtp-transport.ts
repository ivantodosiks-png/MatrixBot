import net from "node:net";
import tls from "node:tls";
import { Buffer } from "node:buffer";

export type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

export type SmtpMessage = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

type Waiter = {
  resolve: (value: string) => void;
  reject: (error: Error) => void;
  expected: number[];
};

function toBase64(value: string) {
  return Buffer.from(value, "utf8").toString("base64");
}

function encodeMimeBase64(value: string) {
  const encoded = Buffer.from(normalizeCrlf(value), "utf8").toString("base64");
  const lines: string[] = [];
  for (let index = 0; index < encoded.length; index += 76) {
    lines.push(encoded.slice(index, index + 76));
  }
  return lines.join("\r\n");
}

function normalizeCrlf(value: string) {
  return value.replace(/\r?\n/g, "\r\n");
}

function dotStuff(value: string) {
  return normalizeCrlf(value)
    .split("\r\n")
    .map((line) => (line.startsWith(".") ? `.${line}` : line))
    .join("\r\n");
}

function escapeHeader(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function parseRecipients(to: string | string[]) {
  if (Array.isArray(to)) {
    return to.filter(Boolean);
  }
  return to
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function extractEmailAddress(value: string) {
  const input = value.trim();
  const angle = input.match(/<([^<>]+)>/);
  const candidate = (angle ? angle[1] : input).trim();
  return candidate;
}

function isValidMailbox(value: string) {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
}

class SmtpConnection {
  private socket: net.Socket | tls.TLSSocket | null = null;
  private buffer = "";
  private waiter: Waiter | null = null;
  private pendingCode: number | null = null;
  private pendingLines: string[] = [];

  private bindSocket(socket: net.Socket | tls.TLSSocket) {
    this.socket = socket;
    socket.on("data", (chunk) => {
      this.onData(chunk.toString("utf8"));
    });
    socket.on("error", (error) => {
      if (this.waiter) {
        const current = this.waiter;
        this.waiter = null;
        current.reject(error instanceof Error ? error : new Error("SMTP socket error"));
      }
    });
    socket.on("close", () => {
      if (this.waiter) {
        const current = this.waiter;
        this.waiter = null;
        current.reject(new Error("SMTP socket closed"));
      }
    });
  }

  private onData(chunk: string) {
    this.buffer += chunk;
    const lines = this.buffer.split("\r\n");
    this.buffer = lines.pop() ?? "";

    for (const line of lines) {
      const match = line.match(/^(\d{3})([ -])(.*)$/);
      if (!match) continue;

      const code = Number(match[1]);
      const separator = match[2];

      if (this.pendingCode === null) {
        this.pendingCode = code;
      }
      this.pendingLines.push(line);

      if (separator === "-") {
        continue;
      }

      const full = this.pendingLines.join("\n");
      this.pendingCode = null;
      this.pendingLines = [];

      const waiter = this.waiter;
      if (!waiter) continue;

      if (waiter.expected.includes(code)) {
        this.waiter = null;
        waiter.resolve(full);
      } else {
        this.waiter = null;
        waiter.reject(new Error(`SMTP ${code}: ${full}`));
      }
    }
  }

  private waitFor(expected: number[]) {
    if (this.waiter) {
      return Promise.reject(new Error("SMTP wait conflict"));
    }
    return new Promise<string>((resolve, reject) => {
      this.waiter = { resolve, reject, expected };
    });
  }

  private write(line: string) {
    if (!this.socket) {
      throw new Error("SMTP socket is not connected");
    }
    this.socket.write(`${line}\r\n`);
  }

  async connectPlain(host: string, port: number) {
    const socket = net.createConnection({ host, port });
    await new Promise<void>((resolve, reject) => {
      socket.once("connect", () => resolve());
      socket.once("error", (error) => reject(error));
    });
    this.bindSocket(socket);
    await this.waitFor([220]);
  }

  async connectTls(host: string, port: number) {
    const socket = tls.connect({ host, port, servername: host, minVersion: "TLSv1.2" });
    await new Promise<void>((resolve, reject) => {
      socket.once("secureConnect", () => resolve());
      socket.once("error", (error) => reject(error));
    });
    this.bindSocket(socket);
    await this.waitFor([220]);
  }

  async startTls(host: string) {
    this.write("STARTTLS");
    await this.waitFor([220]);

    if (!this.socket) {
      throw new Error("SMTP socket missing before STARTTLS");
    }

    const current = this.socket;
    const secureSocket = tls.connect({
      socket: current,
      servername: host,
      minVersion: "TLSv1.2",
    });

    await new Promise<void>((resolve, reject) => {
      secureSocket.once("secureConnect", () => resolve());
      secureSocket.once("error", (error) => reject(error));
    });

    this.bindSocket(secureSocket);
  }

  async command(line: string, expected: number[]) {
    this.write(line);
    await this.waitFor(expected);
  }

  async sendData(rawMime: string) {
    this.write("DATA");
    await this.waitFor([354]);
    if (!this.socket) {
      throw new Error("SMTP socket is not connected");
    }
    this.socket.write(`${rawMime}\r\n.\r\n`);
    await this.waitFor([250]);
  }

  close() {
    try {
      this.socket?.write("QUIT\r\n");
    } catch {}
    try {
      this.socket?.destroy();
    } catch {}
  }
}

function buildMime(config: SmtpConfig, message: SmtpMessage) {
  const recipientInput = parseRecipients(message.to);
  const recipients = recipientInput.map(extractEmailAddress);
  if (recipients.length === 0) {
    throw new Error("No recipient email provided");
  }

  const subject = escapeHeader(message.subject);
  const from = escapeHeader(config.from);
  const to = recipientInput.map((item) => escapeHeader(item)).join(", ");
  const replyTo = message.replyTo ? escapeHeader(message.replyTo) : "";
  const date = new Date().toUTCString();
  const messageId = `<${Date.now().toString(36)}.${Math.random().toString(36).slice(2)}@matrix.local>`;

  if (!message.html) {
    return [
      `From: ${from}`,
      `To: ${to}`,
      replyTo ? `Reply-To: ${replyTo}` : "",
      `Subject: ${subject}`,
      `Date: ${date}`,
      `Message-ID: ${messageId}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      dotStuff(encodeMimeBase64(message.text)),
    ]
      .filter(Boolean)
      .join("\r\n");
  }

  const boundary = `matrix_${Math.random().toString(36).slice(2)}`;
  return [
    `From: ${from}`,
    `To: ${to}`,
    replyTo ? `Reply-To: ${replyTo}` : "",
    `Subject: ${subject}`,
    `Date: ${date}`,
    `Message-ID: ${messageId}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    dotStuff(encodeMimeBase64(message.text)),
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    dotStuff(encodeMimeBase64(message.html)),
    "",
    `--${boundary}--`,
  ]
    .filter(Boolean)
    .join("\r\n");
}

async function sendInternal(config: SmtpConfig, message: SmtpMessage, useTlsFromStart: boolean) {
  const connection = new SmtpConnection();
  const recipients = parseRecipients(message.to).map(extractEmailAddress);
  const envelopeFrom = extractEmailAddress(config.from);
  const mime = buildMime(config, message);

  if (!isValidMailbox(envelopeFrom)) {
    throw new Error("Invalid SMTP_FROM envelope address");
  }
  if (recipients.some((item) => !isValidMailbox(item))) {
    throw new Error("Invalid recipient envelope address");
  }

  try {
    if (useTlsFromStart) {
      await connection.connectTls(config.host, config.port);
      await connection.command("EHLO matrix.local", [250]);
    } else {
      await connection.connectPlain(config.host, config.port);
      await connection.command("EHLO matrix.local", [250]);
      await connection.startTls(config.host);
      await connection.command("EHLO matrix.local", [250]);
    }

    await connection.command("AUTH LOGIN", [334]);
    await connection.command(toBase64(config.user), [334]);
    await connection.command(toBase64(config.pass), [235]);

    await connection.command(`MAIL FROM:<${envelopeFrom}>`, [250]);
    for (const recipient of recipients) {
      await connection.command(`RCPT TO:<${recipient}>`, [250, 251]);
    }
    await connection.sendData(mime);
  } finally {
    connection.close();
  }
}

export async function sendSmtpEmail(config: SmtpConfig, message: SmtpMessage) {
  const preferTlsFromStart = config.port === 465;

  try {
    await sendInternal(config, message, preferTlsFromStart);
  } catch (error) {
    const messageText = error instanceof Error ? error.message.toLowerCase() : "";
    const isTlsMismatch =
      messageText.includes("wrong version number") ||
      messageText.includes("ssl") ||
      messageText.includes("tls") ||
      messageText.includes("eproto");

    if (!isTlsMismatch) {
      throw error;
    }

    await sendInternal(config, message, !preferTlsFromStart);
  }
}
