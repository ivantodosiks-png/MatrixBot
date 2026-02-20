export type StripePlan = "pro" | "ultra";

function disabled(): never {
  throw new Error("Legacy Stripe integration is disabled");
}

export function getStripeSecretKey() {
  return disabled();
}

export function getStripeWebhookSecret() {
  return disabled();
}

export function getStripePricePro() {
  return disabled();
}

export function getStripePriceUltra() {
  return disabled();
}

export function getStripePriceIdForPlan(plan: StripePlan) {
  void plan;
  return disabled();
}

export function getStripePriceMap() {
  return { pro: disabled(), ultra: disabled() };
}

export function getAppUrl() {
  const raw = String(process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "").trim();
  if (!raw) {
    throw new Error("Missing NEXT_PUBLIC_APP_URL (or APP_URL)");
  }

  if (!/^https?:\/\//.test(raw)) {
    throw new Error("Invalid NEXT_PUBLIC_APP_URL: expected http:// or https://");
  }

  return raw.replace(/\/+$/, "");
}
