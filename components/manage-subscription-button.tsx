"use client";

import { useState } from "react";

type ApiResponse = {
  url?: string;
  error?: {
    message?: string;
  };
};

export default function ManageSubscriptionButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function onManageClick() {
    if (pending) return;

    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
      });
      const data = (await response.json().catch(() => ({}))) as ApiResponse;
      if (!response.ok || !data.url) {
        throw new Error(data.error?.message || `HTTP ${response.status}`);
      }

      window.location.href = data.url;
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Request failed";
      setError(message);
      setPending(false);
    }
  }

  return (
    <div className="account-manage-wrap">
      <button
        type="button"
        className="lp-btn lp-btn-secondary"
        onClick={onManageClick}
        disabled={pending}
      >
        {pending ? "Opening portal..." : "Manage subscription"}
      </button>
      {error ? <p className="account-action-error">{error}</p> : null}
    </div>
  );
}
