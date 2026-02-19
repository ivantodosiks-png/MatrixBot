import {
  getAppUrl,
  getLemonVariantIdForPlan,
  getLemonVariantMap,
  getLemonWebhookSecret,
} from "@/lib/lemon-config";

export type StripePlan = "pro" | "ultra";

function readLegacyStripeSecretKey() {
  const value = String(process.env.STRIPE_SECRET_KEY ?? "").trim();
  if (!value) {
    throw new Error("Stripe is disabled. Use Lemon Squeezy env variables.");
  }
  return value;
}

export function getStripeSecretKey() {
  return readLegacyStripeSecretKey();
}

export function getStripeWebhookSecret() {
  return getLemonWebhookSecret();
}

export function getStripePricePro() {
  return getLemonVariantMap().pro;
}

export function getStripePriceUltra() {
  return getLemonVariantMap().ultra;
}

export function getStripePriceIdForPlan(plan: StripePlan) {
  return getLemonVariantIdForPlan(plan);
}

export function getStripePriceMap() {
  return getLemonVariantMap();
}

export { getAppUrl };
