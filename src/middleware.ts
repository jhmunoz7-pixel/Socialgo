/**
 * Next.js middleware for route protection
 * Handles authentication checks and redirects
 * Protects /dashboard and other private routes
 *
 * NOTE: Platform admin redirect to /platform is handled client-side in
 * DashboardLayout because getUser() is unreliable in Vercel Edge middleware
 * with @supabase/ssr@0.0.10.
 */

import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Define protected routes that require authentication
const PROTECTED_ROUTES = ["/dashboard", "/platform"];

// Define public routes that should not redirect authenticated users
const PUBLIC_AUTH_ROUTES = ["/auth/login", "/auth/signup", "/auth/reset-password"];

export async function middleware(request: NextRequest) {
  // Update Supabase session
  const { response } = await updateSession(request);

  const { pathname } = request.nextUrl;

  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  const isPublicAuthRoute = PUBLIC_AUTH_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // Check for Supabase auth cookie
  const hasSession = request.cookies.getAll().some(
    (cookie) => cookie.name.startsWith("sb-") && cookie.name.endsWith("-auth-token")
  );

  if (isProtectedRoute && !hasSession) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  if (isPublicAuthRoute && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/auth/:path*",
    "/api/:path*",
    "/platform/:path*",
  ],
};
