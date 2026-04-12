/**
 * Stripe webhook endpoint
 * Handles webhook events from Stripe (payment_intent.succeeded, customer.subscription.updated, etc.)
 * POST /api/stripe/webhook
 *
 * IMPORTANT: Set this webhook URL in Stripe dashboard to receive events:
 * https://your-domain.com/api/stripe/webhook
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripeServer, getStripeWebhookSecret } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Handler for different Stripe webhook events
 */
async function handleCheckoutSessionCompleted(
  event: Stripe.CheckoutSessionCompletedEvent
) {
  const session = event.data.object;
  const userId = session.metadata?.userId;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!userId || !customerId || !subscriptionId) {
    console.error("Missing required data in checkout.session.completed event", {
      userId,
      customerId,
      subscriptionId,
    });
    return;
  }

  const supabase = await createServiceRoleClient();

  // Find organization by finding the user member and getting the org_id
  const { data: members, error: memberError } = await supabase
    .from("organization_members")
    .select("org_id")
    .eq("user_id", userId)
    .limit(1);

  if (memberError || !members || members.length === 0) {
    console.error("Failed to find organization for user:", userId, memberError);
    return;
  }

  const orgId = members[0].org_id;

  // Get subscription details from Stripe to determine the plan
  const stripe = getStripeServer();
  let plan: "free" | "pro" | "full_access" = "free";
  let clientLimit = 1;
  let billingCycle: "monthly" | "quarterly" | "annual" = "monthly";

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["items.data.price"],
    });

    if (subscription.items.data.length > 0) {
      const price = subscription.items.data[0].price;
      const lookupKey = price.lookup_key || "";

      // Determine plan based on lookup_key
      if (lookupKey.toLowerCase().includes("pro")) {
        plan = "pro";
        clientLimit = 5;
      } else if (lookupKey.toLowerCase().includes("full")) {
        plan = "full_access";
        clientLimit = 20;
      }

      // Determine billing cycle
      if (price.recurring) {
        const interval = price.recurring.interval;
        const intervalCount = price.recurring.interval_count || 1;

        if (interval === "month" && intervalCount === 1) {
          billingCycle = "monthly";
        } else if (interval === "month" && intervalCount === 3) {
          billingCycle = "quarterly";
        } else if (interval === "year") {
          billingCycle = "annual";
        }
      }
    }
  } catch (stripeError) {
    console.error("Failed to retrieve subscription from Stripe:", stripeError);
  }

  // Update organization with Stripe details
  const { error } = await supabase
    .from("organizations")
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      plan,
      plan_status: "active",
      billing_cycle: billingCycle,
      client_limit: clientLimit,
    })
    .eq("id", orgId);

  if (error) {
    console.error("Failed to update organization with subscription:", error);
  }
}

async function handleCustomerSubscriptionUpdated(
  event: Stripe.CustomerSubscriptionUpdatedEvent
) {
  const subscription = event.data.object;

  const supabase = await createServiceRoleClient();

  // Map Stripe subscription status to plan_status
  const planStatus = subscription.status as
    | "trialing"
    | "active"
    | "past_due"
    | "canceled";

  // Determine if plan or billing_cycle changed
  let plan: "free" | "pro" | "full_access" | undefined;
  let billingCycle: "monthly" | "quarterly" | "annual" | undefined;
  let clientLimit: number | undefined;

  if (subscription.items.data.length > 0) {
    const price = subscription.items.data[0].price;
    const lookupKey = price.lookup_key || "";

    // Determine plan based on lookup_key
    if (lookupKey.toLowerCase().includes("pro")) {
      plan = "pro";
      clientLimit = 5;
    } else if (lookupKey.toLowerCase().includes("full")) {
      plan = "full_access";
      clientLimit = 20;
    }

    // Determine billing cycle
    if (price.recurring) {
      const interval = price.recurring.interval;
      const intervalCount = price.recurring.interval_count || 1;

      if (interval === "month" && intervalCount === 1) {
        billingCycle = "monthly";
      } else if (interval === "month" && intervalCount === 3) {
        billingCycle = "quarterly";
      } else if (interval === "year") {
        billingCycle = "annual";
      }
    }
  }

  // Build update object with only changed fields
  const updateData: any = {
    plan_status: planStatus,
  };

  if (plan) updateData.plan = plan;
  if (billingCycle) updateData.billing_cycle = billingCycle;
  if (clientLimit) updateData.client_limit = clientLimit;

  // Update organization record in database
  const { error } = await supabase
    .from("organizations")
    .update(updateData)
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    console.error("Failed to update organization subscription:", error);
  }
}

async function handleCustomerSubscriptionDeleted(
  event: Stripe.CustomerSubscriptionDeletedEvent
) {
  const subscription = event.data.object;

  const supabase = await createServiceRoleClient();

  // Reset organization to free plan when subscription is deleted
  const { error } = await supabase
    .from("organizations")
    .update({
      plan: "free",
      plan_status: "canceled",
      client_limit: 1,
    })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    console.error("Failed to cancel organization subscription:", error);
  }
}

async function handleChargeSucceeded(event: Stripe.ChargeSucceededEvent) {
  const charge = event.data.object;

  // Optional: Log successful charges for analytics
  console.log("Charge succeeded:", {
    chargeId: charge.id,
    amount: charge.amount,
    currency: charge.currency,
    customerId: charge.customer,
  });
}

async function handleChargeFailed(event: Stripe.ChargeFailedEvent) {
  const charge = event.data.object;

  console.error("Charge failed:", {
    chargeId: charge.id,
    failureMessage: charge.failure_message,
    customerId: charge.customer,
  });

  // Optional: Send email notification to user
  // Optional: Update subscription status to past_due if recurring
}

export async function POST(request: NextRequest) {
  try {
    // Get webhook secret
    const webhookSecret = getStripeWebhookSecret();

    // Get raw body for signature verification
    const body = await request.text();

    // Get Stripe signature from headers
    const signature = request.headers.get("stripe-signature") || "";

    // Verify webhook signature
    const stripe = getStripeServer();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (signatureError) {
      console.error("Webhook signature verification failed:", signatureError);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event as Stripe.CheckoutSessionCompletedEvent
        );
        break;

      case "customer.subscription.updated":
        await handleCustomerSubscriptionUpdated(
          event as Stripe.CustomerSubscriptionUpdatedEvent
        );
        break;

      case "customer.subscription.deleted":
        await handleCustomerSubscriptionDeleted(
          event as Stripe.CustomerSubscriptionDeletedEvent
        );
        break;

      case "charge.succeeded":
        await handleChargeSucceeded(event as Stripe.ChargeSucceededEvent);
        break;

      case "charge.failed":
        await handleChargeFailed(event as Stripe.ChargeFailedEvent);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Acknowledge receipt of the event
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
