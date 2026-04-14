/**
 * Returns whether the currently logged-in user is a Platform Admin.
 * Used by client-side components (DashboardLayout) to conditionally
 * render the admin link without leaking the admin allowlist.
 *
 * Response: { isAdmin: boolean }
 */

import { NextResponse } from "next/server";
import { checkPlatformAdmin } from "@/lib/platform-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const { isAdmin } = await checkPlatformAdmin();
  return NextResponse.json({ isAdmin });
}
