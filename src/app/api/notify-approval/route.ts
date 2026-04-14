/**
 * POST /api/notify-approval
 * Sends an email notification when a post's approval status changes.
 * Called from the frontend after updating the post.
 *
 * Body: { post_id, new_status, post_name?, client_name?, changed_by? }
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // 1. Verify caller is authenticated
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse body
    const { post_id, new_status, post_name, client_name, changed_by } = await request.json();
    if (!post_id || !new_status) {
      return NextResponse.json({ error: "post_id and new_status required" }, { status: 400 });
    }

    // 3. Get the post's org and assigned member
    const service = await createServiceRoleClient();

    const { data: post } = await service
      .from("posts")
      .select("org_id, client_id, assigned_to, name, copy")
      .eq("id", post_id)
      .single();

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // 4. Get org owner/admin emails to notify
    const { data: membersToNotify } = await service
      .from("members")
      .select("full_name, user_id, role")
      .eq("org_id", post.org_id)
      .in("role", ["owner", "admin"]);

    if (!membersToNotify || membersToNotify.length === 0) {
      return NextResponse.json({ ok: true, sent: 0 });
    }

    // Get emails from profiles
    const userIds = membersToNotify.map((m) => m.user_id);
    const { data: profiles } = await service
      .from("profiles")
      .select("id, email")
      .in("id", userIds);

    const emails = (profiles || [])
      .map((p) => p.email)
      .filter((e): e is string => !!e && e !== user.email); // Don't notify the person who made the change

    if (emails.length === 0) {
      return NextResponse.json({ ok: true, sent: 0 });
    }

    // 5. Send email via Resend
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      // No Resend key — skip silently
      return NextResponse.json({ ok: true, sent: 0, reason: "no_resend_key" });
    }

    const statusLabels: Record<string, string> = {
      approved: "Aprobado ✅",
      approved_with_changes: "Aprobado con cambios 📝",
      rejected: "Rechazado ❌",
      pending: "Pendiente 🕐",
      review_1_1: "Revisión 1:1 🤝",
    };

    const statusLabel = statusLabels[new_status] || new_status;
    const postTitle = post_name || post.name || post.copy?.slice(0, 50) || "Post sin título";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://socialgo-one.vercel.app";

    const resend = new Resend(resendKey);
    const fromAddress = process.env.RESEND_FROM ?? "SocialGo <onboarding@resend.dev>";

    const { error: sendError } = await resend.emails.send({
      from: fromAddress,
      to: emails,
      subject: `${statusLabel} — ${client_name || "Cliente"}: ${postTitle}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #2A1F1A; font-size: 18px; margin-bottom: 8px;">Cambio de estado de aprobación</h2>
          <p style="color: #7A6560; font-size: 14px; margin-bottom: 16px;">
            <strong>${changed_by || "Un miembro del equipo"}</strong> cambió el estado de un post.
          </p>
          <div style="background: #FFF8F3; border: 1px solid rgba(255,181,200,0.3); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
            <p style="margin: 0 0 8px; font-size: 12px; color: #7A6560; text-transform: uppercase; letter-spacing: 0.5px;">Post</p>
            <p style="margin: 0 0 4px; font-size: 16px; font-weight: 600; color: #2A1F1A;">${client_name || "Cliente"} — ${postTitle}</p>
            <p style="margin: 0; font-size: 14px; color: #2A1F1A;">Nuevo estado: <strong>${statusLabel}</strong></p>
          </div>
          <a href="${appUrl}/dashboard/contenido" style="display: inline-block; background: linear-gradient(135deg, #FFB5C8, #FF8FAD); color: white; text-decoration: none; padding: 10px 24px; border-radius: 10px; font-size: 14px; font-weight: 600;">
            Ver en SocialGo
          </a>
        </div>
      `,
    });

    if (sendError) {
      console.error("Resend error:", sendError);
      return NextResponse.json({ ok: false, error: sendError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, sent: emails.length });
  } catch (error) {
    console.error("Notify approval error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error sending notification" },
      { status: 500 }
    );
  }
}
