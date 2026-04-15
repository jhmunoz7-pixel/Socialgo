import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createServiceRoleClient();
    const { data, error, count } = await supabase
      .from("organizations")
      .select("id, name, plan", { count: "exact" });

    return NextResponse.json({
      success: true,
      count,
      orgs: data,
      error: error ? { message: error.message, code: error.code } : null,
      envCheck: {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        urlPrefix: (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").slice(0, 30),
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        keyPrefix: (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").slice(0, 10),
        keyLength: (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").length,
      },
    });
  } catch (e) {
    return NextResponse.json({
      success: false,
      error: String(e),
    });
  }
}
