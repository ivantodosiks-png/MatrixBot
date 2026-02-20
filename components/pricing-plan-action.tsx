"use client";

import { useState } from "react";
import type { PublicPlan } from "@/lib/plans";

type PricingPlanActionProps = {
  plan: PublicPlan;
  isAuthenticated: boolean;
  isCurrentPlan: boolean;
};

type ApiError = {
  error?: {
    message?: string;
  };
};

export default function PricingPlanAction(props: PricingPlanActionProps) {
  const { plan, isAuthenticated, isCurrentPlan } = props;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  if (!isAuthenticated) {
    return (
      <a className="lp-btn lp-btn-secondary" href="/login">
        Log in to choose
      </a>
    );
  }

  const isFree = plan === "free";

  async function onClick() {
    if (pending || isCurrentPlan) return;

    setPending(true);
    setError("");

    try {
      if (isFree) {
        const response = await fetch("/api/subscription/select-free", {
          method: "POST",
        });
        const data = (await response.json().catch(() => ({}))) as ApiError;
        if (!response.ok) {
          throw new Error(data.error?.message || `HTTP ${response.status}`);
        }
        window.location.href = "/pricing";
        return;
      }

      window.location.href = `/checkout?plan=${plan}`;
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Request failed";
      setError(message);
      setPending(false);
    }
  }

  const buttonLabel = isCurrentPlan
    ? "Current plan"
    : isFree
      ? "Select"
      : "Checkout";

  return (
    <div className="pricing-action-wrap">
      <button
        type="button"
        className={`lp-btn ${plan === "pro" ? "lp-btn-primary" : "lp-btn-secondary"}`}
        disabled={pending || isCurrentPlan}
        onClick={onClick}
      >
        {pending ? "Processing..." : buttonLabel}
      </button>
      {error ? <p className="pricing-action-error">{error}</p> : null}
    </div>
  );
}
