/**
 * Platform Admin — Impersonation API
 *
 * POST  /api/platform/impersonate  — Start impersonating an agency
 *   Body: { orgId: string }
 *   Creates a temporary member row (role: owner) for the admin in the target org.
 *   Sets a cookie `x-impersonate-org` so AuthContext loads the impersonated org.
 *
 * DELETE /api/platform/impersonate — Stop impersonating
 *   Removes the temporary member row and clears the cookie.
 *
 * Both endpoints are gated by checkPlatformAdmin().
 */

import { NextRequest, NextResponse } from "next/server";
import { checkPlatformAdmin } from "@/lib/platform-admin";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "x-impersonate-org";
const COOKIE_MAX_AGE = 28800; // 8 hours

export async function POST(request: NextRequest) {
  const admin = await checkPlatformAdmin();
  if (!admin.isAdmin || !admin.userId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: { orgId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const orgId = body.orgId;
  if (!orgId || typeof orgId !== "string") {
    return NextResponse.json({ error: "orgId is required" }, { status: 400 });
  }

  const supabase = await createServiceRoleClient();

  // Verify org exists
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("id", orgId)
    .single();

  if (orgError || !org) {
    return NextResponse.json({ error: "org_not_found" }, { status: 404 });
  }

  // Clean up any existing impersonation first
  const existingCookie = request.cookies.get(COOKIE_NAME)?.value;
  if (existingCookie && existingCookie !== orgId) {
    await supabase
      .from("members")
      .delete()
      .eq("org_id", existingCookie)
      .eq("user_id", admin.userId);
  }

  // Upsert member row for the admin in the target org
  const { error: upsertError } = await supabase
    .from("members")
    .upsert(
      {
        org_id: orgId,
        user_id: admin.userId,
        role: "owner",
        full_name: "Platform Admin",
      },
      { onConflict: "org_id,user_id" }
    );

  if (upsertError) {
    console.error("Impersonation upsert error:", upsertError);
    return NextResponse.json(
      { error: "Failed to start impersonation" },
      { status: 500 }
    );
  }

  // Audit log
  await supabase.from("platform_actions_log").insert({
    org_id: orgId,
    admin_email: admin.email,
    action_type: "impersonate_start",
    metadata: { org_name: org.name },
  });

  // Set cookie and respond
  const response = NextResponse.json({
    ok: true,
    orgId,
    orgName: org.name,
  });

  response.cookies.set(COOKIE_NAME, orgId, {
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: false, // Client JS needs to read this
  });

  return response;
}

export async function DELETE() {
  const admin = await checkPlatformAdmin();
  if (!admin.isAdmin || !admin.userId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = await createServiceRoleClient();

  // Read the cookie from the request
  // Note: In Next.js App Router, we can use cookies() from next/headers
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const impersonatedOrgId = cookieStore.get(COOKIE_NAME)?.value;

  if (!impersonatedOrgId) {
    return NextResponse.json({ ok: true, noop: true });
  }

  // Remove the temporary member row
  const { error: deleteError } = await supabase
    .from("members")
    .delete()
    .eq("org_id", impersonatedOrgId)
    .eq("user_id", admin.userId);

  if (deleteError) {
    console.error("Impersonation cleanup error:", deleteError);
  }

  // Audit log
  await supabase.from("platform_actions_log").insert({
    org_id: impersonatedOrgId,
    admin_email: admin.email,
    action_type: "impersonate_end",
    metadata: {},
  });

  // Clear cookie and respond
  const response = NextResponse.json({ ok: true });

  response.cookies.set(COOKIE_NAME, "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: false,
  });

  return response;
}
