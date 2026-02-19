import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findUserById, setStripeCustomerIdForUser } from "@/lib/user-store";
import {
  createStripeCheckoutSession,
  createStripeCustomer,
  getAppUrl,
} from "@/lib/stripe";
import { getStripePriceIdForPlan } from "@/lib/stripe-config";

export const runtime = "nodejs";

type RequestBody = {
  plan?: "pro" | "ultra";
};

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
    const plan = body?.plan;

    if (plan !== "pro" && plan !== "ultra") {
      return NextResponse.json(
        { error: { message: "plan must be pro or ultra" } },
        { status: 400 }
      );
    }

    const priceId = getStripePriceIdForPlan(plan);

    const user = await findUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: { message: "User not found" } },
        { status: 404 }
      );
    }

    let customerId = user.stripe_customer_id;
    if (!customerId) {
      customerId = await createStripeCustomer({
        email: user.email,
        name: user.name,
        userId: user.id,
      });
      await setStripeCustomerIdForUser(user.id, customerId);
    }

    const appUrl = getAppUrl();
    const url = await createStripeCheckoutSession({
      customerId,
      priceId,
      successUrl: `${appUrl}/account?success=1`,
      cancelUrl: `${appUrl}/pricing?canceled=1`,
    });

    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed to create checkout session";
    return NextResponse.json(
      { error: { message } },
      { status: 500 }
    );
  }
}
