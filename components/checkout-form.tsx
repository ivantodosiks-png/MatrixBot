"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { PublicPlan } from "@/lib/plans";

type CheckoutFormProps = {
  plan: PublicPlan;
  email: string;
};

type ApiResponse = {
  ok?: boolean;
  message?: string;
  receiptId?: string;
  error?: {
    message?: string;
  };
};

function normalizeCardDisplay(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 19);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function normalizeExpiryDisplay(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export default function CheckoutForm({ plan, email }: CheckoutFormProps) {
  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [receiptId, setReceiptId] = useState("");

  const amountLabel = useMemo(() => {
    if (plan === "pro") return "9.99 EUR / month";
    if (plan === "ultra") return "19.99 EUR / month";
    return "0 EUR";
  }, [plan]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || plan === "free") return;

    setPending(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/payment/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          cardholderName,
          cardNumber,
          expiry,
          cvc,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as ApiResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.error?.message || `HTTP ${response.status}`);
      }

      setReceiptId(data.receiptId || "");
      setSuccessMessage(data.message || "Thank you for your purchase");
      setCardNumber("");
      setExpiry("");
      setCvc("");
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Payment request failed";
      setError(message);
    } finally {
      setPending(false);
    }
  }

  if (plan === "free") {
    return (
      <p className="checkout-error">
        Free plan does not require payment. Go back to pricing and select Free.
      </p>
    );
  }

  return (
    <form className="checkout-form" onSubmit={onSubmit}>
      <div className="checkout-summary">
        <p>
          Plan: <strong>{plan.toUpperCase()}</strong>
        </p>
        <p>
          Amount: <strong>{amountLabel}</strong>
        </p>
        <p>
          Receipt email: <strong>{email}</strong>
        </p>
      </div>

      <label className="checkout-label">
        Cardholder name
        <input
          className="checkout-input"
          type="text"
          value={cardholderName}
          onChange={(event) => setCardholderName(event.target.value)}
          required
          minLength={2}
          autoComplete="cc-name"
        />
      </label>

      <label className="checkout-label">
        Card number
        <input
          className="checkout-input"
          type="text"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="4242 4242 4242 4242"
          value={cardNumber}
          onChange={(event) => setCardNumber(normalizeCardDisplay(event.target.value))}
          required
        />
      </label>

      <div className="checkout-row">
        <label className="checkout-label">
          Expiry (MM/YY)
          <input
            className="checkout-input"
            type="text"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="12/30"
            value={expiry}
            onChange={(event) => setExpiry(normalizeExpiryDisplay(event.target.value))}
            required
          />
        </label>

        <label className="checkout-label">
          CVC
          <input
            className="checkout-input"
            type="password"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="123"
            value={cvc}
            onChange={(event) => setCvc(event.target.value.replace(/\D/g, "").slice(0, 4))}
            required
          />
        </label>
      </div>

      <button type="submit" className="lp-btn lp-btn-primary" disabled={pending}>
        {pending ? "Processing..." : "Buy now"}
      </button>

      {error ? <p className="checkout-error">{error}</p> : null}
      {successMessage ? (
        <p className="checkout-success">
          {successMessage}
          {receiptId ? ` Receipt: ${receiptId}` : ""}
        </p>
      ) : null}
    </form>
  );
}
