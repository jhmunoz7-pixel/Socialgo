/**
 * GET /api/platform/agencies/[id]/log
 * Returns the 20 most recent admin actions on this agency.
 */

import { NextResponse } from "next/server";
import { checkPlatformAdmin } from "@/lib/platform-admin";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orgId } = await params;

  const admin = await checkPlatformAdmin();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = await createServiceRoleClient();
  const { data, error } = await supabase
    .from("platform_actions_log")
    .select("id, admin_email, action_type, metadata, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json(
      { error: "log_fetch_failed", detail: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ entries: data ?? [] });
}
