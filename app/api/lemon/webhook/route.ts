import { NextResponse } from "next/server";
import { resolvePlanByVariantId } from "@/lib/plans";
import {
  extractLemonCustomerId,
  extractLemonSubscriptionId,
  extractLemonVariantId,
  getLemonWebhookSecret,
  lemonPeriodEndToDate,
  normalizeLemonSubscriptionStatus,
  type LemonSubscription,
  type LemonWebhookEvent,
  verifyLemonWebhookSignature,
} from "@/lib/lemon";
import {
  updateUserSubscriptionByStripeCustomer,
  updateUserSubscriptionByUserId,
} from "@/lib/user-store";

export const runtime = "nodejs";

function readUserIdFromEvent(event: LemonWebhookEvent) {
  const candidate =
    event.meta?.custom_data?.user_id ??
    event.meta?.custom_data?.userId ??
    null;

  return typeof candidate === "string" && candidate.length > 0 ? candidate : null;
}

function extractSubscription(event: LemonWebhookEvent): LemonSubscription {
  const data = event.data;
  return {
    id: typeof data?.id === "number" ? String(data.id) : String(data?.id ?? ""),
    attributes: data?.attributes ?? null,
  };
}

function buildUpdateFromSubscription(subscription: LemonSubscription) {
  const status = normalizeLemonSubscriptionStatus(subscription.attributes?.status);
  const detectedPlan = resolvePlanByVariantId(extractLemonVariantId(subscription));
  const plan = status === "ACTIVE" ? detectedPlan : "FREE";

  return {
    plan,
    subscriptionStatus: status,
    stripeSubscriptionId: extractLemonSubscriptionId(subscription),
    currentPeriodEnd: lemonPeriodEndToDate(subscription),
    stripeCustomerId: extractLemonCustomerId(subscription),
  } as const;
}

async function syncSubscription(event: LemonWebhookEvent) {
  const subscription = extractSubscription(event);
  const update = buildUpdateFromSubscription(subscription);
  const userId = readUserIdFromEvent(event);
  const customerId = update.stripeCustomerId;

  if (userId) {
    await updateUserSubscriptionByUserId(userId, update);
    return;
  }

  if (customerId) {
    await updateUserSubscriptionByStripeCustomer(customerId, update);
  }
}

async function handleSubscriptionCanceled(event: LemonWebhookEvent) {
  const subscription = extractSubscription(event);
  const userId = readUserIdFromEvent(event);
  const customerId = extractLemonCustomerId(subscription);
  const update = {
    plan: "FREE" as const,
    subscriptionStatus: "CANCELED" as const,
    stripeSubscriptionId: extractLemonSubscriptionId(subscription),
    currentPeriodEnd: null,
    stripeCustomerId: customerId,
  };

  if (userId) {
    await updateUserSubscriptionByUserId(userId, update);
    return;
  }

  if (customerId) {
    await updateUserSubscriptionByStripeCustomer(customerId, update);
  }
}

async function handlePaymentFailed(event: LemonWebhookEvent) {
  const subscription = extractSubscription(event);
  const userId = readUserIdFromEvent(event);
  const customerId = extractLemonCustomerId(subscription);
  const update = {
    plan: "FREE" as const,
    subscriptionStatus: "PAST_DUE" as const,
    stripeSubscriptionId: extractLemonSubscriptionId(subscription),
    currentPeriodEnd: null,
    stripeCustomerId: customerId,
  };

  if (userId) {
    await updateUserSubscriptionByUserId(userId, update);
    return;
  }

  if (customerId) {
    await updateUserSubscriptionByStripeCustomer(customerId, update);
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("x-signature");

  try {
    const webhookSecret = getLemonWebhookSecret();
    const signatureValid = verifyLemonWebhookSignature({
      rawBody,
      signatureHeader,
      webhookSecret,
    });

    if (!signatureValid) {
      return NextResponse.json(
        { error: { message: "invalid webhook signature" } },
        { status: 400 }
      );
    }

    const event = JSON.parse(rawBody) as LemonWebhookEvent;
    const eventName = event.meta?.event_name ?? "";

    if (
      eventName === "subscription_created" ||
      eventName === "subscription_updated" ||
      eventName === "subscription_resumed" ||
      eventName === "subscription_unpaused" ||
      eventName === "subscription_payment_success"
    ) {
      await syncSubscription(event);
    }

    if (
      eventName === "subscription_cancelled" ||
      eventName === "subscription_expired"
    ) {
      await handleSubscriptionCanceled(event);
    }

    if (eventName === "subscription_payment_failed") {
      await handlePaymentFailed(event);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "lemon webhook handling failed";
    return NextResponse.json({ error: { message } }, { status: 500 });
  }
}
