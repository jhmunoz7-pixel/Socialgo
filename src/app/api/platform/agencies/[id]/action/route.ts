/**
 * Platform Admin action endpoint.
 *
 * POST /api/platform/agencies/[id]/action
 * Body: { type: "change_plan" | "change_status" | "extend_trial" | "update_notes", payload: {...} }
 *
 * Every mutation is gated by checkPlatformAdmin and writes a row to
 * platform_actions_log for audit.
 */

import { NextResponse } from "next/server";
import { checkPlatformAdmin } from "@/lib/platform-admin";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { propagateStripePlan, type PropagationResult } from "@/lib/stripe-propagate";
import type { BillingCycle, PlanKey } from "@/lib/pricing-config";

export const dynamic = "force-dynamic";

type ChangePlanBody = { type: "change_plan"; payload: { plan: "free" | "pro" | "full_access" } };
type ChangeStatusBody = {
  type: "change_status";
  payload: { status: "trialing" | "active" | "past_due" | "canceled" };
};
type ExtendTrialBody = { type: "extend_trial"; payload: { days: number } };
type UpdateNotesBody = { type: "update_notes"; payload: { notes: string } };

type ActionBody =
  | ChangePlanBody
  | ChangeStatusBody
  | ExtendTrialBody
  | UpdateNotesBody;

const VALID_PLANS = new Set(["free", "pro", "full_access"]);
const VALID_STATUSES = new Set(["trialing", "active", "past_due", "canceled"]);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orgId } = await params;

  const admin = await checkPlatformAdmin();
  if (!admin.isAdmin || !admin.email) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: ActionBody;
  try {
    body = (await req.json()) as ActionBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const supabase = await createServiceRoleClient();

  // Load existing org for before/after diff + Stripe context
  const { data: before, error: fetchErr } = await supabase
    .from("organizations")
    .select(
      "id, plan, plan_status, trial_ends_at, internal_notes, stripe_subscription_id, billing_cycle"
    )
    .eq("id", orgId)
    .single();

  if (fetchErr || !before) {
    return NextResponse.json({ error: "agency_not_found" }, { status: 404 });
  }

  let update: Record<string, unknown> = {};
  let metadata: Record<string, unknown> = {};
  // Stripe propagation intent for this action (null = no Stripe side-effect).
  let stripeIntent: Parameters<typeof propagateStripePlan>[0]["change"] | null = null;

  const billingCycle = (before.billing_cycle ?? "monthly") as BillingCycle;

  switch (body.type) {
    case "change_plan": {
      const plan = body.payload?.plan;
      if (!plan || !VALID_PLANS.has(plan)) {
        return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
      }
      if (plan === before.plan) {
        return NextResponse.json({ ok: true, noop: true });
      }
      update = { plan };
      metadata = { from: before.plan, to: plan };
      stripeIntent = {
        kind: "plan",
        from: before.plan as PlanKey,
        to: plan as PlanKey,
      };
      break;
    }
    case "change_status": {
      const status = body.payload?.status;
      if (!status || !VALID_STATUSES.has(status)) {
        return NextResponse.json({ error: "invalid_status" }, { status: 400 });
      }
      if (status === before.plan_status) {
        return NextResponse.json({ ok: true, noop: true });
      }
      update = { plan_status: status };
      metadata = { from: before.plan_status, to: status };
      stripeIntent = {
        kind: "status",
        from: before.plan_status ?? "",
        to: status,
      };
      break;
    }
    case "extend_trial": {
      const days = Number(body.payload?.days);
      if (!Number.isFinite(days) || days <= 0 || days > 365) {
        return NextResponse.json({ error: "invalid_days" }, { status: 400 });
      }
      // Anchor to current trial_ends_at if in the future, else to now.
      const anchor = before.trial_ends_at
        ? new Date(before.trial_ends_at).getTime()
        : 0;
      const base = anchor > Date.now() ? anchor : Date.now();
      const newEnd = new Date(base + days * 24 * 60 * 60 * 1000).toISOString();
      update = { trial_ends_at: newEnd };
      // Also flip to trialing if currently canceled/past_due — admin intent.
      if (
        before.plan_status === "canceled" ||
        before.plan_status === "past_due"
      ) {
        update.plan_status = "trialing";
      }
      metadata = { days, from: before.trial_ends_at, to: newEnd };
      stripeIntent = { kind: "trial", trialEndsAtIso: newEnd };
      break;
    }
    case "update_notes": {
      const notes = body.payload?.notes ?? "";
      if (typeof notes !== "string" || notes.length > 10_000) {
        return NextResponse.json({ error: "invalid_notes" }, { status: 400 });
      }
      update = { internal_notes: notes };
      metadata = {
        length_before: (before.internal_notes ?? "").length,
        length_after: notes.length,
      };
      // Notes never touch Stripe.
      break;
    }
    default: {
      return NextResponse.json({ error: "invalid_type" }, { status: 400 });
    }
  }

  // Propagate to Stripe BEFORE writing DB. If Stripe rejects, we abort so
  // the two systems stay in sync. Orgs without a subscription are skipped.
  let stripeResult: PropagationResult | null = null;
  if (stripeIntent) {
    stripeResult = await propagateStripePlan({
      stripeSubscriptionId: before.stripe_subscription_id ?? null,
      billingCycle,
      change: stripeIntent,
    });
    if (!stripeResult.ok) {
      return NextResponse.json(
        { error: "stripe_propagation_failed", detail: stripeResult.error },
        { status: 502 }
      );
    }
    metadata = { ...metadata, stripe: stripeResult };
  }

  const { error: updateErr } = await supabase
    .from("organizations")
    .update(update)
    .eq("id", orgId);

  if (updateErr) {
    return NextResponse.json(
      { error: "update_failed", detail: updateErr.message },
      { status: 500 }
    );
  }

  // Audit log — don't block the response if this fails, but do log server-side.
  const { error: logErr } = await supabase.from("platform_actions_log").insert({
    admin_email: admin.email,
    action_type: body.type,
    org_id: orgId,
    metadata,
  });
  if (logErr) {
    console.error("[platform-admin] audit log insert failed:", logErr);
  }

  return NextResponse.json({ ok: true });
}
