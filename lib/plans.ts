import type { UserPlan } from "@/lib/user-store";

export type PublicPlan = "free" | "pro" | "ultra";

export const PLAN_DETAILS = {
  FREE: {
    id: "free" as PublicPlan,
    name: "Free",
    priceLabel: "0 EUR",
    periodLabel: "forever",
    limitLabel: "20 messages/day",
    perks: ["Core chat access"],
  },
  PRO: {
    id: "pro" as PublicPlan,
    name: "Pro",
    priceLabel: "9.99 EUR",
    periodLabel: "per month",
    limitLabel: "500 messages/month",
    perks: ["Priority responses"],
  },
  ULTRA: {
    id: "ultra" as PublicPlan,
    name: "Ultra",
    priceLabel: "19.99 EUR",
    periodLabel: "per month",
    limitLabel: "Unlimited messages",
    perks: ["Max priority", "Early access features"],
  },
} as const;

export function publicPlanToUserPlan(plan: PublicPlan): UserPlan {
  if (plan === "pro") return "PRO";
  if (plan === "ultra") return "ULTRA";
  return "FREE";
}

export function userPlanToPublicPlan(plan: UserPlan): PublicPlan {
  if (plan === "PRO") return "pro";
  if (plan === "ULTRA") return "ultra";
  return "free";
}

export function resolvePlanByPriceId(priceId: string | null | undefined) {
  if (!priceId) return "FREE" satisfies UserPlan;

  const proPrice = String(process.env.STRIPE_PRICE_PRO ?? "").trim();
  const ultraPrice = String(process.env.STRIPE_PRICE_ULTRA ?? "").trim();

  if (proPrice && priceId === proPrice) return "PRO" satisfies UserPlan;
  if (ultraPrice && priceId === ultraPrice) return "ULTRA" satisfies UserPlan;

  return "FREE" satisfies UserPlan;
}
