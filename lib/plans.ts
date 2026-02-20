import type { UserPlan } from "@/lib/user-store";

export type PublicPlan = "free" | "pro" | "ultra";

export const PLAN_DETAILS = {
  FREE: {
    id: "free" as PublicPlan,
    name: "Free",
    priceLabel: "0 EUR",
    periodLabel: "forever",
    limitLabel: "Unlimited messages",
    perks: ["Core chat access"],
  },
  PRO: {
    id: "pro" as PublicPlan,
    name: "Pro",
    priceLabel: "9.99 EUR",
    periodLabel: "per month",
    limitLabel: "Unlimited messages",
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
