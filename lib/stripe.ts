import type { UserSubscriptionStatus } from "@/lib/user-store";
import {
  createLemonCheckoutUrl,
  createLemonCustomerPortalUrl,
  extractLemonVariantId,
  getAppUrl,
  getLemonWebhookSecret,
  lemonPeriodEndToDate,
  normalizeLemonSubscriptionStatus,
  retrieveLemonSubscription,
  verifyLemonWebhookSignature,
  type LemonSubscription,
  type LemonWebhookEvent,
} from "@/lib/lemon";

export type StripeSubscription = LemonSubscription;

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

export type StripeWebhookEvent = LemonWebhookEvent;

export { getAppUrl, getLemonWebhookSecret as getStripeWebhookSecret };

export async function createStripeCustomer(params: {
  email: string;
  name?: string | null;
  userId: string;
}) {
  void params;
  throw new Error("Stripe is disabled. Use Lemon Squeezy checkout flow.");
}

export async function createStripeCheckoutSession(params: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  return createLemonCheckoutUrl({
    variantId: params.priceId,
    email: "no-email@example.com",
    name: null,
    userId: params.customerId,
    successUrl: params.successUrl,
    cancelUrl: params.cancelUrl,
  });
}

export async function createStripePortalSession(params: {
  customerId: string;
  returnUrl: string;
}) {
  void params.returnUrl;
  return createLemonCustomerPortalUrl(params.customerId);
}

export async function retrieveStripeSubscription(subscriptionId: string) {
  return retrieveLemonSubscription(subscriptionId);
}

export function getSubscriptionPriceId(subscription: StripeSubscription | null | undefined) {
  return extractLemonVariantId(subscription);
}

export function normalizeStripeSubscriptionStatus(status: string | null | undefined): UserSubscriptionStatus {
  return normalizeLemonSubscriptionStatus(status);
}

export function verifyStripeWebhookSignature(params: {
  rawBody: string;
  signatureHeader: string | null;
  webhookSecret: string;
}) {
  return verifyLemonWebhookSignature(params);
}

export function unixSecondsToDate(seconds: number | null | undefined) {
  if (!seconds || !Number.isFinite(seconds)) return null;
  return new Date(seconds * 1000);
}

export { lemonPeriodEndToDate };
