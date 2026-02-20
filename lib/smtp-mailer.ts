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

function readRequiredEnv(name: string) {
  const value = String(process.env[name] ?? "").trim();
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function readSmtpConfig(): SmtpConfig {
  const host = readRequiredEnv("SMTP_HOST");
  const port = Number(readRequiredEnv("SMTP_PORT"));

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

function isTlsVersionError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    message.includes("wrong version number") ||
    message.includes("ssl routines") ||
    message.includes("tls") ||
    message.includes("eproto")
  );
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

async function sendWithTransport(config: SmtpConfig, secure: boolean, payload: Record<string, unknown>) {
  const nodemailer = await loadNodemailer();
  const transporter = nodemailer.default.createTransport({
    host: config.host,
    port: config.port,
    secure,
    requireTLS: !secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    tls: {
      minVersion: "TLSv1.2",
    },
  });

  await transporter.sendMail(payload);
}

export async function sendReceiptEmail(input: ReceiptEmailInput) {
  const config = readSmtpConfig();
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
  ].join("\n");

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

  const payload = {
    from: config.from,
    to: input.to,
    subject: "Your Matrix GPT receipt",
    text: textBody,
    html: htmlBody,
  };

  const preferredSecure = config.port === 465;

  try {
    await sendWithTransport(config, preferredSecure, payload);
  } catch (error) {
    if (!isTlsVersionError(error)) {
      throw error;
    }

    await sendWithTransport(config, !preferredSecure, payload);
  }
}
