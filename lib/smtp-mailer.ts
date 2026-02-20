import tls from "node:tls";
import crypto from "node:crypto";

type ReceiptEmailInput = {
  to: string;
  planName: string;
  amountLabel: string;
  receiptId: string;
  purchasedAt: Date;
};

type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

type SmtpResponse = {
  code: number;
  line: string;
};

function readRequiredEnv(name: string) {
  const value = String(process.env[name] ?? "").trim();
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function readSmtpConfig(): SmtpConfig {
  const host = readRequiredEnv("SMTP_HOST");
  const port = Number(process.env.SMTP_PORT ?? "465");
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("Invalid SMTP_PORT");
  }

  return {
    host,
    port,
    user: readRequiredEnv("SMTP_USER"),
    pass: readRequiredEnv("SMTP_PASS"),
    from: readRequiredEnv("SMTP_FROM"),
  };
}

function toBase64(value: string) {
  return Buffer.from(value, "utf8").toString("base64");
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC",
  }).format(value);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizeMultiline(value: string) {
  return value.replace(/\r?\n/g, "\r\n");
}

function dotStuff(value: string) {
  return value
    .split("\r\n")
    .map((line) => (line.startsWith(".") ? `.${line}` : line))
    .join("\r\n");
}

class SmtpClient {
  private socket: tls.TLSSocket;
  private buffer = "";
  private completedResponses: SmtpResponse[] = [];
  private waiters: Array<{
    expectedCodes: number[];
    resolve: (response: SmtpResponse) => void;
    reject: (error: Error) => void;
  }> = [];

  constructor(private config: SmtpConfig) {
    this.socket = tls.connect({
      host: config.host,
      port: config.port,
      servername: config.host,
    });
  }

  async connect() {
    await new Promise<void>((resolve, reject) => {
      const onError = (error: Error) => {
        reject(error);
      };

      this.socket.once("error", onError);
      this.socket.once("secureConnect", () => {
        this.socket.off("error", onError);
        resolve();
      });
    });

    this.socket.on("data", (chunk: Buffer) => {
      this.onData(chunk.toString("utf8"));
    });
    this.socket.on("error", (error: Error) => {
      this.rejectAll(error);
    });
    this.socket.on("close", () => {
      this.rejectAll(new Error("SMTP connection closed"));
    });

    await this.readResponse([220]);
  }

  private rejectAll(error: Error) {
    while (this.waiters.length > 0) {
      const waiter = this.waiters.shift();
      waiter?.reject(error);
    }
  }

  private onData(chunk: string) {
    this.buffer += chunk;
    const parts = this.buffer.split("\r\n");
    this.buffer = parts.pop() ?? "";

    for (const line of parts) {
      const match = line.match(/^(\d{3})([ -])(.*)$/);
      if (!match) continue;

      const code = Number(match[1]);
      const separator = match[2];
      if (separator !== " ") continue;

      const response = { code, line };
      const waiter = this.waiters[0];
      if (!waiter) {
        this.completedResponses.push(response);
        continue;
      }

      if (waiter.expectedCodes.includes(code)) {
        this.waiters.shift();
        waiter.resolve(response);
        continue;
      }

      if (code >= 400) {
        this.waiters.shift();
        waiter.reject(new Error(`SMTP error ${code}: ${line}`));
        continue;
      }

      this.waiters.shift();
      waiter.reject(new Error(`Unexpected SMTP response ${code}: ${line}`));
    }
  }

  private async readResponse(expectedCodes: number[]) {
    const ready = this.completedResponses.find((item) => expectedCodes.includes(item.code));
    if (ready) {
      this.completedResponses = this.completedResponses.filter((item) => item !== ready);
      return ready;
    }

    return new Promise<SmtpResponse>((resolve, reject) => {
      this.waiters.push({ expectedCodes, resolve, reject });
    });
  }

  async command(command: string, expectedCodes: number[]) {
    this.socket.write(`${command}\r\n`);
    return this.readResponse(expectedCodes);
  }

  async data(payload: string) {
    this.socket.write(`${payload}\r\n.\r\n`);
    return this.readResponse([250]);
  }

  close() {
    if (!this.socket.destroyed) {
      this.socket.end("QUIT\r\n");
      this.socket.destroy();
    }
  }
}

export async function sendReceiptEmail(input: ReceiptEmailInput) {
  const config = readSmtpConfig();
  const client = new SmtpClient(config);
  const purchasedAt = formatDate(input.purchasedAt);
  const escapedPlan = escapeHtml(input.planName);
  const escapedAmount = escapeHtml(input.amountLabel);
  const escapedReceiptId = escapeHtml(input.receiptId);

  const textBody = [
    "Thank you for your purchase.",
    `Plan: ${input.planName}`,
    `Amount: ${input.amountLabel}`,
    `Receipt ID: ${input.receiptId}`,
    `Date (UTC): ${purchasedAt}`,
  ].join("\r\n");

  const htmlBody = `
    <h2>Thank you for your purchase</h2>
    <p>Your payment was received successfully.</p>
    <ul>
      <li><strong>Plan:</strong> ${escapedPlan}</li>
      <li><strong>Amount:</strong> ${escapedAmount}</li>
      <li><strong>Receipt ID:</strong> ${escapedReceiptId}</li>
      <li><strong>Date (UTC):</strong> ${escapeHtml(purchasedAt)}</li>
    </ul>
  `.trim();

  const boundary = `matrix-${crypto.randomBytes(10).toString("hex")}`;
  const messageIdHost = config.from.includes("@")
    ? config.from.split("@")[1] || "localhost"
    : "localhost";
  const messageId = `<${crypto.randomUUID()}@${messageIdHost}>`;

  const mimeMessage = [
    `From: ${config.from}`,
    `To: ${input.to}`,
    "Subject: Your Matrix GPT receipt",
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${messageId}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    normalizeMultiline(dotStuff(textBody)),
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    normalizeMultiline(dotStuff(htmlBody)),
    "",
    `--${boundary}--`,
  ].join("\r\n");

  try {
    await client.connect();
    await client.command("EHLO matrix.local", [250]);
    await client.command("AUTH LOGIN", [334]);
    await client.command(toBase64(config.user), [334]);
    await client.command(toBase64(config.pass), [235]);
    await client.command(`MAIL FROM:<${config.from}>`, [250]);
    await client.command(`RCPT TO:<${input.to}>`, [250, 251]);
    await client.command("DATA", [354]);
    await client.data(mimeMessage);
  } finally {
    client.close();
  }
}
