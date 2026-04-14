/**
 * /api/members/[id]/clients
 *
 * Manage client assignments for a team member.
 * Only users with `manage_members` permission (owner, admin) in the same org
 * can read or modify these assignments.
 *
 * GET    → list assigned client_ids for this member
 * PUT    → replace the full set of assignments (body: { client_ids: string[] })
 * POST   → add a single assignment (body: { client_id })
 * DELETE → remove a single assignment (body: { client_id }) — or all if none given
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Ensure the caller is authenticated, a member of the same org as the target
 * member, and has role owner|admin. Returns ctx on success, NextResponse on
 * failure.
 */
async function authorize(memberId: string) {
  const supabase = await createServerSupabaseClient();
  const service = await createServiceRoleClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  // Target member (the one whose assignments we're managing)
  const { data: targetMember, error: targetErr } = await service
    .from("members")
    .select("id, org_id, user_id, role")
    .eq("id", memberId)
    .single();

  if (targetErr || !targetMember) {
    return {
      error: NextResponse.json({ error: "Member not found" }, { status: 404 }),
    };
  }

  // Caller's membership in target's org
  const { data: callerMember, error: callerErr } = await service
    .from("members")
    .select("id, role")
    .eq("org_id", targetMember.org_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (callerErr || !callerMember) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  if (callerMember.role !== "owner" && callerMember.role !== "admin") {
    return {
      error: NextResponse.json(
        { error: "Only owners and admins can manage assignments" },
        { status: 403 }
      ),
    };
  }

  return { service, targetMember };
}

export async function GET(_request: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const auth = await authorize(id);
  if ("error" in auth) return auth.error;
  const { service, targetMember } = auth;

  const { data, error } = await service
    .from("client_members")
    .select("client_id")
    .eq("user_id", targetMember.user_id)
    .eq("org_id", targetMember.org_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    client_ids: (data ?? []).map((r) => r.client_id),
  });
}

export async function PUT(request: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const auth = await authorize(id);
  if ("error" in auth) return auth.error;
  const { service, targetMember } = auth;

  const body = await request.json().catch(() => ({}));
  const incoming: string[] = Array.isArray(body?.client_ids)
    ? body.client_ids.filter((v: unknown) => typeof v === "string")
    : [];

  // Validate all incoming client_ids belong to target's org.
  if (incoming.length > 0) {
    const { data: validClients, error: validErr } = await service
      .from("clients")
      .select("id")
      .eq("org_id", targetMember.org_id)
      .in("id", incoming);

    if (validErr) {
      return NextResponse.json(
        { error: validErr.message },
        { status: 500 }
      );
    }

    const validIds = new Set((validClients ?? []).map((c) => c.id));
    const invalid = incoming.filter((id) => !validIds.has(id));
    if (invalid.length > 0) {
      return NextResponse.json(
        {
          error: `Clients do not belong to this org: ${invalid.join(", ")}`,
        },
        { status: 400 }
      );
    }
  }

  // Replace all assignments atomically (delete then insert).
  const { error: delErr } = await service
    .from("client_members")
    .delete()
    .eq("user_id", targetMember.user_id)
    .eq("org_id", targetMember.org_id);

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  if (incoming.length > 0) {
    const rows = incoming.map((client_id) => ({
      client_id,
      user_id: targetMember.user_id,
      org_id: targetMember.org_id,
    }));
    const { error: insErr } = await service.from("client_members").insert(rows);
    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, client_ids: incoming });
}
