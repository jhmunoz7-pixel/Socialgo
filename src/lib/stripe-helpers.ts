/**
 * Stripe helper functions for common operations
 * Handles checkout sessions, customer portal, subscriptions, etc.
 */

import Stripe from "stripe";
import { getStripeServer } from "./stripe";

interface CreateCheckoutSessionParams {
  userId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  email?: string;
  customerId?: string;
}

/**
 * Create a Stripe checkout session for subscription or one-time payment
 */
export const createCheckoutSession = async ({
  userId,
  priceId,
  successUrl,
  cancelUrl,
  email,
  customerId,
}: CreateCheckoutSessionParams): Promise<string> => {
  const stripe = getStripeServer();

  try {
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription", // Change to 'payment' for one-time payments
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
      },
    };

    // Add customer email if provided
    if (email) {
      sessionParams.customer_email = email;
    }

    // Link to existing customer if customerId provided
    if (customerId) {
      sessionParams.customer = customerId;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    if (!session.url) {
      throw new Error("Failed to create checkout session URL");
    }

    return session.url;
  } catch (error) {
    console.error("Error creating checkout session:", error);
    throw error;
  }
};

interface CreatePortalSessionParams {
  customerId: string;
  returnUrl: string;
}

/**
 * Create a Stripe customer portal session for subscription management
 */
export const createPortalSession = async ({
  customerId,
  returnUrl,
}: CreatePortalSessionParams): Promise<string> => {
  const stripe = getStripeServer();

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    if (!session.url) {
      throw new Error("Failed to create portal session URL");
    }

    return session.url;
  } catch (error) {
    console.error("Error creating portal session:", error);
    throw error;
  }
};

/**
 * Get or create a Stripe customer
 */
export const getOrCreateCustomer = async (
  email: string,
  userId: string
): Promise<string> => {
  const stripe = getStripeServer();

  try {
    // Search for existing customer by email
    const customers = await stripe.customers.search({
      query: `email:"${email}"`,
      limit: 1,
    });

    if (customers.data.length > 0) {
      return customers.data[0].id;
    }

    // Create new customer if not found
    const customer = await stripe.customers.create({
      email,
      metadata: {
        userId,
      },
    });

    return customer.id;
  } catch (error) {
    console.error("Error getting or creating customer:", error);
    throw error;
  }
};

/**
 * Cancel a subscription
 */
export const cancelSubscription = async (
  subscriptionId: string
): Promise<void> => {
  const stripe = getStripeServer();

  try {
    await stripe.subscriptions.del(subscriptionId);
  } catch (error) {
    console.error("Error canceling subscription:", error);
    throw error;
  }
};

/**
 * Get subscription details
 */
export const getSubscriptionDetails = async (
  subscriptionId: string
): Promise<Stripe.Subscription | null> => {
  const stripe = getStripeServer();

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    console.error("Error retrieving subscription:", error);
    return null;
  }
};

/**
 * Get customer details
 */
export const getCustomerDetails = async (
  customerId: string
): Promise<Stripe.Customer | null> => {
  const stripe = getStripeServer();

  try {
    const customer = await stripe.customers.retrieve(customerId);
    return customer as Stripe.Customer;
  } catch (error) {
    console.error("Error retrieving customer:", error);
    return null;
  }
};

/**
 * Check if a customer has an active subscription
 */
export const hasActiveSubscription = async (
  customerId: string
): Promise<boolean> => {
  const stripe = getStripeServer();

  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    return subscriptions.data.length > 0;
  } catch (error) {
    console.error("Error checking subscription:", error);
    return false;
  }
};

/**
 * Get active subscriptions for a customer
 */
export const getActiveSubscriptions = async (
  customerId: string
): Promise<Stripe.Subscription[]> => {
  const stripe = getStripeServer();

  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
    });

    return subscriptions.data;
  } catch (error) {
    console.error("Error retrieving active subscriptions:", error);
    return [];
  }
};
