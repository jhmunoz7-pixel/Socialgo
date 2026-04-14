"use client";

/**
 * Platform Admin — per-agency actions modal.
 *
 * Lets Jorge:
 *   - Change plan (free / pro / full_access)
 *   - Change status (trialing / active / past_due / canceled)
 *   - Extend trial (+N days; anchors to existing trial_ends_at if future)
 *   - Update internal notes
 *
 * Every mutation hits /api/platform/agencies/[id]/action with audit log.
 * Recent log entries are fetched from /api/platform/agencies/[id]/log.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SOCIALGO_PLANS, type PlanKey } from "@/lib/pricing-config";

type Status = "trialing" | "active" | "past_due" | "canceled";

export type AgencyForModal = {
  id: string;
  name: string;
  slug: string;
  plan: PlanKey;
  plan_status: string;
  trial_ends_at: string | null;
  internal_notes: string | null;
};

type LogEntry = {
  id: string;
  admin_email: string;
  action_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export default function AgencyActionsModal({
  agency,
  onClose,
}: {
  agency: AgencyForModal;
  onClose: () => void;
}) {
  const router = useRouter();

  const [plan, setPlan] = useState<PlanKey>(agency.plan);
  const [status, setStatus] = useState<Status>(agency.plan_status as Status);
  const [trialDays, setTrialDays] = useState(7);
  const [notes, setNotes] = useState(agency.internal_notes ?? "");

  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(
    null
  );

  const [log, setLog] = useState<LogEntry[]>([]);
  const [logLoading, setLogLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/platform/agencies/${agency.id}/log`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { entries: [] }))
      .then((d) => {
        if (!cancelled) {
          setLog(d.entries ?? []);
          setLogLoading(false);
        }
      })
      .catch(() => !cancelled && setLogLoading(false));
    return () => {
      cancelled = true;
    };
  }, [agency.id]);

  const flash = (kind: "ok" | "err", msg: string) => {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const doAction = async (
    label: string,
    body: Record<string, unknown>,
    refreshLog = true
  ) => {
    setBusy(label);
    try {
      const res = await fetch(`/api/platform/agencies/${agency.id}/action`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        flash("err", data.error ?? "Error desconocido");
        return;
      }
      if (data.noop) {
        flash("ok", "Sin cambios (valor idéntico).");
      } else {
        flash("ok", `${label} guardado.`);
        // Refresh server data so the table reflects the change
        router.refresh();
      }
      if (refreshLog) {
        const lr = await fetch(`/api/platform/agencies/${agency.id}/log`, {
          cache: "no-store",
        });
        if (lr.ok) setLog((await lr.json()).entries ?? []);
      }
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "Error de red");
    } finally {
      setBusy(null);
    }
  };

  const trialEndsLabel = agency.trial_ends_at
    ? new Date(agency.trial_ends_at).toLocaleDateString("es-MX", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "sin trial activo";

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,29,39,0.75)",
        backdropFilter: "blur(4px)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#354654",
          borderRadius: 14,
          maxWidth: 720,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          border: "1px solid rgba(108,122,131,0.3)",
          color: "#E5E5E3",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 22px",
            borderBottom: "1px solid rgba(108,122,131,0.2)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            background: "#354654",
            zIndex: 1,
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{agency.name}</div>
            <div style={{ fontSize: 12, color: "#6C7A83" }}>
              @{agency.slug} · trial termina: {trialEndsLabel}
            </div>
          </div>
          <button onClick={onClose} style={closeBtnStyle()}>
            ✕
          </button>
        </div>

        {toast && (
          <div
            style={{
              margin: "12px 22px 0",
              padding: "8px 12px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              background:
                toast.kind === "ok"
                  ? "rgba(180,249,101,0.15)"
                  : "rgba(248,113,113,0.15)",
              color: toast.kind === "ok" ? "#B4F965" : "#F87171",
              border: `1px solid ${
                toast.kind === "ok"
                  ? "rgba(180,249,101,0.3)"
                  : "rgba(248,113,113,0.3)"
              }`,
            }}
          >
            {toast.msg}
          </div>
        )}

        <div style={{ padding: "18px 22px", display: "grid", gap: 18 }}>
          {/* Plan */}
          <Section title="Plan">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value as PlanKey)}
                style={selectStyle()}
              >
                {(Object.keys(SOCIALGO_PLANS) as PlanKey[]).map((p) => (
                  <option key={p} value={p}>
                    {SOCIALGO_PLANS[p].name}
                  </option>
                ))}
              </select>
              <button
                disabled={busy !== null || plan === agency.plan}
                onClick={() =>
                  doAction("Plan", { type: "change_plan", payload: { plan } })
                }
                style={primaryBtn(busy !== null || plan === agency.plan)}
              >
                {busy === "Plan" ? "Guardando…" : "Guardar plan"}
              </button>
            </div>
          </Section>

          {/* Status */}
          <Section title="Estado">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
                style={selectStyle()}
              >
                <option value="trialing">Trial</option>
                <option value="active">Al día</option>
                <option value="past_due">Atrasado</option>
                <option value="canceled">Cancelado</option>
              </select>
              <button
                disabled={busy !== null || status === agency.plan_status}
                onClick={() =>
                  doAction("Estado", {
                    type: "change_status",
                    payload: { status },
                  })
                }
                style={primaryBtn(
                  busy !== null || status === agency.plan_status
                )}
              >
                {busy === "Estado" ? "Guardando…" : "Guardar estado"}
              </button>
            </div>
          </Section>

          {/* Extend trial */}
          <Section title="Extender trial">
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <input
                type="number"
                min={1}
                max={365}
                value={trialDays}
                onChange={(e) => setTrialDays(Number(e.target.value))}
                style={{ ...selectStyle(), width: 80 }}
              />
              <span style={{ fontSize: 12, color: "#6C7A83" }}>días</span>
              <button
                disabled={busy !== null || trialDays < 1 || trialDays > 365}
                onClick={() =>
                  doAction("Trial", {
                    type: "extend_trial",
                    payload: { days: trialDays },
                  })
                }
                style={primaryBtn(
                  busy !== null || trialDays < 1 || trialDays > 365
                )}
              >
                {busy === "Trial" ? "Extendiendo…" : `Extender +${trialDays}d`}
              </button>
            </div>
            <div style={{ fontSize: 11, color: "#6C7A83", marginTop: 6 }}>
              Si ya tiene trial futuro, se suma sobre esa fecha. Si está
              canceled/past_due, también se reactiva a trialing.
            </div>
          </Section>

          {/* Notes */}
          <Section title="Notas internas">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Contexto, pagos especiales, cortesías, incidentes…"
              style={{
                ...selectStyle(),
                width: "100%",
                minHeight: 90,
                fontFamily: "inherit",
                resize: "vertical",
              }}
            />
            <button
              disabled={busy !== null || notes === (agency.internal_notes ?? "")}
              onClick={() =>
                doAction("Notas", {
                  type: "update_notes",
                  payload: { notes },
                })
              }
              style={{
                ...primaryBtn(
                  busy !== null || notes === (agency.internal_notes ?? "")
                ),
                marginTop: 8,
              }}
            >
              {busy === "Notas" ? "Guardando…" : "Guardar notas"}
            </button>
          </Section>

          {/* Audit log */}
          <Section title="Historial (últimas 20)">
            {logLoading && (
              <div style={{ fontSize: 12, color: "#6C7A83" }}>Cargando…</div>
            )}
            {!logLoading && log.length === 0 && (
              <div style={{ fontSize: 12, color: "#6C7A83" }}>
                Sin acciones registradas.
              </div>
            )}
            {!logLoading && log.length > 0 && (
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
                    </div>
                    <div
                      style={{ color: "#6C7A83", fontSize: 11, whiteSpace: "nowrap" }}
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
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          color: "#6C7A83",
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
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

function selectStyle(): React.CSSProperties {
  return {
    background: "rgba(15,29,39,0.5)",
    border: "1px solid rgba(108,122,131,0.3)",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 13,
    color: "#E5E5E3",
    outline: "none",
  };
}

function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    background: disabled ? "rgba(180,249,101,0.2)" : "#B4F965",
    color: "#0F1D27",
    border: "none",
    borderRadius: 8,
    padding: "8px 14px",
    fontSize: 12,
    fontWeight: 800,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
  };
}

function closeBtnStyle(): React.CSSProperties {
  return {
    background: "transparent",
    border: "1px solid rgba(108,122,131,0.3)",
    borderRadius: 8,
    width: 32,
    height: 32,
    color: "#E5E5E3",
    cursor: "pointer",
    fontSize: 14,
  };
}
