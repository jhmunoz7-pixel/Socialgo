// Run: npx ts-node scripts/setup-stripe.ts
// Or: STRIPE_SECRET_KEY=sk_... npx tsx scripts/setup-stripe.ts

import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error('❌ Error: STRIPE_SECRET_KEY environment variable is not set');
  console.error('Usage: STRIPE_SECRET_KEY=sk_... npx tsx scripts/setup-stripe.ts');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

interface PriceConfig {
  lookup_key: string;
  unit_amount: number;
  currency: string;
  interval: 'month' | 'year';
  interval_count?: number;
  nickname: string;
}

const PRODUCTS_AND_PRICES = {
  pro: {
    name: 'SocialGo Pro',
    metadata: {
      product_line: 'socialgo',
      tier: 'pro',
      client_min: '2',
      client_max: '5',
    },
    prices: [
      {
        lookup_key: 'socialgo_pro_monthly',
        unit_amount: 110000, // $1,100 MXN
        currency: 'mxn',
        interval: 'month',
        nickname: 'Pro Monthly',
      },
      {
        lookup_key: 'socialgo_pro_quarterly',
        unit_amount: 270000, // $2,700 MXN
        currency: 'mxn',
        interval: 'month',
        interval_count: 3,
        nickname: 'Pro Quarterly',
      },
      {
        lookup_key: 'socialgo_pro_annual',
        unit_amount: 900000, // $9,000 MXN
        currency: 'mxn',
        interval: 'year',
        nickname: 'Pro Annual',
      },
    ] as PriceConfig[],
  },
  full_access: {
    name: 'SocialGo Full Access',
    metadata: {
      product_line: 'socialgo',
      tier: 'full_access',
      client_min: '6',
      client_max: '20',
    },
    prices: [
      {
        lookup_key: 'socialgo_full_monthly',
        unit_amount: 230000, // $2,300 MXN
        currency: 'mxn',
        interval: 'month',
        nickname: 'Full Access Monthly',
      },
      {
        lookup_key: 'socialgo_full_quarterly',
        unit_amount: 570000, // $5,700 MXN
        currency: 'mxn',
        interval: 'month',
        interval_count: 3,
        nickname: 'Full Access Quarterly',
      },
      {
        lookup_key: 'socialgo_full_annual',
        unit_amount: 1800000, // $18,000 MXN
        currency: 'mxn',
        interval: 'year',
        nickname: 'Full Access Annual',
      },
    ] as PriceConfig[],
  },
};

async function checkExistingProducts(): Promise<boolean> {
  console.log('🔍 Checking for existing SocialGo products...');
  const products = await stripe.products.list({
    limit: 100,
  });

  const existingProducts = products.data.filter((p) =>
    p.name.includes('SocialGo')
  );

  if (existingProducts.length > 0) {
    console.log(`⚠️  Found ${existingProducts.length} existing SocialGo product(s):`);
    existingProducts.forEach((p) => {
      console.log(`   - ${p.name} (${p.id})`);
    });
    return true;
  }

  return false;
}

async function setupStripeProducts(): Promise<void> {
  console.log('🚀 Starting SocialGo Stripe setup...\n');

  // Check for existing products
  const exists = await checkExistingProducts();
  if (exists) {
    console.log(
      '\n⚠️  Products already exist. Skipping creation to avoid duplicates.'
    );
    console.log('   To create new products, manually delete the existing ones in Stripe Dashboard.\n');
    return;
  }

  console.log('📦 Creating SocialGo products and prices...\n');

  const createdIds: Record<string, Record<string, string>> = {};

  for (const [tierKey, tierData] of Object.entries(PRODUCTS_AND_PRICES)) {
    console.log(`\n📝 Creating "${tierData.name}"...`);

    // Create product
    const product = await stripe.products.create({
      name: tierData.name,
      metadata: tierData.metadata,
      type: 'service',
    });

    console.log(`   ✓ Product created: ${product.id}`);
    createdIds[tierKey] = {};

    // Create prices for this product
    for (const priceConfig of tierData.prices) {
      const priceData: Stripe.PriceCreateParams = {
        product: product.id,
        unit_amount: priceConfig.unit_amount,
        currency: priceConfig.currency,
        recurring: {
          interval: priceConfig.interval,
          ...(priceConfig.interval_count && {
            interval_count: priceConfig.interval_count,
          }),
        },
        lookup_key: priceConfig.lookup_key,
        nickname: priceConfig.nickname,
      };

      const price = await stripe.prices.create(priceData);
      createdIds[tierKey][priceConfig.lookup_key] = price.id;

      console.log(
        `   ✓ Price created: ${priceConfig.nickname} (${price.id})`
      );
    }
  }

  // Output summary
  console.log('\n' + '='.repeat(70));
  console.log('✅ Setup Complete!\n');
  console.log('Copy the following environment variables to your .env.local file:\n');

  console.log('# SocialGo Stripe Price IDs');
  console.log('STRIPE_PRICE_PRO_MONTHLY=' + createdIds.pro.socialgo_pro_monthly);
  console.log('STRIPE_PRICE_PRO_QUARTERLY=' + createdIds.pro.socialgo_pro_quarterly);
  console.log('STRIPE_PRICE_PRO_ANNUAL=' + createdIds.pro.socialgo_pro_annual);
  console.log(
    'STRIPE_PRICE_FULL_MONTHLY=' + createdIds.full_access.socialgo_full_monthly
  );
  console.log(
    'STRIPE_PRICE_FULL_QUARTERLY=' +
      createdIds.full_access.socialgo_full_quarterly
  );
  console.log(
    'STRIPE_PRICE_FULL_ANNUAL=' + createdIds.full_access.socialgo_full_annual
  );
  console.log('\n' + '='.repeat(70));
  console.log(
    '\nAlso create these products in your Supabase database or config files.'
  );
  console.log('Product IDs:');
  console.log('  SocialGo Pro: ' + (await getProductId('SocialGo Pro')));
  console.log(
    '  SocialGo Full Access: ' + (await getProductId('SocialGo Full Access'))
  );
}

async function getProductId(productName: string): Promise<string> {
  const products = await stripe.products.list({ limit: 1 });
  const product = products.data.find((p) => p.name === productName);
  return product?.id || 'NOT_FOUND';
}

// Run the setup
setupStripeProducts().catch((error) => {
  console.error('❌ Error during setup:', error.message);
  process.exit(1);
});
