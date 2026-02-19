import crypto from "node:crypto";
import type { UserSubscriptionStatus } from "@/lib/user-store";
import {
  getAppUrl as readAppUrlFromEnv,
  getStripeSecretKey as readStripeSecretKeyFromEnv,
  getStripeWebhookSecret as readStripeWebhookSecretFromEnv,
} from "@/lib/stripe-config";

const STRIPE_API_BASE = "https://api.stripe.com/v1";
const STRIPE_SIGNATURE_TOLERANCE_SECONDS = 300;

type StripeRequestOptions = {
  method?: "GET" | "POST";
  body?: URLSearchParams;
};

type StripeCustomerResponse = {
  id: string;
};

type StripeCheckoutSessionResponse = {
  id: string;
  url?: string;
};

type StripePortalSessionResponse = {
  id: string;
  url?: string;
};

type StripeSubscriptionItem = {
  price?: {
    id?: string | null;
  } | null;
};

export type StripeSubscription = {
  id: string;
  customer?: string | null;
  status?: string | null;
  current_period_end?: number | null;
  items?: {
    data?: StripeSubscriptionItem[];
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

function getStripeSecretKey() {
  return readStripeSecretKeyFromEnv();
}

export function getStripeWebhookSecret() {
  return readStripeWebhookSecretFromEnv();
}

export function getAppUrl() {
  return readAppUrlFromEnv();
}

async function stripeRequest<T>(path: string, options: StripeRequestOptions = {}) {
  const method = options.method ?? "POST";
  const secretKey = getStripeSecretKey();
  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: method === "GET" ? undefined : options.body,
  });

  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: { message?: string } })
    | null;

  if (!response.ok || !payload) {
    const message = payload?.error?.message || `Stripe API request failed (${response.status})`;
    throw new Error(message);
  }

  return payload;
}

export async function createStripeCustomer(params: {
  email: string;
  name?: string | null;
  userId: string;
}) {
  const body = new URLSearchParams();
  body.set("email", params.email);
  if (params.name) {
    body.set("name", params.name);
  }
  body.set("metadata[userId]", params.userId);

  const customer = await stripeRequest<StripeCustomerResponse>("/customers", {
    method: "POST",
    body,
  });

  return customer.id;
}

export async function createStripeCheckoutSession(params: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const body = new URLSearchParams();
  body.set("mode", "subscription");
  body.set("customer", params.customerId);
  body.set("line_items[0][price]", params.priceId);
  body.set("line_items[0][quantity]", "1");
  body.set("success_url", params.successUrl);
  body.set("cancel_url", params.cancelUrl);
  body.set("allow_promotion_codes", "true");

  const session = await stripeRequest<StripeCheckoutSessionResponse>("/checkout/sessions", {
    method: "POST",
    body,
  });

  if (!session.url) {
    throw new Error("Stripe checkout session URL is missing");
  }

  return session.url;
}

export async function createStripePortalSession(params: {
  customerId: string;
  returnUrl: string;
}) {
  const body = new URLSearchParams();
  body.set("customer", params.customerId);
  body.set("return_url", params.returnUrl);

  const session = await stripeRequest<StripePortalSessionResponse>("/billing_portal/sessions", {
    method: "POST",
    body,
  });

  if (!session.url) {
    throw new Error("Stripe portal URL is missing");
  }

  return session.url;
}

export async function retrieveStripeSubscription(subscriptionId: string) {
  if (!subscriptionId) {
    throw new Error("subscription id is required");
  }

  const query = new URLSearchParams();
  query.set("expand[]", "items.data.price");

  const subscription = await stripeRequest<StripeSubscription>(
    `/subscriptions/${encodeURIComponent(subscriptionId)}?${query.toString()}`,
    {
      method: "GET",
    }
  );

  return subscription;
}

export function getSubscriptionPriceId(subscription: StripeSubscription | null | undefined) {
  return subscription?.items?.data?.[0]?.price?.id ?? null;
}

export function normalizeStripeSubscriptionStatus(status: string | null | undefined): UserSubscriptionStatus {
  if (!status) return "NONE";

  const normalized = status.toLowerCase();
  if (normalized === "active" || normalized === "trialing") {
    return "ACTIVE";
  }
  if (
    normalized === "past_due" ||
    normalized === "unpaid" ||
    normalized === "incomplete" ||
    normalized === "incomplete_expired"
  ) {
    return "PAST_DUE";
  }
  if (normalized === "canceled") {
    return "CANCELED";
  }

  return "NONE";
}

export function verifyStripeWebhookSignature(params: {
  rawBody: string;
  signatureHeader: string | null;
  webhookSecret: string;
}) {
  if (!params.signatureHeader) return false;

  const parts = params.signatureHeader.split(",").map((part) => part.trim());
  let timestamp = "";
  const signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key === "t") timestamp = value;
    if (key === "v1") signatures.push(value);
  }

  if (!timestamp || signatures.length === 0) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber)) {
    return false;
  }

  if (Math.abs(now - timestampNumber) > STRIPE_SIGNATURE_TOLERANCE_SECONDS) {
    return false;
  }

  const signedPayload = `${timestamp}.${params.rawBody}`;
  const expected = crypto
    .createHmac("sha256", params.webhookSecret)
    .update(signedPayload, "utf8")
    .digest("hex");

  for (const signature of signatures) {
    if (signature.length !== expected.length) {
      continue;
    }

    const expectedBuffer = Buffer.from(expected, "hex");
    const receivedBuffer = Buffer.from(signature, "hex");

    if (crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
      return true;
    }
  }

  return false;
}

export function unixSecondsToDate(seconds: number | null | undefined) {
  if (!seconds || !Number.isFinite(seconds)) return null;
  return new Date(seconds * 1000);
}
