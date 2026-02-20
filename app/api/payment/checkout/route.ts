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
    const cardNumber = String(body.cardNumber ?? "").trim();
    const expiry = String(body.expiry ?? "").trim();
    const cvc = String(body.cvc ?? "").trim();
    const cardholderName = String(body.cardholderName ?? "").trim();

    if (plan !== "pro" && plan !== "ultra") {
      return NextResponse.json(
        { error: { message: "plan must be pro or ultra" } },
        { status: 400 }
      );
    }

    if (!cardholderName) {
      return NextResponse.json(
        { error: { message: "Cardholder name is required" } },
        { status: 400 }
      );
    }

    if (!cardNumber) {
      return NextResponse.json(
        { error: { message: "Card number is required" } },
        { status: 400 }
      );
    }

    if (!expiry) {
      return NextResponse.json(
        { error: { message: "Expiry is required" } },
        { status: 400 }
      );
    }

    if (!cvc) {
      return NextResponse.json(
        { error: { message: "CVC is required" } },
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
