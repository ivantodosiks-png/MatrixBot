import { sendSmtpEmail } from "@/lib/smtp-transport";

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

export async function sendReceiptEmail(input: ReceiptEmailInput) {
  const config = readSmtpConfig();
  const purchasedAt = formatDate(input.purchasedAt);
  const escapedPlan = escapeHtml(input.planName);
  const escapedAmount = escapeHtml(input.amountLabel);
  const escapedReceiptId = escapeHtml(input.receiptId);
  const escapedDate = escapeHtml(purchasedAt);

  const textBody = [
    "MatrixCore Payment Receipt",
    "-------------------------",
    "Status: Paid",
    `Plan: ${input.planName}`,
    `Amount: ${input.amountLabel}`,
    `Receipt ID: ${input.receiptId}`,
    `Date (UTC): ${purchasedAt}`,
    "",
    "Thank you for your purchase.",
  ].join("\n");

  const htmlBody = `
    <div style="margin:0;padding:24px;background:#f3f7fb;font-family:Arial,Helvetica,sans-serif;color:#102033;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #d8e3ef;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="padding:22px 24px;background:linear-gradient(135deg,#0f2745 0%,#1d3f68 100%);color:#ffffff;">
            <div style="font-size:12px;letter-spacing:1.2px;text-transform:uppercase;opacity:.85;">MatrixCore</div>
            <div style="font-size:24px;line-height:1.2;font-weight:700;margin-top:6px;">Payment Receipt</div>
          </td>
        </tr>
        <tr>
          <td style="padding:22px 24px 8px;">
            <div style="display:inline-block;padding:6px 10px;border-radius:999px;background:#e8f8ef;color:#1f7a46;font-size:12px;font-weight:700;text-transform:uppercase;">Paid</div>
            <p style="margin:14px 0 0;font-size:15px;line-height:1.55;color:#21374f;">
              Your purchase was processed successfully. Keep this receipt for your records.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 24px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;border:1px solid #e2eaf3;border-radius:10px;overflow:hidden;">
              <tr>
                <td style="padding:12px 14px;background:#f8fbff;border-bottom:1px solid #e2eaf3;font-size:13px;color:#5a6f86;">Plan</td>
                <td style="padding:12px 14px;background:#ffffff;border-bottom:1px solid #e2eaf3;font-size:14px;font-weight:700;color:#132a42;text-align:right;">${escapedPlan}</td>
              </tr>
              <tr>
                <td style="padding:12px 14px;background:#f8fbff;border-bottom:1px solid #e2eaf3;font-size:13px;color:#5a6f86;">Amount</td>
                <td style="padding:12px 14px;background:#ffffff;border-bottom:1px solid #e2eaf3;font-size:14px;font-weight:700;color:#132a42;text-align:right;">${escapedAmount}</td>
              </tr>
              <tr>
                <td style="padding:12px 14px;background:#f8fbff;border-bottom:1px solid #e2eaf3;font-size:13px;color:#5a6f86;">Receipt ID</td>
                <td style="padding:12px 14px;background:#ffffff;border-bottom:1px solid #e2eaf3;font-size:13px;font-family:Consolas,Monaco,monospace;color:#23415f;text-align:right;">${escapedReceiptId}</td>
              </tr>
              <tr>
                <td style="padding:12px 14px;background:#f8fbff;font-size:13px;color:#5a6f86;">Date (UTC)</td>
                <td style="padding:12px 14px;background:#ffffff;font-size:13px;color:#23415f;text-align:right;">${escapedDate}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 24px 24px;">
            <div style="margin-top:4px;padding-top:14px;border-top:1px solid #e2eaf3;font-size:12px;line-height:1.6;color:#6a7e94;">
              This is an automated receipt from MatrixCore.
            </div>
          </td>
        </tr>
      </table>
    </div>
  `.trim();

  await sendSmtpEmail(config, {
    to: input.to,
    subject: "Your Matrix GPT receipt",
    text: textBody,
    html: htmlBody,
  });
}
