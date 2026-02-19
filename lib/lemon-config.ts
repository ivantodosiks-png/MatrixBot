export type LemonPlan = "pro" | "ultra";

function readRequiredEnvAny(names: string[]) {
  for (const name of names) {
    const value = String(process.env[name] ?? "").trim();
    if (value) {
      return value;
    }
  }
  throw new Error(`Missing ${names.join(" or ")}`);
}

function looksLikePlaceholder(value: string) {
  const normalized = value.trim();
  if (!normalized) return true;

  const tokens = [
    "XXXXXXXXXXXXXXXX",
    "XXXXXXXX",
    "...",
    "REPLACE_ME",
    "CHANGE_ME",
    "CHANGEME",
    "YOUR_",
    "<",
    ">",
    "EXAMPLE",
  ];

  return tokens.some((token) => normalized.toUpperCase().includes(token));
}

function assertNotPlaceholder(name: string, value: string) {
  if (looksLikePlaceholder(value)) {
    throw new Error(`Invalid ${name}: placeholder value detected`);
  }
}

function readNumericId(names: string[], label: string) {
  const value = readRequiredEnvAny(names);
  assertNotPlaceholder(label, value);

  if (!/^\d+$/.test(value)) {
    throw new Error(`Invalid ${label}: expected numeric id`);
  }

  return value;
}

export function getLemonApiKey() {
  const value = readRequiredEnvAny([
    "LEMON_SQUEEZY_API_KEY",
    "LEMONSQUEEZY_API_KEY",
  ]);
  assertNotPlaceholder("LEMON_SQUEEZY_API_KEY", value);

  const isLsqToken = value.startsWith("lsq_");
  const isJwtLike = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
  if (!isLsqToken && !isJwtLike) {
    throw new Error("Invalid LEMON_SQUEEZY_API_KEY: expected lsq_* or JWT token");
  }

  return value;
}

export function getLemonWebhookSecret() {
  const value = readRequiredEnvAny([
    "LEMON_SQUEEZY_WEBHOOK_SECRET",
    "LEMONSQUEEZY_WEBHOOK_SECRET",
  ]);
  assertNotPlaceholder("LEMON_SQUEEZY_WEBHOOK_SECRET", value);
  return value;
}

export function getLemonStoreId() {
  return readNumericId(
    ["LEMON_SQUEEZY_STORE_ID", "LEMONSQUEEZY_STORE_ID", "LEMON_STORE_ID"],
    "LEMON_SQUEEZY_STORE_ID"
  );
}

export function getLemonVariantPro() {
  return readNumericId(
    [
      "LEMON_SQUEEZY_VARIANT_PRO",
      "LEMONSQUEEZY_VARIANT_PRO",
      "LEMON_VARIANT_PRO",
      "LEMONSQUEEZY_VARIANT_ID",
      "LEMON_VARIANT_ID",
    ],
    "LEMON_SQUEEZY_VARIANT_PRO"
  );
}

export function getLemonVariantUltra() {
  return readNumericId(
    [
      "LEMON_SQUEEZY_VARIANT_ULTRA",
      "LEMONSQUEEZY_VARIANT_ULTRA",
      "LEMON_VARIANT_ULTRA",
    ],
    "LEMON_SQUEEZY_VARIANT_ULTRA"
  );
}

export function getLemonVariantIdForPlan(plan: LemonPlan) {
  return plan === "pro" ? getLemonVariantPro() : getLemonVariantUltra();
}

export function getLemonVariantMap() {
  return {
    pro: getLemonVariantPro(),
    ultra: getLemonVariantUltra(),
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
