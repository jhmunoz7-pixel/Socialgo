/**
 * Stripe client initialization and utilities
 * Handles both server-side and client-side Stripe operations
 */

import Stripe from "stripe";

// Server-side Stripe client - only initialize on the server
let stripeServer: Stripe | undefined;

export const getStripeServer = (): Stripe => {
  if (!stripeServer) {
    stripeServer = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
      apiVersion: "2023-10-16",
    });
  }
  return stripeServer;
};

/**
 * Get Stripe publishable key for client-side operations
 */
export const getStripePublishableKey = (): string => {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set");
  }
  return key;
};

/**
 * Verify that Stripe webhook secret is configured
 */
export const getStripeWebhookSecret = (): string => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  }
  return secret;
};
