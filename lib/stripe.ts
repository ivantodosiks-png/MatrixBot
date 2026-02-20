import type { UserSubscriptionStatus } from "@/lib/user-store";

export type StripeSubscription = {
  id: string;
  customer?: string | null;
  status?: string | null;
  current_period_end?: number | null;
  items?: {
    data?: Array<{
      price?: {
        id?: string | null;
      } | null;
    }>;
  } | null;
};

export type StripeCheckoutSession = {
  id: string;
  customer?: string | null;
  subscription?: string | null;
  mode?: string | null;
};

export type StripeInvoice = {
  customer?: string | null;
  subscription?: string | null;
};

export type StripeWebhookEvent = {
  id: string;
  type: string;
  data?: {
    object?: unknown;
  };
};

function disabled(): never {
  throw new Error("Legacy Stripe integration is disabled");
}

export function getStripeWebhookSecret() {
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

export async function createStripeCustomer() {
  return disabled();
}

export async function createStripeCheckoutSession() {
  return disabled();
}

export async function createStripePortalSession() {
  return disabled();
}

export async function retrieveStripeSubscription() {
  return disabled();
}

export function getSubscriptionPriceId(subscription: StripeSubscription | null | undefined) {
  return subscription?.items?.data?.[0]?.price?.id ?? null;
}

export function normalizeStripeSubscriptionStatus(status: string | null | undefined): UserSubscriptionStatus {
  if (!status) return "NONE";
  return "NONE";
}

export function verifyStripeWebhookSignature() {
  return false;
}

export function unixSecondsToDate(seconds: number | null | undefined) {
  if (!seconds || !Number.isFinite(seconds)) return null;
  return new Date(seconds * 1000);
}
