"use client";

/**
 * Platform Admin — Agencies Table (client).
 *
 * Receives pre-loaded agencies from the server component and provides:
 *   - text search (name, slug)
 *   - plan filter (free / pro / full_access / all)
 *   - status filter (trial / active / past_due / canceled / all)
 *   - CSV export of the currently filtered view
 *
 * All filtering is in-memory. No extra queries.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { SOCIALGO_PLANS, type PlanKey } from "@/lib/pricing-config";
import AgencyActionsModal, {
  type AgencyForModal,
} from "./AgencyActionsModal";

export type PlatformAgencyRow = {
  id: string;
  name: string;
  slug: string;
  plan: PlanKey;
  plan_status: string;
  mrr: number;
  clientsCount: number;
  postsThisMonth: number;
  created_at: string;
  trial_ends_at: string | null;
  internal_notes: string | null;
  stripe: {
    status: string;
    currentPeriodEnd: number | null;
    latestInvoiceStatus: string | null;
    latestInvoiceHostedUrl: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
};

type PlanFilter = "all" | PlanKey;
type StatusFilter = "all" | "trialing" | "active" | "past_due" | "canceled";

export default function AgenciesTable({
  agencies,
  pastDueCount,
}: {
  agencies: PlatformAgencyRow[];
  pastDueCount: number;
}) {
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState<PlanFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [activeAgency, setActiveAgency] = useState<AgencyForModal | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return agencies.filter((a) => {
      if (plan !== "all" && a.plan !== plan) return false;
      if (status !== "all" && a.plan_status !== status) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.slug.toLowerCase().includes(q)
      );
    });
  }, [agencies, search, plan, status]);

  const onExport = () => {
    const rows = [
      [
        "name",
        "slug",
        "plan",
        "status",
        "mrr_mxn",
        "stripe_status",
        "latest_invoice_status",
        "next_billing",
        "clients",
        "posts_this_month",
        "created_at",
        "trial_ends_at",
        "has_notes",
      ],
      ...filtered.map((a) => [
        a.name,
        a.slug,
        a.plan,
        a.plan_status,
        String(a.mrr),
        a.stripe?.status ?? "",
        a.stripe?.latestInvoiceStatus ?? "",
        a.stripe?.currentPeriodEnd
          ? new Date(a.stripe.currentPeriodEnd * 1000).toISOString()
          : "",
        String(a.clientsCount),
        String(a.postsThisMonth),
        a.created_at,
        a.trial_ends_at ?? "",
        a.internal_notes ? "yes" : "no",
      ]),
    ];
    const csv = rows
      .map((r) =>
        r
          .map((cell) => {
            const v = String(cell ?? "");
            return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
          })
          .join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `socialgo-agencies-${ts}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const activeFilters =
    (plan !== "all" ? 1 : 0) +
    (status !== "all" ? 1 : 0) +
    (search ? 1 : 0);

  return (
    <section
      style={{
        background: "#354654",
        border: "1px solid rgba(108,122,131,0.2)",
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      {/* Header row: title + filters + export */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 22px",
          borderBottom: "1px solid rgba(108,122,131,0.2)",
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 800, color: "#E5E5E3" }}>
          Agencias{" "}
          <span
            style={{ color: "#6C7A83", fontWeight: 600, fontSize: 13 }}
          >
            ({filtered.length}
            {filtered.length !== agencies.length
              ? ` de ${agencies.length}`
              : ""}
            )
          </span>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 8,
          }}
        >
          {pastDueCount > 0 && (
            <div
              style={{
                padding: "6px 12px",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                background: "rgba(255,200,87,0.1)",
                color: "#FFC857",
                border: "1px solid rgba(255,200,87,0.3)",
              }}
            >
              ⚠️ {pastDueCount} con pago atrasado
            </div>
          )}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o slug…"
            style={inputStyle()}
          />
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value as PlanFilter)}
            style={selectStyle()}
          >
            <option value="all">Todos los planes</option>
            {(Object.keys(SOCIALGO_PLANS) as PlanKey[]).map((p) => (
              <option key={p} value={p}>
                {SOCIALGO_PLANS[p].name}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            style={selectStyle()}
          >
            <option value="all">Todos los estados</option>
            <option value="trialing">Trial</option>
            <option value="active">Al día</option>
            <option value="past_due">Atrasado</option>
            <option value="canceled">Cancelado</option>
          </select>
          {activeFilters > 0 && (
            <button
              onClick={() => {
                setSearch("");
                setPlan("all");
                setStatus("all");
              }}
              style={buttonStyle("ghost")}
            >
              Limpiar
            </button>
          )}
          <button
            onClick={onExport}
            disabled={filtered.length === 0}
            style={buttonStyle("primary", filtered.length === 0)}
          >
            ⬇ Export CSV
          </button>
        </div>
      </div>

      <div
        style={{
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <table
          style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}
        >
          <thead>
            <tr>
              {[
                "Agencia",
                "Plan",
                "MRR",
                "Pago",
                "Próximo cobro",
                "# Clientes",
                "Posts (mes)",
                "Creada",
                "Status",
                "Acciones",
              ].map((h) => (
                <th key={h} style={thStyle()}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  style={{
                    padding: "48px 22px",
                    textAlign: "center",
                    color: "#6C7A83",
                    fontSize: 13,
                  }}
                >
                  {agencies.length === 0
                    ? "No hay agencias aún."
                    : "Ninguna agencia coincide con los filtros."}
                </td>
              </tr>
            )}
            {filtered.map((a) => {
              const statusColors = statusPillColor(a.plan_status);
              return (
                <tr key={a.id}>
                  <td style={cellStyle()}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 8,
                          background:
                            "linear-gradient(135deg, #8FD44C, #B4F965)",
                          color: "#0F1D27",
                          fontWeight: 800,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                        }}
                      >
                        {a.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <Link
                          href={`/platform/agencies/${a.id}`}
                          style={{
                            fontWeight: 700,
                            color: "#E5E5E3",
                            textDecoration: "none",
                          }}
                        >
                          {a.name}
                        </Link>
                        <div style={{ fontSize: 11, color: "#6C7A83" }}>
                          @{a.slug}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={cellStyle()}>
                    <span style={planBadgeStyle(a.plan)}>
                      {SOCIALGO_PLANS[a.plan]?.name ?? a.plan}
                    </span>
                  </td>
                  <td style={cellStyle("mono")}>
                    {a.mrr > 0 ? formatMXN(a.mrr) : "—"}
                  </td>
                  <td style={cellStyle()}>
                    <PaymentPill stripe={a.stripe} />
                  </td>
                  <td style={{ ...cellStyle("mono"), color: "#6C7A83" }}>
                    {a.stripe?.currentPeriodEnd
                      ? a.stripe.cancelAtPeriodEnd
                        ? `Termina ${formatDate(a.stripe.currentPeriodEnd)}`
                        : formatDate(a.stripe.currentPeriodEnd)
                      : "—"}
                  </td>
                  <td style={cellStyle("mono")}>{a.clientsCount}</td>
                  <td style={cellStyle("mono")}>{a.postsThisMonth}</td>
                  <td style={{ ...cellStyle(), color: "#6C7A83" }}>
                    {timeAgo(a.created_at)}
                  </td>
                  <td style={cellStyle()}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 11,
                        fontWeight: 700,
                        color: statusColors.fg,
                      }}
                    >
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: statusColors.dot,
                        }}
                      />
                      {statusColors.label}
                    </span>
                  </td>
                  <td style={cellStyle()}>
                    <button
                      onClick={() =>
                        setActiveAgency({
                          id: a.id,
                          name: a.name,
                          slug: a.slug,
                          plan: a.plan,
                          plan_status: a.plan_status,
                          trial_ends_at: a.trial_ends_at,
                          internal_notes: a.internal_notes,
                        })
                      }
                      style={rowActionBtn()}
                      title="Gestionar agencia"
                    >
                      ⚙ Gestionar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {activeAgency && (
        <AgencyActionsModal
          agency={activeAgency}
          onClose={() => setActiveAgency(null)}
        />
      )}
    </section>
  );
}

function rowActionBtn(): React.CSSProperties {
  return {
    background: "rgba(180,249,101,0.1)",
    color: "#B4F965",
    border: "1px solid rgba(180,249,101,0.3)",
    borderRadius: 6,
    padding: "5px 10px",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}

// ---------- style helpers ----------

function inputStyle(): React.CSSProperties {
  return {
    background: "rgba(15,29,39,0.5)",
    border: "1px solid rgba(108,122,131,0.3)",
    borderRadius: 8,
    padding: "7px 10px",
    fontSize: 12,
    color: "#E5E5E3",
    minWidth: 200,
    outline: "none",
  };
}

function selectStyle(): React.CSSProperties {
  return {
    background: "rgba(15,29,39,0.5)",
    border: "1px solid rgba(108,122,131,0.3)",
    borderRadius: 8,
    padding: "7px 10px",
    fontSize: 12,
    color: "#E5E5E3",
    cursor: "pointer",
    outline: "none",
  };
}

function buttonStyle(
  variant: "primary" | "ghost",
  disabled = false
): React.CSSProperties {
  if (variant === "primary") {
    return {
      background: disabled ? "rgba(180,249,101,0.2)" : "#B4F965",
      color: "#0F1D27",
      border: "none",
      borderRadius: 8,
      padding: "7px 12px",
      fontSize: 12,
      fontWeight: 800,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
    };
  }
  return {
    background: "transparent",
    color: "#6C7A83",
    border: "1px solid rgba(108,122,131,0.3)",
    borderRadius: 8,
    padding: "7px 10px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  };
}

function thStyle(): React.CSSProperties {
  return {
    textAlign: "left",
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#6C7A83",
    padding: "14px 22px",
    borderBottom: "1px solid rgba(108,122,131,0.2)",
    background: "rgba(15,29,39,0.4)",
  };
}

function cellStyle(variant?: "mono"): React.CSSProperties {
  return {
    padding: "16px 22px",
    fontSize: 13,
    borderBottom: "1px solid rgba(108,122,131,0.15)",
    color: "#E5E5E3",
    fontFamily:
      variant === "mono"
        ? "'JetBrains Mono', 'SF Mono', monospace"
        : undefined,
    fontVariantNumeric: variant === "mono" ? "tabular-nums" : undefined,
  };
}

function planBadgeStyle(plan: PlanKey): React.CSSProperties {
  const palettes: Record<PlanKey, { bg: string; fg: string; border: string }> = {
    free: {
      bg: "rgba(108,122,131,0.15)",
      fg: "#6C7A83",
      border: "rgba(108,122,131,0.3)",
    },
    pro: {
      bg: "rgba(143,212,76,0.15)",
      fg: "#B4F965",
      border: "rgba(143,212,76,0.3)",
    },
    full_access: {
      bg: "rgba(180,249,101,0.25)",
      fg: "#E5E5E3",
      border: "rgba(180,249,101,0.5)",
    },
  };
  const p = palettes[plan] ?? palettes.free;
  return {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 20,
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    background: p.bg,
    color: p.fg,
    border: `1px solid ${p.border}`,
  };
}

function statusPillColor(
  s: string
): { fg: string; dot: string; label: string } {
  switch (s) {
    case "active":
      return { fg: "#8FD44C", dot: "#8FD44C", label: "Al día" };
    case "trialing":
      return { fg: "#7DD3FC", dot: "#7DD3FC", label: "Trial" };
    case "past_due":
      return { fg: "#FFC857", dot: "#FFC857", label: "Atrasado" };
    case "canceled":
      return { fg: "#F87171", dot: "#F87171", label: "Cancelado" };
    default:
      return { fg: "#6C7A83", dot: "#6C7A83", label: s };
  }
}

function formatMXN(v: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(v);
}

function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
  });
}

function PaymentPill({
  stripe,
}: {
  stripe: PlatformAgencyRow["stripe"];
}) {
  if (!stripe) {
    return (
      <span style={{ color: "#6C7A83", fontSize: 11 }}>—</span>
    );
  }

  // Priority: subscription status > invoice status
  let label = "—";
  let fg = "#6C7A83";
  let bg = "rgba(108,122,131,0.15)";

  if (stripe.status === "active" && stripe.latestInvoiceStatus === "paid") {
    label = "Pagado";
    fg = "#8FD44C";
    bg = "rgba(143,212,76,0.15)";
  } else if (stripe.status === "trialing") {
    label = "Trial";
    fg = "#7DD3FC";
    bg = "rgba(125,211,252,0.15)";
  } else if (stripe.status === "past_due" || stripe.status === "unpaid") {
    label = "Atrasado";
    fg = "#FFC857";
    bg = "rgba(255,200,87,0.15)";
  } else if (
    stripe.status === "canceled" ||
    stripe.status === "incomplete_expired"
  ) {
    label = "Cancelado";
    fg = "#F87171";
    bg = "rgba(248,113,113,0.15)";
  } else if (stripe.latestInvoiceStatus === "open") {
    label = "Pendiente";
    fg = "#FFC857";
    bg = "rgba(255,200,87,0.15)";
  } else if (stripe.latestInvoiceStatus === "uncollectible") {
    label = "Fallido";
    fg = "#F87171";
    bg = "rgba(248,113,113,0.15)";
  } else if (stripe.status === "active") {
    label = "Activo";
    fg = "#8FD44C";
    bg = "rgba(143,212,76,0.15)";
  }

  const pill = (
    <span
      style={{
        display: "inline-block",
        padding: "3px 9px",
        borderRadius: 12,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: 0.5,
        textTransform: "uppercase",
        background: bg,
        color: fg,
        border: `1px solid ${bg.replace("0.15", "0.35")}`,
      }}
    >
      {label}
    </span>
  );

  if (stripe.latestInvoiceHostedUrl) {
    return (
      <a
        href={stripe.latestInvoiceHostedUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: "none" }}
        title="Ver última factura en Stripe"
      >
        {pill}
      </a>
    );
  }
  return pill;
}

function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  if (isNaN(d)) return iso;
  const diff = Date.now() - d;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "hace minutos";
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days}d`;
  const months = Math.floor(days / 30);
  return `hace ${months} mes${months > 1 ? "es" : ""}`;
}
