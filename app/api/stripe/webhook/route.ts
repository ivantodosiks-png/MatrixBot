import { NextResponse } from "next/server";
import { resolvePlanByPriceId } from "@/lib/plans";
import {
  getStripeWebhookSecret,
  getSubscriptionPriceId,
  normalizeStripeSubscriptionStatus,
  retrieveStripeSubscription,
  unixSecondsToDate,
  verifyStripeWebhookSignature,
  type StripeCheckoutSession,
  type StripeInvoice,
  type StripeSubscription,
  type StripeWebhookEvent,
} from "@/lib/stripe";
import { updateUserSubscriptionByStripeCustomer } from "@/lib/user-store";

export const runtime = "nodejs";

function asString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

async function syncSubscription(subscription: StripeSubscription) {
  const customerId = asString(subscription.customer);
  if (!customerId) return;

  const status = normalizeStripeSubscriptionStatus(subscription.status);
  const detectedPlan = resolvePlanByPriceId(getSubscriptionPriceId(subscription));
  const plan = status === "ACTIVE" ? detectedPlan : "FREE";

  await updateUserSubscriptionByStripeCustomer(customerId, {
    plan,
    subscriptionStatus: status,
    stripeSubscriptionId: asString(subscription.id),
    currentPeriodEnd: unixSecondsToDate(subscription.current_period_end),
  });
}

async function handleCheckoutCompleted(session: StripeCheckoutSession) {
  const customerId = asString(session.customer);
  const subscriptionId = asString(session.subscription);

  if (!customerId || !subscriptionId || session.mode !== "subscription") {
    return;
  }

  const subscription = await retrieveStripeSubscription(subscriptionId);
  await syncSubscription(subscription);
}

async function handlePaymentFailed(invoice: StripeInvoice) {
  const customerId = asString(invoice.customer);
  if (!customerId) return;

  await updateUserSubscriptionByStripeCustomer(customerId, {
    plan: "FREE",
    subscriptionStatus: "PAST_DUE",
    stripeSubscriptionId: asString(invoice.subscription),
    currentPeriodEnd: null,
  });
}

async function handleSubscriptionDeleted(subscription: StripeSubscription) {
  const customerId = asString(subscription.customer);
  if (!customerId) return;

  await updateUserSubscriptionByStripeCustomer(customerId, {
    plan: "FREE",
    subscriptionStatus: "CANCELED",
    stripeSubscriptionId: null,
    currentPeriodEnd: null,
  });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("stripe-signature");

  try {
    const webhookSecret = getStripeWebhookSecret();
    const signatureValid = verifyStripeWebhookSignature({
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

    const event = JSON.parse(rawBody) as StripeWebhookEvent;
    const eventType = event.type;
    const eventObject = event.data?.object;

    if (eventType === "checkout.session.completed") {
      await handleCheckoutCompleted((eventObject ?? {}) as StripeCheckoutSession);
    }

    if (
      eventType === "customer.subscription.created" ||
      eventType === "customer.subscription.updated"
    ) {
      await syncSubscription((eventObject ?? {}) as StripeSubscription);
    }

    if (eventType === "customer.subscription.deleted") {
      await handleSubscriptionDeleted((eventObject ?? {}) as StripeSubscription);
    }

    if (eventType === "invoice.payment_failed") {
      await handlePaymentFailed((eventObject ?? {}) as StripeInvoice);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "stripe webhook handling failed";
    return NextResponse.json(
      { error: { message } },
      { status: 500 }
    );
  }
}
