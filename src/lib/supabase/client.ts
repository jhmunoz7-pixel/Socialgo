/**
 * Supabase client for browser-side operations
 * Used for client-side authentication and data fetching
 */

import { createBrowserClient } from "@supabase/ssr";

export const createClient = () => {
  // Note: These keys are safe to be public (anon key is restricted at DB level)
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};
