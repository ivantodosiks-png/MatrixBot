import { sendSmtpEmail } from "@/lib/smtp-transport";

type ReceiptEmailInput = {
  to: string;
  customerName: string;
  planName: string;
  amountValue: number;
  currency: string;
  paymentMethod: string;
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
    month: "long",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC",
  }).format(value);
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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
  const amountLabel = `${formatMoney(input.amountValue, input.currency)} / month`;
  const subtotalLabel = formatMoney(input.amountValue, input.currency);
  const taxLabel = formatMoney(0, input.currency);
  const totalLabel = formatMoney(input.amountValue, input.currency);
  const escapedName = escapeHtml(input.customerName);
  const escapedPlan = escapeHtml(input.planName);
  const escapedAmount = escapeHtml(amountLabel);
  const escapedPaymentMethod = escapeHtml(input.paymentMethod);
  const escapedReceiptId = escapeHtml(input.receiptId);
  const escapedDate = escapeHtml(purchasedAt);

  const textBody = [
    "MATRIXCORE PAYMENT RECEIPT",
    "==========================",
    "Status: Paid",
    `Customer: ${input.customerName}`,
    `Plan: ${input.planName}`,
    `Amount: ${amountLabel}`,
    `Payment method: ${input.paymentMethod}`,
    `Receipt ID: ${input.receiptId}`,
    `Date (UTC): ${purchasedAt}`,
    "",
    `Subtotal: ${subtotalLabel}`,
    `Tax: ${taxLabel}`,
    `Total: ${totalLabel}`,
    "",
    "Thank you for your purchase.",
  ].join("\n");

  const htmlBody = `
    <div style="margin:0;padding:28px;background:#eef4fb;font-family:Arial,Helvetica,sans-serif;color:#102033;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:700px;margin:0 auto;background:#ffffff;border:1px solid #d6e3f0;border-radius:14px;overflow:hidden;">
        <tr>
          <td style="padding:24px 26px;background:linear-gradient(140deg,#122945 0%,#1d466f 100%);color:#ffffff;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="vertical-align:top;">
                  <div style="font-size:12px;letter-spacing:1.3px;text-transform:uppercase;opacity:.85;">MatrixCore</div>
                  <div style="font-size:26px;line-height:1.2;font-weight:700;margin-top:8px;">Payment Receipt</div>
                </td>
                <td style="text-align:right;vertical-align:top;">
                  <div style="display:inline-block;padding:7px 12px;border-radius:999px;background:#e8f8ef;color:#1e7a45;font-size:12px;font-weight:700;text-transform:uppercase;">Paid</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:22px 26px 12px;">
            <p style="margin:0;font-size:15px;line-height:1.55;color:#21374f;">
              Hi ${escapedName},
            </p>
            <p style="margin:8px 0 0;font-size:15px;line-height:1.55;color:#21374f;">
              Your purchase was processed successfully. Keep this receipt for your records.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 26px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;border:1px solid #e2eaf3;border-radius:10px;overflow:hidden;">
              <tr>
                <td style="padding:12px 14px;background:#f8fbff;border-bottom:1px solid #e2eaf3;font-size:13px;color:#5a6f86;">Receipt ID</td>
                <td style="padding:12px 14px;background:#ffffff;border-bottom:1px solid #e2eaf3;font-size:13px;font-family:Consolas,Monaco,monospace;color:#23415f;text-align:right;">${escapedReceiptId}</td>
              </tr>
              <tr>
                <td style="padding:12px 14px;background:#f8fbff;border-bottom:1px solid #e2eaf3;font-size:13px;color:#5a6f86;">Date (UTC)</td>
                <td style="padding:12px 14px;background:#ffffff;border-bottom:1px solid #e2eaf3;font-size:13px;color:#23415f;text-align:right;">${escapedDate}</td>
              </tr>
              <tr>
                <td style="padding:12px 14px;background:#f8fbff;border-bottom:1px solid #e2eaf3;font-size:13px;color:#5a6f86;">Plan</td>
                <td style="padding:12px 14px;background:#ffffff;border-bottom:1px solid #e2eaf3;font-size:14px;font-weight:700;color:#132a42;text-align:right;">${escapedPlan}</td>
              </tr>
              <tr>
                <td style="padding:12px 14px;background:#f8fbff;font-size:13px;color:#5a6f86;">Payment method</td>
                <td style="padding:12px 14px;background:#ffffff;font-size:13px;color:#23415f;text-align:right;">${escapedPaymentMethod}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 26px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;border:1px solid #e2eaf3;border-radius:10px;overflow:hidden;">
              <tr>
                <th align="left" style="padding:10px 14px;background:#f6faff;border-bottom:1px solid #e2eaf3;font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:#58708b;">Description</th>
                <th align="right" style="padding:10px 14px;background:#f6faff;border-bottom:1px solid #e2eaf3;font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:#58708b;">Amount</th>
              </tr>
              <tr>
                <td style="padding:12px 14px;border-bottom:1px solid #e2eaf3;color:#21374f;">${escapedPlan} subscription (monthly)</td>
                <td align="right" style="padding:12px 14px;border-bottom:1px solid #e2eaf3;color:#21374f;">${escapedAmount}</td>
              </tr>
              <tr>
                <td style="padding:10px 14px;border-bottom:1px solid #e2eaf3;color:#4e647b;">Subtotal</td>
                <td align="right" style="padding:10px 14px;border-bottom:1px solid #e2eaf3;color:#4e647b;">${subtotalLabel}</td>
              </tr>
              <tr>
                <td style="padding:10px 14px;border-bottom:1px solid #e2eaf3;color:#4e647b;">Tax</td>
                <td align="right" style="padding:10px 14px;border-bottom:1px solid #e2eaf3;color:#4e647b;">${taxLabel}</td>
              </tr>
              <tr>
                <td style="padding:12px 14px;font-size:15px;font-weight:700;color:#102942;">Total paid</td>
                <td align="right" style="padding:12px 14px;font-size:15px;font-weight:700;color:#102942;">${totalLabel}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 26px 24px;">
            <div style="margin-top:4px;padding-top:14px;border-top:1px solid #e2eaf3;font-size:12px;line-height:1.6;color:#6a7e94;">
              This is an automated receipt from MatrixCore. Keep this email for accounting purposes.
            </div>
          </td>
        </tr>
      </table>
    </div>
  `.trim();

  await sendSmtpEmail(config, {
    to: input.to,
    subject: `MatrixCore receipt ${input.receiptId}`,
    text: textBody,
    html: htmlBody,
  });
}
