/**
 * Next.js middleware for route protection
 * Handles authentication checks and redirects
 * Protects /dashboard and other private routes
 */

import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Define protected routes that require authentication
const PROTECTED_ROUTES = ["/dashboard", "/platform"];

// Define public routes that should not redirect authenticated users
const PUBLIC_AUTH_ROUTES = ["/auth/login", "/auth/signup", "/auth/reset-password"];

/**
 * Check if the given email is a platform admin.
 * Reads PLATFORM_ADMIN_EMAILS env var (comma-separated, case-insensitive).
 */
function isPlatformAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const raw = process.env.PLATFORM_ADMIN_EMAILS ?? "";
  const adminEmails = new Set(
    raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
  );
  return adminEmails.has(email.trim().toLowerCase());
}

export async function middleware(request: NextRequest) {
  // Update Supabase session and get authenticated user
  const { response, user } = await updateSession(request);

  const { pathname } = request.nextUrl;

  // Check if route is protected
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // Check if route is a public auth route
  const isPublicAuthRoute = PUBLIC_AUTH_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // Check for Supabase auth cookie (format: sb-{project-ref}-auth-token)
  const hasSession = request.cookies.getAll().some(
    (cookie) => cookie.name.startsWith("sb-") && cookie.name.endsWith("-auth-token")
  );

  // If it's a protected route, verify authentication
  if (isProtectedRoute) {
    if (!hasSession) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }

  // If user is authenticated and tries to access auth pages, redirect
  if (isPublicAuthRoute && hasSession) {
    // Platform admin goes to /platform, everyone else to /dashboard
    const isImpersonating = request.cookies.get("x-impersonate-org")?.value;
    if (isPlatformAdminEmail(user?.email) && !isImpersonating) {
      return NextResponse.redirect(new URL("/platform", request.url));
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Platform admin auto-redirect: if admin lands on /dashboard (exact) without
  // impersonation, send them to /platform
  if (pathname === "/dashboard" && hasSession && !request.cookies.get("x-impersonate-org")?.value) {
    if (isPlatformAdminEmail(user?.email)) {
      return NextResponse.redirect(new URL("/platform", request.url));
    }
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
