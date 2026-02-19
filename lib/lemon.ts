import crypto from "node:crypto";
import type { UserSubscriptionStatus } from "@/lib/user-store";
import {
  getAppUrl as readAppUrlFromEnv,
  getLemonApiKey as readLemonApiKeyFromEnv,
  getLemonStoreId as readLemonStoreIdFromEnv,
  getLemonWebhookSecret as readLemonWebhookSecretFromEnv,
} from "@/lib/lemon-config";

const LEMON_API_BASE = "https://api.lemonsqueezy.com/v1";

type LemonRequestOptions = {
  method?: "GET" | "POST";
  body?: Record<string, unknown>;
};

type LemonJsonApiResponse<T> = {
  data?: T;
  errors?: Array<{
    detail?: string;
    title?: string;
  }>;
};

type LemonCheckoutResource = {
  id: string;
  attributes?: {
    url?: string | null;
  } | null;
};

type LemonSubscriptionUrls = {
  customer_portal?: string | null;
  update_payment_method?: string | null;
};

export type LemonSubscription = {
  id: string;
  attributes?: {
    customer_id?: number | string | null;
    variant_id?: number | string | null;
    status?: string | null;
    renews_at?: string | null;
    ends_at?: string | null;
    urls?: LemonSubscriptionUrls | null;
  } | null;
};

export type LemonWebhookEvent = {
  meta?: {
    event_name?: string;
    custom_data?: {
      user_id?: string;
      userId?: string;
      plan?: string;
    } | null;
  } | null;
  data?: {
    id?: string | number;
    type?: string;
    attributes?: LemonSubscription["attributes"];
  } | null;
};

function getLemonApiKey() {
  return readLemonApiKeyFromEnv();
}

export function getLemonWebhookSecret() {
  return readLemonWebhookSecretFromEnv();
}

export function getAppUrl() {
  return readAppUrlFromEnv();
}

function getLemonStoreId() {
  return readLemonStoreIdFromEnv();
}

function stringifyPayload(payload: Record<string, unknown>) {
  return JSON.stringify(payload);
}

async function lemonRequest<T>(path: string, options: LemonRequestOptions = {}) {
  const method = options.method ?? "POST";
  const apiKey = getLemonApiKey();
  const response = await fetch(`${LEMON_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
    },
    body: method === "GET" ? undefined : stringifyPayload(options.body ?? {}),
  });

  const payload = (await response.json().catch(() => null)) as LemonJsonApiResponse<T> | null;

  if (!response.ok || !payload) {
    const firstError = payload?.errors?.[0];
    const message =
      firstError?.detail ||
      firstError?.title ||
      `Lemon Squeezy API request failed (${response.status})`;
    throw new Error(message);
  }

  if (!payload.data) {
    throw new Error("Lemon Squeezy API response is missing data");
  }

  return payload.data;
}

export async function createLemonCheckoutUrl(params: {
  variantId: string;
  email: string;
  name?: string | null;
  userId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const checkout = await lemonRequest<LemonCheckoutResource>("/checkouts", {
    method: "POST",
    body: {
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email: params.email,
            name: params.name ?? undefined,
            custom: {
              user_id: params.userId,
            },
          },
          checkout_options: {
            embed: false,
          },
          product_options: {
            redirect_url: params.successUrl,
            receipt_link_url: params.successUrl,
            receipt_button_text: "Open account",
            enabled_variants: [Number(params.variantId)],
          },
        },
        relationships: {
          store: {
            data: {
              type: "stores",
              id: getLemonStoreId(),
            },
          },
          variant: {
            data: {
              type: "variants",
              id: params.variantId,
            },
          },
        },
      },
      meta: {
        custom_data: {
          user_id: params.userId,
        },
        cancel_url: params.cancelUrl,
      },
    },
  });

  const url = checkout.attributes?.url;
  if (!url) {
    throw new Error("Lemon checkout URL is missing");
  }

  return url;
}

export async function retrieveLemonSubscription(subscriptionId: string) {
  if (!subscriptionId) {
    throw new Error("subscription id is required");
  }

  return lemonRequest<LemonSubscription>(`/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: "GET",
  });
}

export async function createLemonCustomerPortalUrl(subscriptionId: string) {
  const subscription = await retrieveLemonSubscription(subscriptionId);
  const urls = subscription.attributes?.urls;
  const portalUrl = urls?.customer_portal || urls?.update_payment_method;

  if (!portalUrl) {
    throw new Error("Customer portal URL is not available yet");
  }

  return portalUrl;
}

export function normalizeLemonSubscriptionStatus(status: string | null | undefined): UserSubscriptionStatus {
  if (!status) return "NONE";

  const normalized = status.toLowerCase();
  if (normalized === "active" || normalized === "on_trial" || normalized === "trialing") {
    return "ACTIVE";
  }

  if (normalized === "past_due" || normalized === "unpaid" || normalized === "paused") {
    return "PAST_DUE";
  }

  if (normalized === "cancelled" || normalized === "canceled" || normalized === "expired") {
    return "CANCELED";
  }

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
  if (!Number.isFinite(parsed.getTime())) return null;
  return parsed;
}

export function verifyLemonWebhookSignature(params: {
  rawBody: string;
  signatureHeader: string | null;
  webhookSecret: string;
}) {
  if (!params.signatureHeader) return false;

  const expected = crypto
    .createHmac("sha256", params.webhookSecret)
    .update(params.rawBody, "utf8")
    .digest("hex");

  const provided = params.signatureHeader.trim();
  if (expected.length !== provided.length) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected, "hex");
  const providedBuffer = Buffer.from(provided, "hex");
  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}
