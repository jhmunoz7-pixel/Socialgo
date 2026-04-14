/**
 * Stripe enrichment — fetches live subscription + latest invoice data
 * from Stripe for organizations with stripe_subscription_id.
 *
 * Used by the platform admin dashboard to overlay Supabase state with
 * real-time Stripe truth (MRR from actual price amount, next billing,
 * payment status).
 *
 * Fails open: if Stripe call errors, returns null for that org and
 * the caller falls back to Supabase/config values. Never throws.
 */

import Stripe from "stripe";
import { getStripeServer } from "./stripe";

export type StripeEnrichment = {
  subscriptionId: string;
  customerId: string;
  status: Stripe.Subscription.Status;
  currency: string;
  /** Monthly-normalized amount in MAJOR units (e.g. MXN pesos, not cents). */
  mrrMajor: number;
  /** Raw price unit amount in MAJOR units (for display of actual charge). */
  priceAmountMajor: number;
  interval: Stripe.Price.Recurring.Interval;
  intervalCount: number;
  /** Unix seconds. null if subscription has no upcoming renewal. */
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  /** Latest invoice status — null if no invoice yet. */
  latestInvoiceStatus: Stripe.Invoice.Status | null;
  latestInvoiceAmountMajor: number | null;
  latestInvoiceHostedUrl: string | null;
};

/**
 * Normalize any recurring price into its monthly equivalent (MRR).
 * quarterly → /3, annual → /12, monthly → /1.
 */
function monthlyFrom(
  amountMajor: number,
  interval: Stripe.Price.Recurring.Interval,
  intervalCount: number
): number {
  if (interval === "year") return amountMajor / (12 * intervalCount);
  if (interval === "month") return amountMajor / intervalCount;
  if (interval === "week") return (amountMajor * 52) / (12 * intervalCount);
  if (interval === "day") return (amountMajor * 365) / (12 * intervalCount);
  return amountMajor;
}

async function fetchOne(
  stripe: Stripe,
  subscriptionId: string
): Promise<StripeEnrichment | null> {
  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["items.data.price", "latest_invoice"],
    });

    const item = sub.items.data[0];
    if (!item) return null;

    const price = item.price;
    const unitAmount = price.unit_amount ?? 0;
    const amountMajor = unitAmount / 100;

    const interval = price.recurring?.interval ?? "month";
    const intervalCount = price.recurring?.interval_count ?? 1;

    const latestInvoice =
      sub.latest_invoice && typeof sub.latest_invoice !== "string"
        ? (sub.latest_invoice as Stripe.Invoice)
        : null;

    return {
      subscriptionId: sub.id,
      customerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      status: sub.status,
      currency: price.currency.toUpperCase(),
      mrrMajor: monthlyFrom(amountMajor, interval, intervalCount),
      priceAmountMajor: amountMajor,
      interval,
      intervalCount,
      currentPeriodEnd: (sub as any).current_period_end ?? null,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      latestInvoiceStatus: latestInvoice?.status ?? null,
      latestInvoiceAmountMajor:
        latestInvoice && latestInvoice.amount_paid != null
          ? latestInvoice.amount_paid / 100
          : null,
      latestInvoiceHostedUrl: latestInvoice?.hosted_invoice_url ?? null,
    };
  } catch (err) {
    console.warn(
      `[stripe-enrichment] Failed to retrieve subscription ${subscriptionId}:`,
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

/**
 * Enrich a list of subscription IDs in parallel. Order is preserved.
 * Missing / failed lookups return null in the map for that ID.
 */
export async function enrichSubscriptions(
  subscriptionIds: string[]
): Promise<Map<string, StripeEnrichment>> {
  const result = new Map<string, StripeEnrichment>();
  if (subscriptionIds.length === 0) return result;

  // Skip work if Stripe isn't configured (local dev, preview deploys, etc.)
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn("[stripe-enrichment] STRIPE_SECRET_KEY not set — skipping");
    return result;
  }

  const stripe = getStripeServer();
  const unique = Array.from(new Set(subscriptionIds));

  const settled = await Promise.allSettled(
    unique.map((id) => fetchOne(stripe, id))
  );

  settled.forEach((s, i) => {
    if (s.status === "fulfilled" && s.value) {
      result.set(unique[i], s.value);
    }
  });

  return result;
}
