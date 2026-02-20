import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import crypto from "node:crypto";
import { authOptions } from "@/lib/auth";
import { applyPaidPlanForUser, findUserById } from "@/lib/user-store";
import { sendReceiptEmail } from "@/lib/smtp-mailer";

export const runtime = "nodejs";

type RequestBody = {
  plan?: "pro" | "ultra";
  cardNumber?: string;
  expiry?: string;
  cvc?: string;
  cardholderName?: string;
};

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

function isValidLuhn(cardNumber: string) {
  let sum = 0;
  let shouldDouble = false;
  for (let i = cardNumber.length - 1; i >= 0; i -= 1) {
    let digit = Number(cardNumber[i]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

function validateExpiry(expiry: string) {
  const match = expiry.trim().match(/^(\d{2})\s*\/\s*(\d{2})$/);
  if (!match) return false;

  const month = Number(match[1]);
  const year = Number(match[2]);
  if (month < 1 || month > 12) return false;

  const now = new Date();
  const currentYear = now.getUTCFullYear() % 100;
  const currentMonth = now.getUTCMonth() + 1;

  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;
  return true;
}

function planToUserPlan(plan: "pro" | "ultra") {
  return plan === "pro" ? "PRO" : "ULTRA";
}

function planToAmount(plan: "pro" | "ultra") {
  return plan === "pro" ? "9.99 EUR / month" : "19.99 EUR / month";
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: { message: "Authentication required" } },
        { status: 401 }
      );
    }

    const body = (await request.json()) as RequestBody;
    const plan = body.plan;
    const cardNumber = normalizeDigits(String(body.cardNumber ?? ""));
    const expiry = String(body.expiry ?? "").trim();
    const cvc = normalizeDigits(String(body.cvc ?? ""));
    const cardholderName = String(body.cardholderName ?? "").trim();

    if (plan !== "pro" && plan !== "ultra") {
      return NextResponse.json(
        { error: { message: "plan must be pro or ultra" } },
        { status: 400 }
      );
    }

    if (!cardholderName || cardholderName.length < 2) {
      return NextResponse.json(
        { error: { message: "Cardholder name is required" } },
        { status: 400 }
      );
    }

    if (cardNumber.length < 13 || cardNumber.length > 19 || !isValidLuhn(cardNumber)) {
      return NextResponse.json(
        { error: { message: "Invalid card number" } },
        { status: 400 }
      );
    }

    if (!validateExpiry(expiry)) {
      return NextResponse.json(
        { error: { message: "Invalid or expired card date" } },
        { status: 400 }
      );
    }

    if (!/^\d{3,4}$/.test(cvc)) {
      return NextResponse.json(
        { error: { message: "Invalid CVC" } },
        { status: 400 }
      );
    }

    const user = await findUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: { message: "User not found" } },
        { status: 404 }
      );
    }

    const receiptId = crypto.randomUUID();
    await sendReceiptEmail({
      to: user.email,
      planName: plan.toUpperCase(),
      amountLabel: planToAmount(plan),
      receiptId,
      purchasedAt: new Date(),
    });

    await applyPaidPlanForUser(user.id, planToUserPlan(plan));

    return NextResponse.json({
      ok: true,
      receiptId,
      message: "Thank you for your purchase",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "payment processing failed";
    return NextResponse.json({ error: { message } }, { status: 500 });
  }
}
