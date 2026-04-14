/**
 * Stripe propagation helper for platform admin actions.
 *
 * When a platform admin changes plan/status/trial on an organization,
 * this module syncs those changes into the live Stripe subscription.
 *
 * Contract:
 *  - Returns { ok: true, skipped?: string } on success (skipped = no Stripe side-effect).
 *  - Returns { ok: false, error } when Stripe rejects the change.
 *    Caller MUST abort the DB update when ok === false, otherwise
 *    DB and Stripe drift out of sync.
 *  - Never throws. All Stripe errors are caught and surfaced as strings.
 *
 * Orgs without a Stripe subscription (free plan, manual setup) are skipped
 * silently — the admin decision is DB-only, and the user will go through
 * Checkout later if they want to pay.
 */

import Stripe from "stripe";
import { getStripeServer } from "./stripe";
import { getPriceId, type BillingCycle, type PlanKey } from "./pricing-config";

export type PropagationInput = {
  stripeSubscriptionId: string | null;
  billingCycle: BillingCycle;
  change:
    | { kind: "plan"; from: PlanKey; to: PlanKey }
    | { kind: "status"; from: string; to: "trialing" | "active" | "past_due" | "canceled" }
    | { kind: "trial"; trialEndsAtIso: string };
};

export type PropagationResult =
  | { ok: true; skipped?: string; stripe_action?: string }
  | { ok: false; error: string };

/**
 * Main entry point. Applies `change` to the given Stripe subscription.
 */
export async function propagateStripePlan(
  input: PropagationInput
): Promise<PropagationResult> {
  const { stripeSubscriptionId, billingCycle, change } = input;

  // No subscription to sync → admin change is DB-only.
  if (!stripeSubscriptionId) {
    return { ok: true, skipped: "no_subscription" };
  }

  const stripe = getStripeServer();

  try {
    switch (change.kind) {
      case "plan":
        return await applyPlanChange(stripe, stripeSubscriptionId, billingCycle, change);
      case "status":
        return await applyStatusChange(stripe, stripeSubscriptionId, change);
      case "trial":
        return await applyTrialChange(stripe, stripeSubscriptionId, change);
    }
  } catch (err) {
    const msg = err instanceof Stripe.errors.StripeError ? err.message : (err as Error)?.message ?? "unknown_stripe_error";
    return { ok: false, error: msg };
  }
}

async function applyPlanChange(
  stripe: Stripe,
  subId: string,
  billingCycle: BillingCycle,
  change: { from: PlanKey; to: PlanKey }
): Promise<PropagationResult> {
  // Moving TO free → cancel at period end. Don't delete — let customer keep
  // access until they've paid for.
  if (change.to === "free") {
    await stripe.subscriptions.update(subId, { cancel_at_period_end: true });
    return { ok: true, stripe_action: "cancel_at_period_end" };
  }

  // Moving FROM free → impossible via admin; free has no subscription.
  // Defensive: the subId exists, so the "from" is not actually free.
  // Proceed with price swap.

  const newPriceId = getPriceId(change.to, billingCycle);
  if (!newPriceId) {
    return {
      ok: false,
      error: `missing_price_id_for_${change.to}_${billingCycle}`,
    };
  }

  // Retrieve current subscription to find the item ID to swap.
  const current = await stripe.subscriptions.retrieve(subId);
  if (!current.items.data.length) {
    return { ok: false, error: "subscription_has_no_items" };
  }
  const itemId = current.items.data[0].id;
  const currentPriceId = current.items.data[0].price.id;

  // Idempotent short-circuit.
  if (currentPriceId === newPriceId) {
    return { ok: true, skipped: "same_price" };
  }

  // If admin previously scheduled a cancel, plan change re-activates.
  await stripe.subscriptions.update(subId, {
    cancel_at_period_end: false,
    items: [{ id: itemId, price: newPriceId }],
    proration_behavior: "create_prorations",
  });

  return { ok: true, stripe_action: "price_swap" };
}

async function applyStatusChange(
  stripe: Stripe,
  subId: string,
  change: { to: "trialing" | "active" | "past_due" | "canceled" }
): Promise<PropagationResult> {
  switch (change.to) {
    case "canceled":
      // Soft cancel — keep access until the period ends.
      await stripe.subscriptions.update(subId, { cancel_at_period_end: true });
      return { ok: true, stripe_action: "cancel_at_period_end" };

    case "active": {
      // If there's a pending cancel, revoke it. Otherwise no-op.
      const current = await stripe.subscriptions.retrieve(subId);
      if (current.cancel_at_period_end) {
        await stripe.subscriptions.update(subId, { cancel_at_period_end: false });
        return { ok: true, stripe_action: "revoke_cancel" };
      }
      return { ok: true, skipped: "already_active" };
    }

    case "past_due":
    case "trialing":
      // Neither status is admin-actionable on Stripe's side — these are
      // reflections of Stripe's own lifecycle. Just skip.
      return { ok: true, skipped: `status_${change.to}_not_actionable` };
  }
}

async function applyTrialChange(
  stripe: Stripe,
  subId: string,
  change: { trialEndsAtIso: string }
): Promise<PropagationResult> {
  const trialEndUnix = Math.floor(new Date(change.trialEndsAtIso).getTime() / 1000);
  if (!Number.isFinite(trialEndUnix) || trialEndUnix <= 0) {
    return { ok: false, error: "invalid_trial_end" };
  }

  await stripe.subscriptions.update(subId, {
    trial_end: trialEndUnix,
    proration_behavior: "none",
  });
  return { ok: true, stripe_action: "trial_end_updated" };
}
