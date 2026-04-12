/**
 * Stripe checkout session API endpoint
 * Creates a checkout session for subscription purchases
 * POST /api/stripe/checkout
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createCheckoutSession,
  getOrCreateCustomer,
} from "@/lib/stripe-helpers";

interface CheckoutRequest {
  priceId: string;
}

export async function POST(request: NextRequest) {
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

    // Parse request body
    const { priceId } = (await request.json()) as CheckoutRequest;

    if (!priceId) {
      return NextResponse.json(
        { error: "Price ID is required" },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    const customerId = await getOrCreateCustomer(user.email || "", user.id);

    // Get the app URL from environment
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      throw new Error("NEXT_PUBLIC_APP_URL is not set");
    }

    // Create checkout session
    const checkoutUrl = await createCheckoutSession({
      userId: user.id,
      priceId,
      email: user.email,
      customerId,
      successUrl: `${appUrl}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appUrl}/pricing?canceled=true`,
    });

    return NextResponse.json({
      success: true,
      url: checkoutUrl,
    });
  } catch (error) {
    console.error("Checkout session error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to create checkout session";

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
