export type StripePlan = "pro" | "ultra";

function readRequiredEnv(name: string) {
  const value = String(process.env[name] ?? "").trim();
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function looksLikePlaceholder(value: string) {
  const normalized = value.trim();
  if (!normalized) return true;

  if (/^price_[Xx]+$/.test(normalized)) return true;
  if (/^whsec_[Xx]+$/.test(normalized)) return true;
  if (/^(sk|pk)_(test|live)_[Xx]+$/.test(normalized)) return true;

  const placeholderTokens = [
    "XXXXXXXXXXXXXXXX",
    "REPLACE_ME",
    "CHANGE_ME",
    "CHANGEME",
    "YOUR_",
    "<",
    ">",
  ];

  return placeholderTokens.some((token) => normalized.includes(token));
}

function assertNotPlaceholder(name: string, value: string) {
  if (looksLikePlaceholder(value)) {
    throw new Error(`Invalid ${name}: placeholder value detected`);
  }
}

export function getStripeSecretKey() {
  const value = readRequiredEnv("STRIPE_SECRET_KEY");
  assertNotPlaceholder("STRIPE_SECRET_KEY", value);

  if (value.startsWith("pk_")) {
    throw new Error("Invalid STRIPE_SECRET_KEY: expected secret key (sk_*), got publishable key (pk_*)");
  }

  if (!/^sk_(test|live)_/.test(value)) {
    throw new Error("Invalid STRIPE_SECRET_KEY: expected Stripe secret key format sk_test_* or sk_live_*");
  }

  return value;
}

export function getStripeWebhookSecret() {
  const value = readRequiredEnv("STRIPE_WEBHOOK_SECRET");
  assertNotPlaceholder("STRIPE_WEBHOOK_SECRET", value);

  if (!value.startsWith("whsec_")) {
    throw new Error("Invalid STRIPE_WEBHOOK_SECRET: expected whsec_*");
  }

  return value;
}

function validateStripePriceId(name: string, value: string) {
  assertNotPlaceholder(name, value);

  if (value.startsWith("prod_")) {
    throw new Error(`Invalid ${name}: expected price_* but got product id (${value})`);
  }

  if (!value.startsWith("price_")) {
    throw new Error(`Invalid ${name}: expected price_*`);
  }

  return value;
}

export function getStripePricePro() {
  const value = readRequiredEnv("STRIPE_PRICE_PRO");
  return validateStripePriceId("STRIPE_PRICE_PRO", value);
}

export function getStripePriceUltra() {
  const value = readRequiredEnv("STRIPE_PRICE_ULTRA");
  return validateStripePriceId("STRIPE_PRICE_ULTRA", value);
}

export function getStripePriceIdForPlan(plan: StripePlan) {
  return plan === "pro" ? getStripePricePro() : getStripePriceUltra();
}

export function getStripePriceMap() {
  return {
    pro: getStripePricePro(),
    ultra: getStripePriceUltra(),
  };
}

export function getAppUrl() {
  const raw =
    String(process.env.NEXT_PUBLIC_APP_URL ?? "").trim() ||
    String(process.env.APP_URL ?? "").trim();

  if (!raw) {
    throw new Error("Missing NEXT_PUBLIC_APP_URL (or APP_URL)");
  }

  assertNotPlaceholder("NEXT_PUBLIC_APP_URL", raw);

  if (!/^https?:\/\//.test(raw)) {
    throw new Error("Invalid NEXT_PUBLIC_APP_URL: expected http:// or https://");
  }

  return raw.replace(/\/+$/, "");
}
