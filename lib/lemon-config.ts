export type LemonPlan = "pro" | "ultra";

function disabled(): never {
  throw new Error("External billing integration is disabled");
}

export function getLemonApiKey() {
  return disabled();
}

export function getLemonWebhookSecret() {
  return disabled();
}

export function getLemonStoreId() {
  return disabled();
}

export function getLemonVariantPro() {
  return disabled();
}

export function getLemonVariantUltra() {
  return disabled();
}

export function getLemonVariantIdForPlan(plan: LemonPlan) {
  void plan;
  return disabled();
}

export function getLemonVariantMap() {
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
