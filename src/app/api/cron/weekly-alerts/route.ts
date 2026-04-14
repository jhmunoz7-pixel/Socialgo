/**
 * Platform Admin — Weekly Alerts Cron
 *
 * Runs every Monday 09:00 CDMX (14:00 UTC) via Vercel Cron.
 * Surfaces accounts needing Jorge's attention:
 *   - past_due older than 7 days  (high churn risk)
 *   - trials ending in the next 3 days
 *   - new signups in the last 7 days
 *   - churned accounts in the last 7 days (plan_status='canceled')
 *
 * Gated by `Authorization: Bearer ${CRON_SECRET}` — Vercel Cron sends this
 * header automatically when the env var is set.
 *
 * Emails go to every address in PLATFORM_ADMIN_EMAILS (comma-separated).
 */

import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Org = {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  plan: string;
  plan_status: string;
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
};

function fmt(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysFromNow(d: string | null): number | null {
  if (!d) return null;
  const diff = new Date(d).getTime() - Date.now();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function renderHtml(params: {
  pastDue: Org[];
  trialsEnding: Org[];
  newSignups: Org[];
  churned: Org[];
  appUrl: string;
}): string {
  const { pastDue, trialsEnding, newSignups, churned, appUrl } = params;

  const section = (title: string, rows: Org[], empty: string, renderRow: (o: Org) => string) => `
    <tr><td style="padding:24px 24px 8px;color:#B4F965;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;border-top:1px solid #1f2e38;">${title} · ${rows.length}</td></tr>
    ${rows.length === 0
      ? `<tr><td style="padding:0 24px 16px;color:#6C7A83;font-size:13px;">${empty}</td></tr>`
      : rows.map((o) => `<tr><td style="padding:8px 24px;">${renderRow(o)}</td></tr>`).join("")}
  `;

  const row = (o: Org, extra: string) => `
    <a href="${appUrl}/platform/agencies/${o.id}" style="display:block;padding:12px 14px;background:#15242f;border:1px solid #1f2e38;border-radius:10px;color:#E5E5E3;text-decoration:none;font-size:13px;">
      <div style="font-weight:700;">${o.name} <span style="color:#6C7A83;font-weight:400;font-size:11px;">@${o.slug}</span></div>
      <div style="color:#9CA7B0;font-size:12px;margin-top:4px;">${extra}</div>
    </a>
  `;

  return `<!doctype html><html><body style="margin:0;background:#0F1D27;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0F1D27;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#0F1D27;border:1px solid #1f2e38;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:32px 24px 8px;">
          <div style="color:#B4F965;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">SocialGo · Platform Admin</div>
          <div style="color:#E5E5E3;font-size:22px;font-weight:700;margin-top:8px;">Weekly Agency Pulse</div>
          <div style="color:#6C7A83;font-size:12px;margin-top:4px;">${new Date().toLocaleDateString("es-MX",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
        </td></tr>
        <tr><td style="padding:16px 24px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding:8px;background:#15242f;border:1px solid #1f2e38;border-radius:10px;text-align:center;">
                <div style="color:#6C7A83;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;">Past due</div>
                <div style="color:#E5E5E3;font-size:24px;font-weight:700;margin-top:4px;">${pastDue.length}</div>
              </td>
              <td width="8"></td>
              <td style="padding:8px;background:#15242f;border:1px solid #1f2e38;border-radius:10px;text-align:center;">
                <div style="color:#6C7A83;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;">Trials ending</div>
                <div style="color:#E5E5E3;font-size:24px;font-weight:700;margin-top:4px;">${trialsEnding.length}</div>
              </td>
              <td width="8"></td>
              <td style="padding:8px;background:#15242f;border:1px solid #1f2e38;border-radius:10px;text-align:center;">
                <div style="color:#6C7A83;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;">New</div>
                <div style="color:#E5E5E3;font-size:24px;font-weight:700;margin-top:4px;">${newSignups.length}</div>
              </td>
              <td width="8"></td>
              <td style="padding:8px;background:#15242f;border:1px solid #1f2e38;border-radius:10px;text-align:center;">
                <div style="color:#6C7A83;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;">Churn</div>
                <div style="color:#E5E5E3;font-size:24px;font-weight:700;margin-top:4px;">${churned.length}</div>
              </td>
            </tr>
          </table>
        </td></tr>
        ${section("Past due >7d", pastDue, "Ninguna cuenta en past_due 🎉", (o) =>
          row(o, `Past due desde ${fmt(o.updated_at)} · ${o.email ?? "sin email"}`)
        )}
        ${section("Trials terminando en 3d", trialsEnding, "Ningún trial por terminar esta semana.", (o) => {
          const days = daysFromNow(o.trial_ends_at);
          return row(o, `${days !== null && days <= 0 ? "Vencido" : `En ${days}d`} · termina ${fmt(o.trial_ends_at)} · ${o.email ?? "sin email"}`);
        })}
        ${section("Nuevos signups (7d)", newSignups, "Ningún signup esta semana.", (o) =>
          row(o, `${o.plan.toUpperCase()} · ${o.plan_status} · ${fmt(o.created_at)}`)
        )}
        ${section("Churn (7d)", churned, "Sin churn esta semana 🎉", (o) =>
          row(o, `Canceló ${fmt(o.updated_at)} · era ${o.plan.toUpperCase()}`)
        )}
        <tr><td style="padding:24px;border-top:1px solid #1f2e38;">
          <a href="${appUrl}/platform" style="display:inline-block;padding:12px 20px;background:#B4F965;color:#0F1D27;text-decoration:none;border-radius:8px;font-weight:700;font-size:13px;">Abrir Platform Admin →</a>
        </td></tr>
        <tr><td style="padding:16px 24px 24px;color:#6C7A83;font-size:11px;">Generado por SocialGo · Loonshot Labs</td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

export async function GET(request: Request) {
  // Gate: must come from Vercel Cron (or an authorized manual trigger)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY not configured" },
      { status: 500 }
    );
  }

  const adminEmails = (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  if (adminEmails.length === 0) {
    return NextResponse.json(
      { error: "PLATFORM_ADMIN_EMAILS empty" },
      { status: 500 }
    );
  }

  const supabase = await createServiceRoleClient();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const nowIso = now.toISOString();

  const cols =
    "id, name, slug, email, plan, plan_status, trial_ends_at, created_at, updated_at";

  const [pastDueRes, trialsRes, newSignupsRes, churnedRes] = await Promise.all([
    supabase
      .from("organizations")
      .select(cols)
      .eq("plan_status", "past_due")
      .lt("updated_at", sevenDaysAgo)
      .order("updated_at", { ascending: true }),
    supabase
      .from("organizations")
      .select(cols)
      .eq("plan_status", "trialing")
      .gte("trial_ends_at", nowIso)
      .lte("trial_ends_at", threeDaysFromNow)
      .order("trial_ends_at", { ascending: true }),
    supabase
      .from("organizations")
      .select(cols)
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false }),
    supabase
      .from("organizations")
      .select(cols)
      .eq("plan_status", "canceled")
      .gte("updated_at", sevenDaysAgo)
      .order("updated_at", { ascending: false }),
  ]);

  const pastDue = (pastDueRes.data ?? []) as Org[];
  const trialsEnding = (trialsRes.data ?? []) as Org[];
  const newSignups = (newSignupsRes.data ?? []) as Org[];
  const churned = (churnedRes.data ?? []) as Org[];

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://socialgo-one.vercel.app";
  const html = renderHtml({ pastDue, trialsEnding, newSignups, churned, appUrl });

  const totalSignal = pastDue.length + trialsEnding.length + churned.length;
  const subject = totalSignal > 0
    ? `📊 SocialGo Pulse · ${pastDue.length} past-due · ${trialsEnding.length} trials · ${churned.length} churn`
    : `📊 SocialGo Pulse · todo tranquilo esta semana`;

  const fromAddress = process.env.RESEND_FROM ?? "SocialGo <onboarding@resend.dev>";

  const resend = new Resend(resendKey);
  const { data: sent, error: sendError } = await resend.emails.send({
    from: fromAddress,
    to: adminEmails,
    subject,
    html,
  });

  if (sendError) {
    return NextResponse.json(
      { ok: false, error: sendError.message, counts: { pastDue: pastDue.length, trialsEnding: trialsEnding.length, newSignups: newSignups.length, churned: churned.length } },
      { status: 500 }
    );
  }

  // Audit log — one entry per run
  await supabase.from("platform_actions_log").insert({
    admin_email: "cron@socialgo.app",
    action_type: "weekly_alert_sent",
    metadata: {
      email_id: sent?.id ?? null,
      recipients: adminEmails,
      counts: {
        past_due: pastDue.length,
        trials_ending: trialsEnding.length,
        new_signups: newSignups.length,
        churned: churned.length,
      },
    },
  });

  return NextResponse.json({
    ok: true,
    email_id: sent?.id ?? null,
    counts: {
      past_due: pastDue.length,
      trials_ending: trialsEnding.length,
      new_signups: newSignups.length,
      churned: churned.length,
    },
  });
}
