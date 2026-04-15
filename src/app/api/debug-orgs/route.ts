import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Test 1: Using createServiceRoleClient (SSR client with cookies)
    const ssrClient = await createServiceRoleClient();
    const ssrResult = await ssrClient
      .from("organizations")
      .select("id, name", { count: "exact" });

    // Test 2: Using createClient directly (no cookies, pure service role)
    const directClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    const directResult = await directClient
      .from("organizations")
      .select("id, name", { count: "exact" });

    return NextResponse.json({
      ssrClient: {
        count: ssrResult.count,
        orgs: ssrResult.data,
        error: ssrResult.error?.message ?? null,
      },
      directClient: {
        count: directResult.count,
        orgs: directResult.data,
        error: directResult.error?.message ?? null,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) });
  }
}
