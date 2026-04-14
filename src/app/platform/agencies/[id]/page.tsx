/**
 * Platform Admin — Agency drill-down page.
 *
 * Server component. Loads everything Jorge needs to triage a specific
 * agency: org details, clients, recent posts, members, audit log.
 *
 * Access is gated by the parent /platform layout (PLATFORM_ADMIN_EMAILS).
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { SOCIALGO_PLANS } from "@/lib/pricing-config";
import AgencyDetailActions from "./AgencyDetailActions";

type PlanKey = keyof typeof SOCIALGO_PLANS;

export const dynamic = "force-dynamic";

type Organization = {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  timezone: string | null;
  plan: PlanKey;
  plan_status: "trialing" | "active" | "past_due" | "canceled";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  billing_cycle: string | null;
  client_limit: number | null;
  trial_ends_at: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
};

type ClientRow = {
  id: string;
  name: string;
  emoji: string | null;
  contact_email: string | null;
  account_status: string | null;
  pay_status: string | null;
  custom_price: number | null;
  created_at: string;
};

type PostRow = {
  id: string;
  client_id: string;
  name: string | null;
  status: string;
  scheduled_date: string | null;
  created_at: string;
};

type MemberRow = {
  id: string;
  user_id: string;
  role: string;
  full_name: string | null;
  created_at: string;
};

type LogEntry = {
  id: string;
  admin_email: string;
  action_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export default async function AgencyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const supabase = await createServiceRoleClient();

  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  const [orgRes, clientsRes, postsRes, membersRes, logRes] = await Promise.all([
    supabase.from("organizations").select("*").eq("id", id).single(),
    supabase
      .from("clients")
      .select(
        "id, name, emoji, contact_email, account_status, pay_status, custom_price, created_at"
      )
      .eq("org_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("posts")
      .select("id, client_id, name, status, scheduled_date, created_at")
      .eq("org_id", id)
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("members")
      .select("id, user_id, role, full_name, created_at")
      .eq("org_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("platform_actions_log")
      .select("id, admin_email, action_type, metadata, created_at")
      .eq("org_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (orgRes.error || !orgRes.data) {
    notFound();
  }

  const org = orgRes.data as Organization;
  const clients = (clientsRes.data ?? []) as ClientRow[];
  const posts = (postsRes.data ?? []) as PostRow[];
  const members = (membersRes.data ?? []) as MemberRow[];
  const log = (logRes.data ?? []) as LogEntry[];

  const postsByStatus = posts.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {});

  const clientNameById = new Map(clients.map((c) => [c.id, c.name]));

  const trialEndsLabel = org.trial_ends_at
    ? new Date(org.trial_ends_at).toLocaleDateString("es-MX", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

  const statusColors = statusPillColor(org.plan_status);

  return (
    <div
      style={{ maxWidth: 1400, margin: "0 auto", padding: "32px" }}
      className="pa-container"
    >
      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: "#6C7A83", marginBottom: 14 }}>
        <Link
          href="/platform"
          style={{ color: "#B4F965", textDecoration: "none" }}
        >
          ← Platform
        </Link>
        <span style={{ margin: "0 8px" }}>/</span>
        <span>Agencies</span>
        <span style={{ margin: "0 8px" }}>/</span>
        <span style={{ color: "#E5E5E3" }}>{org.name}</span>
      </div>

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: -0.5,
              margin: 0,
              color: "#E5E5E3",
            }}
          >
            {org.name}
          </h1>
          <div
            style={{
              fontSize: 13,
              color: "#6C7A83",
              marginTop: 4,
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <span>@{org.slug}</span>
            {org.email && <span>· {org.email}</span>}
            {org.website && <span>· {org.website}</span>}
            <span>
              · creada{" "}
              {new Date(org.created_at).toLocaleDateString("es-MX", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span style={planBadgeStyle(org.plan)}>
            {SOCIALGO_PLANS[org.plan]?.name ?? org.plan}
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 700,
              color: statusColors.fg,
              padding: "4px 10px",
              background: "rgba(15,29,39,0.4)",
              border: `1px solid ${statusColors.fg}40`,
              borderRadius: 20,
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
        </div>
      </div>

      {/* Tiles */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 24,
        }}
        className="pa-tiles"
      >
        <Tile label="Clientes" value={clients.length.toString()} />
        <Tile label="Posts (30d)" value={posts.length.toString()} />
        <Tile label="Members" value={members.length.toString()} />
        <Tile label="Trial termina" value={trialEndsLabel} small />
      </section>

      {/* Posts by status */}
      {posts.length > 0 && (
        <section style={sectionStyle()}>
          <h2 style={h2Style()}>Posts por status (últimos 30 días)</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {Object.entries(postsByStatus).map(([s, n]) => (
              <span
                key={s}
                style={{
                  padding: "6px 12px",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  background: "rgba(15,29,39,0.4)",
                  border: "1px solid rgba(108,122,131,0.3)",
                  color: "#E5E5E3",
                }}
              >
                {s}: <span style={{ color: "#B4F965" }}>{n}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Actions (plan, status, trial, notes) */}
      <AgencyDetailActions
        agency={{
          id: org.id,
          name: org.name,
          slug: org.slug,
          plan: org.plan,
          plan_status: org.plan_status,
          trial_ends_at: org.trial_ends_at,
          internal_notes: org.internal_notes,
        }}
      />

      {/* Clients */}
      <section style={sectionStyle()}>
        <h2 style={h2Style()}>Clientes ({clients.length})</h2>
        {clients.length === 0 ? (
          <div style={emptyStyle()}>Sin clientes todavía.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 720,
              }}
            >
              <thead>
                <tr>
                  {["Cliente", "Contacto", "Status", "Pago", "Precio", "Alta"].map(
                    (h) => (
                      <th key={h} style={thStyle()}>
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td style={cellStyle()}>
                      <span style={{ marginRight: 8 }}>{c.emoji ?? "🎯"}</span>
                      {c.name}
                    </td>
                    <td style={{ ...cellStyle(), color: "#6C7A83" }}>
                      {c.contact_email ?? "—"}
                    </td>
                    <td style={cellStyle()}>
                      <span style={smallPill(c.account_status ?? "")}>
                        {c.account_status ?? "—"}
                      </span>
                    </td>
                    <td style={cellStyle()}>
                      <span style={payPill(c.pay_status ?? "")}>
                        {c.pay_status ?? "—"}
                      </span>
                    </td>
                    <td style={{ ...cellStyle(), fontFamily: "monospace" }}>
                      {c.custom_price != null
                        ? formatMXN(c.custom_price)
                        : "—"}
                    </td>
                    <td style={{ ...cellStyle(), color: "#6C7A83" }}>
                      {timeAgo(c.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent posts */}
      <section style={sectionStyle()}>
        <h2 style={h2Style()}>Posts recientes (últimos 20)</h2>
        {posts.length === 0 ? (
          <div style={emptyStyle()}>Sin posts en los últimos 30 días.</div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {posts.slice(0, 20).map((p) => (
              <div
                key={p.id}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "rgba(15,29,39,0.4)",
                  border: "1px solid rgba(108,122,131,0.15)",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  fontSize: 12,
                }}
              >
                <div>
                  <div style={{ color: "#E5E5E3", fontWeight: 600 }}>
                    {p.name ?? "(sin título)"}
                  </div>
                  <div style={{ color: "#6C7A83", fontSize: 11, marginTop: 2 }}>
                    {clientNameById.get(p.client_id) ?? "cliente?"} · {p.status}
                    {p.scheduled_date ? ` · agendado ${p.scheduled_date}` : ""}
                  </div>
                </div>
                <div
                  style={{
                    color: "#6C7A83",
                    fontSize: 11,
                    whiteSpace: "nowrap",
                  }}
                >
                  {timeAgo(p.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Members */}
      <section style={sectionStyle()}>
        <h2 style={h2Style()}>Members ({members.length})</h2>
        {members.length === 0 ? (
          <div style={emptyStyle()}>Sin members.</div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {members.map((m) => (
              <div
                key={m.id}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "rgba(15,29,39,0.4)",
                  border: "1px solid rgba(108,122,131,0.15)",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  fontSize: 12,
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ color: "#E5E5E3", fontWeight: 600 }}>
                    {m.full_name ?? "—"}
                  </div>
                  <div style={{ color: "#6C7A83", fontSize: 11, marginTop: 2 }}>
                    {m.user_id.slice(0, 8)}… ·{" "}
                    <span style={rolePill(m.role)}>{m.role}</span>
                  </div>
                </div>
                <div
                  style={{
                    color: "#6C7A83",
                    fontSize: 11,
                    whiteSpace: "nowrap",
                  }}
                >
                  {timeAgo(m.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Audit log */}
      <section style={sectionStyle()}>
        <h2 style={h2Style()}>Historial admin (últimas 20)</h2>
        {log.length === 0 ? (
          <div style={emptyStyle()}>Sin acciones registradas.</div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {log.map((e) => (
              <div
                key={e.id}
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: "rgba(15,29,39,0.4)",
                  border: "1px solid rgba(108,122,131,0.15)",
                  fontSize: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <span
                    style={{
                      fontWeight: 700,
                      color: "#B4F965",
                      marginRight: 6,
                    }}
                  >
                    {actionLabel(e.action_type)}
                  </span>
                  <span style={{ color: "#E5E5E3" }}>
                    {describeMetadata(e.action_type, e.metadata)}
                  </span>
                  <span style={{ color: "#6C7A83", marginLeft: 8 }}>
                    por {e.admin_email}
                  </span>
                </div>
                <div
                  style={{
                    color: "#6C7A83",
                    fontSize: 11,
                    whiteSpace: "nowrap",
                  }}
                >
                  {new Date(e.created_at).toLocaleString("es-MX", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div
        style={{
          marginTop: 24,
          textAlign: "center",
          fontSize: 11,
          color: "#6C7A83",
          letterSpacing: 1,
        }}
      >
        SOCIALGO PLATFORM ADMIN · AGENCY DRILL-DOWN
      </div>

      <style>{`
        @media (max-width: 900px) {
          .pa-tiles { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 500px) {
          .pa-tiles { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

// ===== Subcomponents =====

function Tile({
  label,
  value,
  small,
}: {
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div
      style={{
        background: "#354654",
        border: "1px solid rgba(108,122,131,0.2)",
        borderRadius: 12,
        padding: "16px 18px",
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
          fontSize: small ? 16 : 24,
          fontWeight: 800,
          letterSpacing: -0.5,
          color: "#E5E5E3",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ===== Style helpers =====

function sectionStyle(): React.CSSProperties {
  return {
    background: "#354654",
    border: "1px solid rgba(108,122,131,0.2)",
    borderRadius: 14,
    padding: "18px 22px",
    marginBottom: 16,
  };
}

function h2Style(): React.CSSProperties {
  return {
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#6C7A83",
    margin: "0 0 12px 0",
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
    padding: "10px 12px",
    borderBottom: "1px solid rgba(108,122,131,0.2)",
  };
}

function cellStyle(): React.CSSProperties {
  return {
    padding: "12px",
    fontSize: 13,
    borderBottom: "1px solid rgba(108,122,131,0.15)",
    color: "#E5E5E3",
  };
}

function emptyStyle(): React.CSSProperties {
  return { fontSize: 12, color: "#6C7A83" };
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

function smallPill(v: string): React.CSSProperties {
  const colors: Record<string, { bg: string; fg: string }> = {
    activo: { bg: "rgba(143,212,76,0.15)", fg: "#B4F965" },
    on_track: { bg: "rgba(143,212,76,0.15)", fg: "#B4F965" },
    pago_pendiente: { bg: "rgba(255,200,87,0.15)", fg: "#FFC857" },
    onboarding: { bg: "rgba(125,211,252,0.15)", fg: "#7DD3FC" },
    pausado: { bg: "rgba(108,122,131,0.15)", fg: "#6C7A83" },
  };
  const c = colors[v] ?? { bg: "rgba(108,122,131,0.15)", fg: "#6C7A83" };
  return {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 12,
    fontSize: 10,
    fontWeight: 700,
    background: c.bg,
    color: c.fg,
  };
}

function payPill(v: string): React.CSSProperties {
  const colors: Record<string, { bg: string; fg: string }> = {
    pagado: { bg: "rgba(143,212,76,0.15)", fg: "#B4F965" },
    pendiente: { bg: "rgba(255,200,87,0.15)", fg: "#FFC857" },
    vencido: { bg: "rgba(248,113,113,0.15)", fg: "#F87171" },
  };
  const c = colors[v] ?? { bg: "rgba(108,122,131,0.15)", fg: "#6C7A83" };
  return {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 12,
    fontSize: 10,
    fontWeight: 700,
    background: c.bg,
    color: c.fg,
  };
}

function rolePill(_r: string): React.CSSProperties {
  return {
    display: "inline-block",
    padding: "1px 6px",
    borderRadius: 8,
    fontSize: 10,
    fontWeight: 700,
    background: "rgba(180,249,101,0.15)",
    color: "#B4F965",
  };
}

function formatMXN(v: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(v);
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

function actionLabel(t: string): string {
  switch (t) {
    case "change_plan":
      return "Plan";
    case "change_status":
      return "Estado";
    case "extend_trial":
      return "Trial";
    case "update_notes":
      return "Notas";
    default:
      return t;
  }
}

function describeMetadata(
  t: string,
  m: Record<string, unknown>
): string {
  if (t === "change_plan" || t === "change_status") {
    return `${m.from ?? "?"} → ${m.to ?? "?"}`;
  }
  if (t === "extend_trial") {
    return `+${m.days ?? "?"}d`;
  }
  if (t === "update_notes") {
    return `${m.length_before ?? 0} → ${m.length_after ?? 0} chars`;
  }
  return "";
}
