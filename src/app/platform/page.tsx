/**
 * Platform Admin Dashboard
 *
 * Jorge's god-mode view of SocialGo.
 *
 * Access is gated by the layout — this page assumes the caller is authorized.
 * All queries use the service role client to bypass RLS (cross-tenant read).
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import { SOCIALGO_PLANS } from "@/lib/pricing-config";
import {
  enrichSubscriptions,
  type StripeEnrichment,
} from "@/lib/stripe-enrichment";
import AgenciesTable, { type PlatformAgencyRow } from "./AgenciesTable";
import MRRChart, { type MRRPoint } from "./MRRChart";

// Platform admin must always reflect live Stripe state — never cache.
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PlanKey = keyof typeof SOCIALGO_PLANS;

type Organization = {
  id: string;
  name: string;
  slug: string;
  plan: PlanKey;
  plan_status: "trialing" | "active" | "past_due" | "canceled";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
  trial_ends_at: string | null;
  internal_notes: string | null;
};

type AgencyRow = Organization & {
  clientsCount: number;
  postsThisMonth: number;
  mrr: number;
  stripe: StripeEnrichment | null;
};

async function loadPlatformData() {
  const supabase = await createServiceRoleClient();

  const [orgsRes, clientsRes, postsRes] = await Promise.all([
    supabase
      .from("organizations")
      .select(
        "id, name, slug, plan, plan_status, stripe_customer_id, stripe_subscription_id, created_at, updated_at, trial_ends_at, internal_notes"
      )
      .order("created_at", { ascending: false }),
    supabase.from("clients").select("org_id"),
    supabase
      .from("posts")
      .select("org_id, created_at")
      .gte("created_at", firstOfThisMonthISO()),
  ]);

  const orgs = (orgsRes.data ?? []) as Organization[];
  const clientRows = (clientsRes.data ?? []) as { org_id: string }[];
  const postRows = (postsRes.data ?? []) as {
    org_id: string;
    created_at: string;
  }[];

  const clientsByOrg = countBy(clientRows, (r) => r.org_id);
  const postsByOrg = countBy(postRows, (r) => r.org_id);

  // Enrich with live Stripe data for orgs that have a subscription ID.
  const subscriptionIds = orgs
    .map((o) => o.stripe_subscription_id)
    .filter((id): id is string => !!id);
  const stripeByIdPromise = enrichSubscriptions(subscriptionIds);
  const stripeById = await stripeByIdPromise;

  const agencies: AgencyRow[] = orgs.map((o) => {
    const stripe = o.stripe_subscription_id
      ? stripeById.get(o.stripe_subscription_id) ?? null
      : null;
    // Prefer live Stripe MRR when available; fall back to pricing-config.
    const mrr = stripe ? Math.round(stripe.mrrMajor) : mrrFor(o.plan);
    return {
      ...o,
      clientsCount: clientsByOrg.get(o.id) ?? 0,
      postsThisMonth: postsByOrg.get(o.id) ?? 0,
      mrr,
      stripe,
    };
  });

  // Aggregate metrics
  const totalMRR = agencies.reduce(
    (sum, a) =>
      a.plan_status === "active" || a.plan_status === "trialing"
        ? sum + a.mrr
        : sum,
    0
  );

  // Real revenue this month: sum of latest-invoice amount_paid for active subs.
  const realRevenueThisMonth = agencies.reduce((sum, a) => {
    if (!a.stripe) return sum;
    if (a.stripe.latestInvoiceStatus !== "paid") return sum;
    return sum + (a.stripe.latestInvoiceAmountMajor ?? 0);
  }, 0);

  // Count failed/unpaid invoices across all agencies.
  const failedInvoices = agencies.filter(
    (a) =>
      a.stripe &&
      (a.stripe.latestInvoiceStatus === "uncollectible" ||
        a.stripe.latestInvoiceStatus === "open" &&
          (a.stripe.status === "past_due" || a.stripe.status === "unpaid"))
  ).length;
  const activeAgencies = agencies.filter(
    (a) => a.plan_status === "active" || a.plan_status === "trialing"
  ).length;
  const canceledAgencies = agencies.filter(
    (a) => a.plan_status === "canceled"
  ).length;
  const pastDueAgencies = agencies.filter(
    (a) => a.plan_status === "past_due"
  ).length;
  const totalAgencies = agencies.length;

  const churnRate =
    totalAgencies > 0 ? (canceledAgencies / totalAgencies) * 100 : 0;

  const totalClients = clientRows.length;
  const totalPostsThisMonth = postRows.length;

  // "New MRR this month" — sum MRR for orgs created this month with paid plan.
  const firstOfMonth = new Date(firstOfThisMonthISO());
  const newMRR = agencies.reduce((sum, a) => {
    const created = new Date(a.created_at);
    if (
      created >= firstOfMonth &&
      (a.plan_status === "active" || a.plan_status === "trialing")
    ) {
      return sum + a.mrr;
    }
    return sum;
  }, 0);

  // MRR series — last 6 months. For each month bucket, sum MRR for agencies
  // that were created on or before the end of that month and are currently
  // active/trialing (approximation — we don't track historical plan changes yet).
  const now = new Date();
  const mrrSeries: MRRPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const mrr = agencies.reduce((sum, a) => {
      const created = new Date(a.created_at);
      if (created > endOfMonth) return sum;
      if (a.plan_status !== "active" && a.plan_status !== "trialing") return sum;
      return sum + a.mrr;
    }, 0);
    mrrSeries.push({
      label: d.toLocaleDateString("es-MX", { month: "short" }).replace(".", ""),
      mrr,
    });
  }

  return {
    agencies,
    metrics: {
      totalMRR,
      activeAgencies,
      totalAgencies,
      pastDueAgencies,
      newMRR,
      churnRate,
      totalClients,
      totalPostsThisMonth,
      realRevenueThisMonth,
      failedInvoices,
      stripeLinkedCount: stripeById.size,
    },
    mrrSeries,
  };
}

// ===== Helpers =====

function firstOfThisMonthISO(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

function mrrFor(plan: PlanKey): number {
  // Use the "per-month display price" from pricing-config regardless of
  // billing cycle. free → 0.
  return SOCIALGO_PLANS[plan]?.prices.monthly ?? 0;
}

function countBy<T>(rows: T[], key: (r: T) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = key(r);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

function formatMXN(n: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);
}

// ===== Tile component =====

function Tile({
  label,
  value,
  delta,
  deltaTone = "flat",
  alert = false,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: "up" | "down" | "flat";
  alert?: boolean;
}) {
  const deltaColors: Record<string, { bg: string; fg: string }> = {
    up: { bg: "rgba(180,249,101,0.15)", fg: "#B4F965" },
    down: { bg: "rgba(255,107,107,0.15)", fg: "#FF6B6B" },
    flat: { bg: "rgba(108,122,131,0.2)", fg: "#6C7A83" },
  };
  return (
    <div
      style={{
        background: "#354654",
        border: alert
          ? "1px solid rgba(255,107,107,0.4)"
          : "1px solid rgba(108,122,131,0.2)",
        borderRadius: 12,
        padding: "16px 18px",
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 0.8,
          color: "#6C7A83",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: -0.5,
          color: alert ? "#FF6B6B" : "#E5E5E3",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {delta && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            marginTop: 8,
            fontSize: 11,
            fontWeight: 700,
            padding: "3px 7px",
            borderRadius: 5,
            background: deltaColors[deltaTone].bg,
            color: deltaColors[deltaTone].fg,
          }}
        >
          {delta}
        </span>
      )}
    </div>
  );
}

// ===== Page =====

export default async function PlatformDashboard() {
  const { agencies, metrics, mrrSeries } = await loadPlatformData();

  const tableRows: PlatformAgencyRow[] = agencies.map((a) => ({
    id: a.id,
    name: a.name,
    slug: a.slug,
    plan: a.plan,
    plan_status: a.plan_status,
    mrr: a.mrr,
    clientsCount: a.clientsCount,
    postsThisMonth: a.postsThisMonth,
    created_at: a.created_at,
    trial_ends_at: a.trial_ends_at,
    internal_notes: a.internal_notes,
    stripe: a.stripe
      ? {
          status: a.stripe.status,
          currentPeriodEnd: a.stripe.currentPeriodEnd,
          latestInvoiceStatus: a.stripe.latestInvoiceStatus,
          latestInvoiceHostedUrl: a.stripe.latestInvoiceHostedUrl,
          cancelAtPeriodEnd: a.stripe.cancelAtPeriodEnd,
        }
      : null,
  }));

  return (
    <div
      style={{
        maxWidth: 1400,
        margin: "0 auto",
        padding: "32px",
      }}
      className="pa-container"
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 28,
        }}
        className="pa-header"
      >
        <div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: -0.5,
              margin: 0,
            }}
          >
            Platform Overview
          </h1>
          <p style={{ color: "#6C7A83", fontSize: 13, marginTop: 4, margin: 0 }}>
            Salud del negocio SocialGo ·{" "}
            {new Date().toLocaleDateString("es-MX", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Health tiles */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
          marginBottom: 32,
        }}
        className="pa-tiles"
      >
        <Tile
          label="MRR"
          value={formatMXN(metrics.totalMRR)}
          delta={`${metrics.activeAgencies} agencias pagando`}
          deltaTone="flat"
        />
        <Tile
          label="Agencias"
          value={`${metrics.activeAgencies} / ${metrics.totalAgencies}`}
          delta="Activas / totales"
          deltaTone="flat"
        />
        <Tile
          label="New MRR este mes"
          value={formatMXN(metrics.newMRR)}
          delta="Agencias nuevas pagando"
          deltaTone={metrics.newMRR > 0 ? "up" : "flat"}
        />
        <Tile
          label="Churn rate"
          value={`${metrics.churnRate.toFixed(1)}%`}
          delta={
            metrics.churnRate > 5 ? "▲ Sobre threshold (5%)" : "Bajo control"
          }
          deltaTone={metrics.churnRate > 5 ? "down" : "up"}
          alert={metrics.churnRate > 5}
        />
        <Tile
          label="Clientes bajo gestión"
          value={metrics.totalClients.toString()}
          delta="Total en la plataforma"
          deltaTone="flat"
        />
        <Tile
          label="Posts creados (mes)"
          value={metrics.totalPostsThisMonth.toString()}
          delta="Este mes"
          deltaTone="flat"
        />
        <Tile
          label="Ingresos reales (Stripe)"
          value={formatMXN(metrics.realRevenueThisMonth)}
          delta={`${metrics.stripeLinkedCount} agencia${
            metrics.stripeLinkedCount === 1 ? "" : "s"
          } conectada${metrics.stripeLinkedCount === 1 ? "" : "s"}`}
          deltaTone={metrics.realRevenueThisMonth > 0 ? "up" : "flat"}
        />
        <Tile
          label="Facturas fallidas"
          value={metrics.failedInvoices.toString()}
          delta={
            metrics.failedInvoices > 0
              ? "Requieren atención"
              : "Todo al día"
          }
          deltaTone={metrics.failedInvoices > 0 ? "down" : "up"}
          alert={metrics.failedInvoices > 0}
        />
      </section>

      {/* MRR chart — last 6 months */}
      <MRRChart data={mrrSeries} />

      {/* Agency table (client component with search, filters, CSV export) */}
      <AgenciesTable
        agencies={tableRows}
        pastDueCount={metrics.pastDueAgencies}
      />

      <div
        style={{
          marginTop: 24,
          textAlign: "center",
          fontSize: 11,
          color: "#6C7A83",
          letterSpacing: 1,
        }}
      >
        SOCIALGO PLATFORM ADMIN · v1 READ-ONLY
      </div>

      <style>{`
        @media (max-width: 1100px) {
          .pa-tiles { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 700px) {
          .pa-container { padding: 16px 12px !important; }
          .pa-header h1 { font-size: 22px !important; }
          .pa-tiles { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
        }
        @media (max-width: 420px) {
          .pa-tiles { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

