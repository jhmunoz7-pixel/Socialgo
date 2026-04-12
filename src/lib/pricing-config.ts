export const SOCIALGO_PLANS = {
  free: {
    name: 'Free',
    description: 'Para freelancers',
    clientMin: 1,
    clientMax: 1,
    prices: { monthly: 0, quarterly: 0, annual: 0 },
    currency: 'MXN',
    features: [
      '1 cliente',
      'Parrilla de contenido',
      'AI Score básico (3/mes)',
      'Calendario',
      '100MB assets',
    ],
    stripePriceIds: { monthly: null, quarterly: null, annual: null },
  },
  pro: {
    name: 'Pro',
    description: 'Para agencias en crecimiento',
    clientMin: 2,
    clientMax: 5,
    prices: { monthly: 1100, quarterly: 900, annual: 750 }, // per month display price
    currency: 'MXN',
    features: [
      'Hasta 5 clientes',
      'Parrilla ilimitada',
      'AI Score ilimitado',
      'Calendario + Assets 5GB',
      'Reportes por cliente',
      'Soporte por email',
    ],
    isPopular: true,
    stripePriceIds: {
      monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
      quarterly: process.env.STRIPE_PRICE_PRO_QUARTERLY || '',
      annual: process.env.STRIPE_PRICE_PRO_ANNUAL || '',
    },
  },
  full_access: {
    name: 'Full Access',
    description: 'Para agencias establecidas',
    clientMin: 6,
    clientMax: 20,
    prices: { monthly: 2300, quarterly: 1900, annual: 1500 },
    currency: 'MXN',
    features: [
      'Hasta 20 clientes',
      'Todo en Pro +',
      'Assets 25GB',
      'AI Studio completo',
      'Reportes avanzados',
      'Soporte prioritario',
      'Acceso anticipado a nuevas funciones',
    ],
    stripePriceIds: {
      monthly: process.env.STRIPE_PRICE_FULL_MONTHLY || '',
      quarterly: process.env.STRIPE_PRICE_FULL_QUARTERLY || '',
      annual: process.env.STRIPE_PRICE_FULL_ANNUAL || '',
    },
  },
} as const;

export type PlanKey = keyof typeof SOCIALGO_PLANS;
export type BillingCycle = 'monthly' | 'quarterly' | 'annual';

/**
 * Get the Stripe price ID for a specific plan and billing cycle
 */
export function getPriceId(
  plan: PlanKey,
  cycle: BillingCycle
): string | null {
  const planConfig = SOCIALGO_PLANS[plan];

  if (!planConfig) {
    console.warn(`Plan "${plan}" not found`);
    return null;
  }

  const priceId = planConfig.stripePriceIds?.[cycle];

  if (!priceId) {
    console.warn(
      `No Stripe price ID found for plan "${plan}" and cycle "${cycle}"`
    );
    return null;
  }

  return priceId;
}

/**
 * Format a price amount as Mexican Pesos
 * @param amount Amount in centavos (e.g., 110000 = $1,100 MXN)
 * @returns Formatted price string (e.g., "$1,100 MXN")
 */
export function formatPrice(amount: number): string {
  if (amount === 0) {
    return 'Gratis';
  }

  // Convert from centavos to pesos
  const pesos = amount / 100;

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(pesos);
}

/**
 * Format monthly equivalent price for display
 * Useful for showing quarterly/annual prices as "per month"
 */
export function formatMonthlyEquivalent(
  totalAmount: number,
  months: number
): string {
  const monthlyAmount = totalAmount / months;
  return formatPrice(monthlyAmount * 100);
}

/**
 * Get all billing cycles and prices for a plan
 */
export function getPlanPricing(plan: PlanKey) {
  const planConfig = SOCIALGO_PLANS[plan];

  if (!planConfig) {
    return null;
  }

  const { prices } = planConfig;

  return {
    monthly: {
      amount: prices.monthly * 100, // Convert to centavos
      formatted: formatPrice(prices.monthly * 100),
      stripePriceId: getPriceId(plan, 'monthly'),
    },
    quarterly: {
      amount: prices.quarterly * 100 * 3, // Total for 3 months
      formatted: formatPrice(prices.quarterly * 100 * 3),
      monthlyEquivalent: formatMonthlyEquivalent(prices.quarterly * 100 * 3, 3),
      stripePriceId: getPriceId(plan, 'quarterly'),
    },
    annual: {
      amount: prices.annual * 100 * 12, // Total for 12 months
      formatted: formatPrice(prices.annual * 100 * 12),
      monthlyEquivalent: formatMonthlyEquivalent(prices.annual * 100 * 12, 12),
      stripePriceId: getPriceId(plan, 'annual'),
    },
  };
}
