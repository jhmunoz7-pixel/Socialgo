/**
 * Supabase server-side client
 * Used for server components and API routes with proper cookie handling
 *
 * NOTE: pinned to @supabase/ssr@0.0.10 which uses get/set/remove (NOT getAll/setAll).
 * If you upgrade @supabase/ssr, switch to the newer API.
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export const createServerSupabaseClient = async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set(name, value, options);
          } catch {
            // Cookies may not be settable here (e.g. Server Component).
            // Middleware refreshes the session, so silently ignore.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set(name, "", { ...options, maxAge: 0 });
          } catch {
            // same as above
          }
        },
      },
    }
  );
};

/**
 * Create a Supabase service role client for admin operations
 * IMPORTANT: Only use this on the server side with proper auth checks
 */
export const createServiceRoleClient = async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set(name, value, options);
          } catch {}
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set(name, "", { ...options, maxAge: 0 });
          } catch {}
        },
      },
    }
  );
};
