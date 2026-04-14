/**
 * Platform Admin helpers
 *
 * The Platform Admin is the OWNER OF SOCIALGO (Jorge), not an agency owner.
 * Access is gated by the PLATFORM_ADMIN_EMAILS environment variable
 * (comma-separated list of emails).
 *
 * This is intentionally env-based (not a DB role) so that platform admins
 * cannot be elevated through a compromised Supabase row.
 */

import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Work around a bug in @supabase/ssr 0.0.10 that fails to parse the session
 * cookie in server components. We extract the access_token from the cookie JSON
 * and call the Supabase Auth REST API directly.
 */
async function getUserViaAccessToken(): Promise<{
  email: string | null;
  id: string | null;
} | null> {
  try {
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) return null;

    const sb = cookieStore
      .getAll()
      .find(
        (c) =>
          c.name.startsWith("sb-") &&
          c.name.endsWith("-auth-token") &&
          !c.name.includes(".")
      );
    if (!sb?.value) return null;

    // Cookie is either URL-encoded JSON or a raw JSON string with a possible
    // "base64-" prefix. Try to decode to a plain JSON object.
    let raw = sb.value;
    try {
      raw = decodeURIComponent(raw);
    } catch {
      /* not URL-encoded */
    }
    if (raw.startsWith("base64-")) {
      raw = Buffer.from(raw.slice(7), "base64").toString("utf8");
    }
    const session = JSON.parse(raw);
    const accessToken: string | undefined = session?.access_token;
    if (!accessToken) return null;

    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const user = await res.json();
    return { email: user?.email ?? null, id: user?.id ?? null };
  } catch {
    return null;
  }
}

/**
 * Parse PLATFORM_ADMIN_EMAILS env var into a normalized Set.
 * Returns lowercase, trimmed emails.
 */
function getPlatformAdminEmails(): Set<string> {
  const raw = process.env.PLATFORM_ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

/**
 * Check if the given email is a platform admin.
 * Case-insensitive, whitespace-tolerant.
 */
export function isPlatformAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getPlatformAdminEmails().has(email.trim().toLowerCase());
}

/**
 * Server-side check: is the current logged-in user a platform admin?
 * Returns { isAdmin, email, userId } or { isAdmin: false, ... }.
 *
 * Use this in /platform/* server components and API routes.
 */
export async function checkPlatformAdmin(): Promise<{
  isAdmin: boolean;
  email: string | null;
  userId: string | null;
}> {
  // Primary path — use Supabase SSR client if it works.
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return {
      isAdmin: isPlatformAdminEmail(user.email),
      email: user.email ?? null,
      userId: user.id,
    };
  }

  // Fallback — old @supabase/ssr 0.0.10 sometimes fails to parse cookies.
  const manual = await getUserViaAccessToken();
  if (!manual) return { isAdmin: false, email: null, userId: null };

  return {
    isAdmin: isPlatformAdminEmail(manual.email),
    email: manual.email,
    userId: manual.id,
  };
}
