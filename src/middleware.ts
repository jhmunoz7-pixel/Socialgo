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

export async function middleware(request: NextRequest) {
  // Update Supabase session
  let response = await updateSession(request);

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
      // No session, redirect to login
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }

  // If user is authenticated and tries to access auth pages, redirect to dashboard
  if (isPublicAuthRoute) {
    if (hasSession) {
      // User is authenticated, redirect to dashboard
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Protected routes
    "/dashboard/:path*",
    // Auth routes
    "/auth/:path*",
    // API routes
    "/api/:path*",
    // Platform admin (Jorge's god mode). Auth and admin check live in the
    // /platform layout — middleware runs here only to refresh the Supabase
    // session cookies so the layout gets a fresh user.
    "/platform/:path*",
  ],
};
