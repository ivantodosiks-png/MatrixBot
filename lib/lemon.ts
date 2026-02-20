import type { UserSubscriptionStatus } from "@/lib/user-store";

export type LemonSubscription = {
  id: string;
  attributes?: {
    customer_id?: number | string | null;
    variant_id?: number | string | null;
    status?: string | null;
    renews_at?: string | null;
    ends_at?: string | null;
  } | null;
};

export type LemonWebhookEvent = {
  meta?: {
    event_name?: string;
    custom_data?: {
      user_id?: string;
      userId?: string;
    } | null;
  } | null;
  data?: {
    id?: string | number;
    type?: string;
    attributes?: LemonSubscription["attributes"];
  } | null;
};

function disabled(): never {
  throw new Error("External billing integration is disabled");
}

export function getLemonWebhookSecret() {
  return disabled();
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

export async function createLemonCheckoutUrl() {
  return disabled();
}

export async function retrieveLemonSubscription() {
  return disabled();
}

export async function createLemonCustomerPortalUrl() {
  return disabled();
}

export function normalizeLemonSubscriptionStatus(status: string | null | undefined): UserSubscriptionStatus {
  if (!status) return "NONE";
  return "NONE";
}

export function extractLemonVariantId(subscription: LemonSubscription | null | undefined) {
  const raw = subscription?.attributes?.variant_id;
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return null;
}

export function extractLemonCustomerId(subscription: LemonSubscription | null | undefined) {
  const raw = subscription?.attributes?.customer_id;
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return null;
}

export function extractLemonSubscriptionId(subscription: LemonSubscription | null | undefined) {
  const raw = subscription?.id;
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return null;
}

export function lemonPeriodEndToDate(subscription: LemonSubscription | null | undefined) {
  const renewsAt = subscription?.attributes?.renews_at;
  const endsAt = subscription?.attributes?.ends_at;
  const value = renewsAt || endsAt;
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

export function verifyLemonWebhookSignature() {
  return false;
}
