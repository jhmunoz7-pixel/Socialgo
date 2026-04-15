/**
 * /api/members/resend-invite
 *
 * Resend the invitation email to a member who hasn't set their password yet.
 * Looks up the user's email via their user_id and calls inviteUserByEmail again.
 *
 * Body: { member_id: string }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const { member_id } = body;

    if (!member_id) {
      return NextResponse.json(
        { error: "member_id es requerido" },
        { status: 400 }
      );
    }

    const admin = await createServiceRoleClient();

    // Verify caller is owner/admin of the org
    const { data: callerMember } = await admin
      .from("members")
      .select("org_id, role")
      .eq("user_id", user.id)
      .single();

    if (
      !callerMember ||
      !["owner", "admin"].includes(callerMember.role)
    ) {
      return NextResponse.json(
        { error: "No tienes permiso para reenviar invitaciones" },
        { status: 403 }
      );
    }

    // Get the target member
    const { data: targetMember } = await admin
      .from("members")
      .select("user_id, full_name, org_id")
      .eq("id", member_id)
      .eq("org_id", callerMember.org_id)
      .single();

    if (!targetMember) {
      return NextResponse.json(
        { error: "Miembro no encontrado" },
        { status: 404 }
      );
    }

    // Get the user's email from auth
    const { data: authUser, error: authError } =
      await admin.auth.admin.getUserById(targetMember.user_id);

    if (authError || !authUser?.user?.email) {
      return NextResponse.json(
        { error: "No se pudo obtener el email del usuario" },
        { status: 500 }
      );
    }

    const email = authUser.user.email;
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://socialgo-one.vercel.app";

    // Resend the invitation
    const { error: inviteError } =
      await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${appUrl}/auth/callback?next=/auth/set-password`,
        data: {
          full_name: targetMember.full_name,
          invited_org_id: callerMember.org_id,
        },
      });

    if (inviteError) {
      console.error("Resend invite error:", inviteError);
      return NextResponse.json(
        { error: inviteError.message || "Error al reenviar invitación" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, email });
  } catch (err) {
    console.error("Resend invite unexpected error:", err);
    return NextResponse.json(
      { error: "Error inesperado" },
      { status: 500 }
    );
  }
}
