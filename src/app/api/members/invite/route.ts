/**
 * /api/members/invite
 *
 * Invite a new user to the current org. Uses Supabase Admin
 * `inviteUserByEmail` which sends a real invitation email and lets the
 * invitee set their OWN password — no more ugly temp-passwords.
 *
 * Flow:
 *   1. Caller (owner/admin) POSTs { email, full_name?, role, client_ids? }
 *   2. If the user already exists, we just attach them to this org.
 *   3. If not, we call admin.inviteUserByEmail with a redirect to /auth/set-password.
 *   4. Either way we create/update the members row and (for 'creative' role)
 *      seed the client_members assignments.
 *
 * Body: {
 *   email: string,
 *   full_name?: string,
 *   role: MemberRole,
 *   client_ids?: string[] // only used when role === 'creative'
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import type { MemberRole } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_ROLES: MemberRole[] = [
  "owner",
  "admin",
  "member",
  "creative",
  "client_viewer",
];

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const service = await createServiceRoleClient();

  // --- Auth caller ---
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 10 requests per 60 seconds per user
  const rl = rateLimit({ name: "member-invite", limit: 10, windowSeconds: 60 }, user.id);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  // Caller must be owner/admin of an org.
  const { data: callerMember } = await service
    .from("members")
    .select("id, org_id, role")
    .eq("user_id", user.id)
    .in("role", ["owner", "admin"])
    .maybeSingle();

  if (!callerMember) {
    return NextResponse.json(
      { error: "Only owners and admins can invite members" },
      { status: 403 }
    );
  }

  // --- Parse body ---
  const body = await request.json().catch(() => ({}));
  const email = String(body?.email ?? "")
    .trim()
    .toLowerCase();
  const fullName = body?.full_name
    ? String(body.full_name).trim()
    : null;
  const role = String(body?.role ?? "") as MemberRole;
  const clientIds: string[] = Array.isArray(body?.client_ids)
    ? body.client_ids.filter((v: unknown) => typeof v === "string")
    : [];

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  if (role === "owner") {
    return NextResponse.json(
      { error: "Cannot invite someone as owner" },
      { status: 400 }
    );
  }

  const orgId = callerMember.org_id;

  // --- Validate clients belong to this org (if creative role) ---
  if (role === "creative" && clientIds.length > 0) {
    const { data: validClients } = await service
      .from("clients")
      .select("id")
      .eq("org_id", orgId)
      .in("id", clientIds);
    const validSet = new Set((validClients ?? []).map((c) => c.id));
    const invalid = clientIds.filter((id) => !validSet.has(id));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `Clients not in this org: ${invalid.join(", ")}` },
        { status: 400 }
      );
    }
  }

  // --- Find or invite the user ---
  // Supabase doesn't expose a clean "getUserByEmail", so we use listUsers
  // filtered by email. For large user tables this is not ideal but fine
  // at current scale.
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // Check if user exists by email
  let targetUserId: string | null = null;
  let invitedNow = false;
  {
    let page = 1;
    const perPage = 50;
    let done = false;
    while (!done) {
      const { data: list } = await admin.auth.admin.listUsers({ page, perPage });
      if (!list?.users?.length) break;
      const match = list.users.find(
        (u) => (u.email ?? "").toLowerCase() === email
      );
      if (match) {
        targetUserId = match.id;
        done = true;
      } else if (list.users.length < perPage) {
        break;
      } else {
        page++;
      }
    }
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    new URL(request.url).origin;

  if (!targetUserId) {
    const { data: invited, error: inviteError } =
      await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${origin}/auth/callback?next=/auth/set-password`,
        data: { full_name: fullName },
      });

    if (inviteError || !invited?.user) {
      console.error("Failed to send invitation:", inviteError);
      return NextResponse.json(
        { error: "Error al enviar la invitación" },
        { status: 500 }
      );
    }
    targetUserId = invited.user.id;
    invitedNow = true;
  }

  // --- Upsert membership row ---
  // Existing row in ANY org → we update org/role. This matches the prior UX
  // where signUp auto-created a solo org for the invitee.
  const { data: existingMember } = await service
    .from("members")
    .select("id, org_id")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (existingMember) {
    if (existingMember.org_id === orgId) {
      // Already a member of this org — just update role/name
      const { error } = await service
        .from("members")
        .update({ role, full_name: fullName })
        .eq("id", existingMember.id);
      if (error) {
        console.error("Member invite DB error:", error);
        return NextResponse.json({ error: "Error al procesar la invitación" }, { status: 500 });
      }
    } else {
      // Move to this org (overwrites their previous auto-org).
      const { error } = await service
        .from("members")
        .update({ org_id: orgId, role, full_name: fullName })
        .eq("id", existingMember.id);
      if (error) {
        console.error("Member invite DB error:", error);
        return NextResponse.json({ error: "Error al procesar la invitación" }, { status: 500 });
      }
    }
  } else {
    const { error } = await service.from("members").insert({
      org_id: orgId,
      user_id: targetUserId,
      role,
      full_name: fullName,
    });
    if (error) {
      console.error("Member invite DB error:", error);
        return NextResponse.json({ error: "Error al procesar la invitación" }, { status: 500 });
    }
  }

  // --- Seed client assignments for creative role ---
  if (role === "creative") {
    // Replace set
    await service
      .from("client_members")
      .delete()
      .eq("user_id", targetUserId)
      .eq("org_id", orgId);

    if (clientIds.length > 0) {
      const rows = clientIds.map((client_id) => ({
        client_id,
        user_id: targetUserId!,
        org_id: orgId,
      }));
      const { error: insErr } = await service.from("client_members").insert(rows);
      if (insErr) {
        console.error("Failed to assign clients:", insErr);
        return NextResponse.json({ error: "Error al asignar clientes" }, { status: 500 });
      }
    }
  } else {
    // If role changed away from creative, clean up any stale assignments.
    await service
      .from("client_members")
      .delete()
      .eq("user_id", targetUserId)
      .eq("org_id", orgId);
  }

  return NextResponse.json({
    ok: true,
    user_id: targetUserId,
    invited: invitedNow,
  });
}
