import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findUserById } from "@/lib/user-store";
import { createLemonCustomerPortalUrl } from "@/lib/lemon";

export const runtime = "nodejs";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: { message: "Authentication required" } },
        { status: 401 }
      );
    }

    const user = await findUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: { message: "User not found" } },
        { status: 404 }
      );
    }

    if (!user.stripe_subscription_id) {
      return NextResponse.json(
        { error: { message: "No active subscription for this user" } },
        { status: 400 }
      );
    }

    const url = await createLemonCustomerPortalUrl(user.stripe_subscription_id);
    return NextResponse.json({ url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed to create customer portal session";
    return NextResponse.json({ error: { message } }, { status: 500 });
  }
}
