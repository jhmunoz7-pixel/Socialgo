# SocialGo — Setup Guide

## Prerequisites

- Node.js 18+ and npm
- A Supabase project (already configured: `ydtfsajtjpngjjxnifib`)
- A Stripe account (keys pending)
- An Anthropic API key (for AI Score feature)

## 1. Install dependencies

```bash
cd socialgo
npm install
```

## 2. Environment variables

The `.env.local` file is already configured with Supabase keys. You need to add:

```env
# Stripe (get from https://dashboard.stripe.com/apikeys)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Anthropic AI (get from https://console.anthropic.com)
ANTHROPIC_API_KEY=sk-ant-...
```

## 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 4. Configure Google OAuth (for login)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services > Credentials**
4. Create an **OAuth 2.0 Client ID** (Web application)
5. Add authorized redirect URI: `https://ydtfsajtjpngjjxnifib.supabase.co/auth/v1/callback`
6. Copy the **Client ID** and **Client Secret**
7. In your [Supabase Dashboard](https://supabase.com/dashboard/project/ydtfsajtjpngjjxnifib/auth/providers):
   - Go to **Authentication > Providers > Google**
   - Enable the provider
   - Paste the Client ID and Client Secret
   - Save

## 5. Supabase database

All migrations have been applied remotely. The database includes:

- `organizations` — Multi-tenant agencies
- `members` — Team members per org
- `packages` — Agency service tiers
- `clients` — Brands managed by agencies
- `posts` — Content grid items with AI scoring
- `assets` — Media library

RLS is enabled on all tables with org-scoped policies.

A trigger auto-creates an organization + owner member when a new user signs up.

## 6. Stripe setup

### a) Add your Stripe keys to `.env.local`

Get them from [Stripe Dashboard > Developers > API Keys](https://dashboard.stripe.com/apikeys):

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
```

### b) Create products and prices automatically

```bash
STRIPE_SECRET_KEY=sk_live_... npx tsx scripts/setup-stripe.ts
```

This creates 2 products (Pro, Full Access) and 6 prices in MXN. Copy the output price IDs into `.env.local`:

```env
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_QUARTERLY=price_...
STRIPE_PRICE_PRO_ANNUAL=price_...
STRIPE_PRICE_FULL_MONTHLY=price_...
STRIPE_PRICE_FULL_QUARTERLY=price_...
STRIPE_PRICE_FULL_ANNUAL=price_...
```

### c) Set up the webhook

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://your-domain.com/api/stripe/webhook`
3. Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `charge.succeeded`, `charge.failed`
4. Copy the webhook signing secret to `.env.local`:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 7. Deploy to Vercel

```bash
npx vercel
```

Add all environment variables in the Vercel dashboard under **Settings > Environment Variables**.

## Project structure

```
socialgo/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── ai-score/route.ts     ← Claude Haiku scoring
│   │   │   └── stripe/               ← Stripe checkout, portal, webhook
│   │   ├── auth/                      ← Login, signup, callback
│   │   ├── dashboard/
│   │   │   ├── page.tsx               ← Clients (main view)
│   │   │   ├── clients/[id]/page.tsx  ← Client detail + content grid
│   │   │   ├── packages/page.tsx      ← Package management
│   │   │   ├── reports/page.tsx       ← Analytics & reports
│   │   │   ├── calendar/page.tsx      ← Content calendar
│   │   │   ├── assets/page.tsx        ← Media library
│   │   │   ├── ai-studio/page.tsx     ← AI content analyzer
│   │   │   └── settings/page.tsx      ← Agency settings
│   │   ├── pricing/page.tsx           ← Public pricing page
│   │   └── layout.tsx                 ← Root layout
│   ├── components/
│   │   ├── clients/AddClientModal.tsx
│   │   ├── posts/PostModal.tsx
│   │   ├── layout/DashboardLayout.tsx
│   │   └── ui/                        ← Button, Card, Input
│   ├── lib/
│   │   ├── hooks.ts                   ← Data hooks + mutations
│   │   ├── stripe.ts
│   │   └── supabase/                  ← Client + server helpers
│   └── types/index.ts                 ← All TypeScript types
├── .env.local                         ← Environment variables
├── tailwind.config.js                 ← SocialGo design tokens
└── SETUP.md                           ← This file
```
