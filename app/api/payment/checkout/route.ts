import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import crypto from "node:crypto";
import { authOptions } from "@/lib/auth";
import { findUserById } from "@/lib/user-store";
import { sendReceiptEmail } from "@/lib/smtp-mailer";

export const runtime = "nodejs";

type RequestBody = {
  plan?: "pro" | "ultra";
  cardNumber?: string;
  expiry?: string;
  cvc?: string;
  cardholderName?: string;
};

function planToAmount(plan: "pro" | "ultra") {
  return plan === "pro" ? 9.99 : 19.99;
}

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

function maskCardNumber(cardNumber: string) {
  const digits = normalizeDigits(cardNumber);
  const tail = digits.slice(-4) || "0000";
  return `Card **** **** **** ${tail}`;
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
    const cardNumberRaw = String(body.cardNumber ?? "").trim();
    const expiry = String(body.expiry ?? "").trim();
    const cvcRaw = String(body.cvc ?? "").trim();
    const cardholderName = String(body.cardholderName ?? "").trim();
    const cardNumber = normalizeDigits(cardNumberRaw);
    const cvc = normalizeDigits(cvcRaw);

    if (plan !== "pro" && plan !== "ultra") {
      return NextResponse.json(
        { error: { message: "plan must be pro or ultra" } },
        { status: 400 }
      );
    }

    if (!cardholderName || cardholderName.length < 2 || cardholderName.length > 80) {
      return NextResponse.json(
        { error: { message: "Cardholder name is invalid" } },
        { status: 400 }
      );
    }

    if (!/^\d{12,19}$/.test(cardNumber)) {
      return NextResponse.json(
        { error: { message: "Card number is invalid" } },
        { status: 400 }
      );
    }

    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) {
      return NextResponse.json(
        { error: { message: "Expiry must be in MM/YY format" } },
        { status: 400 }
      );
    }

    if (!/^\d{3,4}$/.test(cvc)) {
      return NextResponse.json(
        { error: { message: "CVC is invalid" } },
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

    const amount = planToAmount(plan);
    const receiptId = crypto.randomUUID();
    await sendReceiptEmail({
      to: user.email,
      customerName: cardholderName,
      planName: plan.toUpperCase(),
      amountValue: amount,
      currency: "EUR",
      paymentMethod: maskCardNumber(cardNumber),
      receiptId,
      purchasedAt: new Date(),
    });

    return NextResponse.json({
      ok: true,
      receiptId,
      message: "Thank you for your purchase. Receipt sent to your email.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "payment processing failed";
    return NextResponse.json({ error: { message } }, { status: 500 });
  }
}
