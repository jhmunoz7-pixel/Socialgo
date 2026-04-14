/**
 * Invite member API route
 * Adds an existing user to the org, or sends a magic-link invite to a new user.
 * Uses service role so the admin's own session is never affected.
 *
 * POST /api/invite-member
 * Body: { email, full_name?, role }
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // 1. Verify the caller is authenticated
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Verify the caller is owner or admin of their org
    const { data: callerMember } = await supabase
      .from("members")
      .select("org_id, role")
      .eq("user_id", user.id)
      .single();

    if (!callerMember || !["owner", "admin"].includes(callerMember.role)) {
      return NextResponse.json({ error: "Forbidden — only owners/admins can invite" }, { status: 403 });
    }

    const orgId = callerMember.org_id;

    // 3. Parse body
    const { email, full_name, role } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const validRoles = ["admin", "member", "creative", "client_viewer"];
    const memberRole = validRoles.includes(role) ? role : "member";

    const normalizedEmail = email.trim().toLowerCase();

    // 4. Use service role for privileged operations
    const serviceClient = await createServiceRoleClient();

    // 5. Check if user already exists in auth.users (via profiles table)
    const { data: existingProfile } = await serviceClient
      .from("profiles")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingProfile) {
      // Check if already a member of this org
      const { data: existingMember } = await serviceClient
        .from("members")
        .select("id")
        .eq("org_id", orgId)
        .eq("user_id", existingProfile.id)
        .maybeSingle();

      if (existingMember) {
        return NextResponse.json(
          { error: "Este usuario ya es miembro de tu organización." },
          { status: 409 }
        );
      }

      // Add existing user to this org
      const { error: insertError } = await serviceClient
        .from("members")
        .insert({
          org_id: orgId,
          user_id: existingProfile.id,
          role: memberRole,
          full_name: full_name?.trim() || null,
        });

      if (insertError) throw insertError;

      return NextResponse.json({
        success: true,
        message: `${normalizedEmail} agregado como ${memberRole}.`,
        method: "existing_user",
      });
    }

    // 6. User doesn't exist — invite via magic link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const { error: inviteError } =
      await serviceClient.auth.admin.inviteUserByEmail(normalizedEmail, {
        redirectTo: `${appUrl}/auth/callback`,
        data: {
          full_name: full_name?.trim() || null,
          invited_org_id: orgId,
          invited_role: memberRole,
        },
      });

    if (inviteError) throw inviteError;

    // The updated handle_new_user trigger (migration 008) checks for
    // invited_org_id/invited_role in user metadata and skips auto-org
    // creation, adding the user to the correct org instead.
    // No manual cleanup needed here.

    return NextResponse.json({
      success: true,
      message: `Invitación enviada a ${normalizedEmail}.`,
      method: "invite",
    });
  } catch (error) {
    console.error("Invite member error:", error);
    const message = error instanceof Error ? error.message : "Error al invitar miembro";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
