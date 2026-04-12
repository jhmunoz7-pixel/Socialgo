# Duo SaaS Boilerplate - Complete Index

**Created for Jorge at Loonshot Labs** - A production-ready SaaS boilerplate to rapidly launch 2-3 SaaS products under the Duo brand.

## Start Here

1. **First time?** Read `QUICK_START.md` (5 minutes)
2. **Want details?** Read `README.md` (setup guide)
3. **Need reference?** Check `BOILERPLATE_SUMMARY.md` (file manifest)
4. **Have questions?** Look below for specific sections

---

## Quick Navigation

### Getting Started
- `QUICK_START.md` - 30-second setup guide
- `README.md` - Comprehensive documentation
- `.env.example` - Environment variables template

### Configuration
- `package.json` - Dependencies and scripts
- `tailwind.config.js` - Brand colors and design system
- `tsconfig.json` - TypeScript configuration
- `next.config.js` - Next.js settings
- `.eslintrc.json` - Code style rules

### Source Code Structure
```
src/
├── app/                 # Next.js App Router
│   ├── page.tsx        # Landing page
│   ├── pricing/        # Pricing page
│   ├── auth/           # Login, signup, OAuth callback
│   ├── dashboard/      # Protected dashboard area
│   ├── api/            # Stripe API endpoints
│   ├── layout.tsx      # Root layout
│   └── globals.css     # Global styles
│
├── components/          # React components
│   ├── ui/             # Base UI components
│   ├── auth/           # Auth forms
│   ├── layout/         # Layout components
│   └── pricing/        # Pricing display
│
├── lib/                # Utilities
│   ├── supabase/       # Supabase clients
│   ├── stripe.ts       # Stripe client
│   └── stripe-helpers.ts # Payment utilities
│
├── types/              # TypeScript definitions
│   └── index.ts
│
└── middleware.ts       # Route protection

supabase/
└── migrations/
    └── 001_initial.sql # Database schema

```

---

## Stack Overview

### Frontend
- **Next.js 14** (App Router)
- **React 19**
- **TypeScript 5.3**
- **Tailwind CSS 3.4**

### Backend/Services
- **Supabase** - Auth, PostgreSQL, RLS
- **Stripe** - Payments, subscriptions, webhooks
- **Vercel** - Recommended hosting

### Design System
- **Loonshot Colors** - Navy, Charcoal, AuroMetal, Seashell, Inchworm
- **Mont Font** - Bold + Regular (fallback to system)
- **Responsive Design** - Mobile-first

---

## Key Files Explained

### Pages (User-facing routes)

| File | Purpose | Status |
|------|---------|--------|
| `src/app/page.tsx` | Landing page with features/pricing | Public |
| `src/app/pricing/page.tsx` | Pricing page with all plans | Public |
| `src/app/auth/login/page.tsx` | Email/password login | Public |
| `src/app/auth/signup/page.tsx` | Account registration | Public |
| `src/app/auth/callback/route.ts` | OAuth provider redirect | Public |
| `src/app/dashboard/page.tsx` | User dashboard overview | Protected |
| `src/app/dashboard/billing/page.tsx` | Subscription management | Protected |
| `src/app/dashboard/settings/page.tsx` | Account settings | Protected |

### Components (Reusable UI)

| File | Purpose |
|------|---------|
| `src/components/ui/Button.tsx` | Branded button with variants |
| `src/components/ui/Card.tsx` | Card container for content |
| `src/components/ui/Input.tsx` | Form input with validation |
| `src/components/layout/Navbar.tsx` | Top navigation bar |
| `src/components/layout/UserMenu.tsx` | User dropdown menu |
| `src/components/layout/DashboardLayout.tsx` | Dashboard layout |
| `src/components/auth/LoginForm.tsx` | Login form component |
| `src/components/auth/SignUpForm.tsx` | Signup form component |
| `src/components/pricing/PricingCard.tsx` | Pricing tier card |

### API Routes (Backend)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/stripe/checkout` | POST | Create checkout session |
| `/api/stripe/webhook` | POST | Handle Stripe events |
| `/api/stripe/portal` | POST | Customer portal session |

### Database

| Table | Purpose |
|-------|---------|
| `profiles` | User account information |
| `subscriptions` | Stripe subscription tracking |
| `invoices` | Billing history (optional) |
| `activity_logs` | Audit trail (optional) |

All tables have:
- Row Level Security (RLS) policies
- Proper indexes
- Auto-updated timestamps
- Relational integrity

---

## Common Tasks

### Change Brand Colors
Edit `tailwind.config.js` → `theme.extend.colors`

### Add a New Page
```bash
mkdir -p src/app/my-page
# Create src/app/my-page/page.tsx
```

### Add Database Table
```bash
# Create src/supabase/migrations/002_my_table.sql
# Run migration in Supabase SQL Editor
```

### Add API Endpoint
```bash
# Create src/app/api/my-endpoint/route.ts
```

### Deploy
```bash
# Connect to Vercel, add environment variables, push to main branch
```

---

## Authentication Flow

1. User visits `/auth/signup` or `/auth/login`
2. Form submits to Supabase via `@supabase/supabase-js`
3. Supabase returns session (stored in httpOnly cookie)
4. Middleware (`src/middleware.ts`) validates session
5. Protected routes redirect to login if no session
6. User redirected to `/dashboard` on successful auth
7. Sidebar/user menu available in authenticated area

---

## Payment Flow

1. User selects plan on `/pricing`
2. Clicks checkout → calls `/api/stripe/checkout`
3. API creates Stripe checkout session
4. User redirected to Stripe hosted checkout
5. User completes payment
6. Stripe webhook → `/api/stripe/webhook`
7. Webhook updates database subscription status
8. User gets access to pro features

---

## TypeScript Coverage

All files use TypeScript with strict mode enabled.

**Type files:**
- `src/types/index.ts` - Core application types
- Auto-generated types from Supabase database schema (optional)
- Stripe types via `stripe` npm package

---

## Environment Variables

Get these from:
- **Supabase** - Settings → API
- **Stripe** - Developers → API Keys + Webhooks

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_APP_URL`

---

## Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Check code style
npm run type-check   # Check TypeScript
```

---

## Project Statistics

| Metric | Value |
|--------|-------|
| Configuration files | 5 |
| TypeScript files | 28 |
| Total source files | 37 |
| Lines of TypeScript | 2,110 |
| Lines of SQL | 193 |
| Documentation lines | 299+ |
| UI components | 6 |
| API routes | 3 |
| Protected pages | 3 |
| Public pages | 2 |

---

## Deployment Checklist

- [ ] Fill in `.env.local` with all required variables
- [ ] Run database migration in Supabase
- [ ] Test signup and login locally
- [ ] Test Stripe checkout in test mode
- [ ] Configure Stripe webhook URL
- [ ] Push code to GitHub
- [ ] Connect to Vercel
- [ ] Set environment variables in Vercel
- [ ] Deploy and test in production
- [ ] Set up custom domain
- [ ] Enable HTTPS (automatic on Vercel)
- [ ] Monitor error logs

---

## Support & Next Steps

1. **Setup** - Follow `QUICK_START.md`
2. **Learn** - Read `README.md` for detailed guide
3. **Customize** - Update brand colors, copy, pages
4. **Add Features** - Build on the foundation
5. **Deploy** - Push to Vercel

---

## File Manifest

For a complete list of all 40+ files with descriptions, see `BOILERPLATE_SUMMARY.md`.

---

**Built by Loonshot Labs - Empowering founders to build SaaS at scale.**

Questions? Check the docs or reach out to support@loonshotlabs.com
