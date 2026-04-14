/**
 * OAuth callback route
 * Handles the redirect from OAuth providers (Google, GitHub, etc.)
 * This route processes the auth code and redirects to the dashboard
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  // const state = requestUrl.searchParams.get("state"); // reserved for future OAuth state validation

  if (code) {
    try {
      const supabase = await createServerSupabaseClient();

      // Exchange the code for a session
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("Auth callback error:", error);
        return NextResponse.redirect(
          new URL("/auth/login?error=callback_error", request.url)
        );
      }

      // Get the user to ensure session is valid
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.redirect(
          new URL("/auth/login?error=no_user", request.url)
        );
      }

      // The handle_new_user() DB trigger already creates profile + org + member
      // for new users. We only need to upsert the profile for OAuth users
      // whose metadata (name, avatar) may have changed since last login.
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || null,
            avatar_url: user.user_metadata?.avatar_url || null,
          },
          { onConflict: "id" }
        );

      if (profileError) {
        console.error("Failed to upsert user profile:", profileError);
      }

      // Redirect to dashboard
      return NextResponse.redirect(new URL("/dashboard", request.url));
    } catch (error) {
      console.error("Unexpected error in auth callback:", error);
      return NextResponse.redirect(
        new URL("/auth/login?error=unexpected", request.url)
      );
    }
  }

  // Missing code parameter
  return NextResponse.redirect(new URL("/auth/login?error=no_code", request.url));
}
