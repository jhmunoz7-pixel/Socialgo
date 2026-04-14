/**
 * Stripe customer portal API endpoint
 * Creates a session to access Stripe's hosted billing portal
 * Allows users to manage subscriptions, payment methods, invoices, etc.
 * POST /api/stripe/portal
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createPortalSession, getOrCreateCustomer } from "@/lib/stripe-helpers";

export async function POST(_request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get or create Stripe customer
    const customerId = await getOrCreateCustomer(user.email || "", user.id);

    // Get the app URL from environment
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      throw new Error("NEXT_PUBLIC_APP_URL is not set");
    }

    // Create portal session
    const portalUrl = await createPortalSession({
      customerId,
      returnUrl: `${appUrl}/dashboard/billing`,
    });

    return NextResponse.json({
      success: true,
      url: portalUrl,
    });
  } catch (error) {
    console.error("Portal session error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to create portal session";

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
