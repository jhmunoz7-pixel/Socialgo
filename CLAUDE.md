# SocialGo — Claude Code Context

## What is this?
SocialGo is a multi-tenant B2B SaaS for social media agencies. Agencies manage clients, create content grids (parrillas), approve posts, track billing, and use AI scoring (Claude Haiku).

## Tech Stack
- **Frontend**: Next.js 14 (App Router), React 19, TypeScript 5.3, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage), Stripe (subscriptions)
- **AI**: Claude Haiku via Anthropic API (`/api/ai-score`)
- **Deploy**: Vercel — https://socialgo-one.vercel.app

## Project Structure
```
src/app/                    # Next.js pages (App Router)
  auth/                     # login, signup, reset-password, update-password, callback
  dashboard/                # Main app (clients, packages, calendar, planning, contenido, assets, ai-studio, reports, billing, settings)
  platform/                 # Jorge's admin dashboard (god mode)
  api/                      # API routes (stripe/checkout, stripe/webhook, stripe/portal, ai-score, invite-member, me/is-platform-admin, platform/*)
  pricing/                  # Public pricing page
src/components/             # Reusable components (ui/, auth/, layout/, clients/, posts/, brand/, theme/)
src/lib/                    # Core utilities
  supabase/client.ts        # Browser Supabase client
  supabase/server.ts        # Server Supabase client + service role
  supabase/middleware.ts     # Cookie session handler
  hooks.ts                  # All data hooks (useClients, usePosts, useStats, etc.) + mutations (createClient, createPost, etc.)
  auth-context.tsx          # AuthProvider with onAuthStateChange listener
  stripe.ts                 # Stripe client init
  stripe-helpers.ts         # Checkout, portal, customer helpers
  pricing-config.ts         # Plan definitions (free/pro/full_access) + Stripe price IDs
  permissions.ts            # Role-based permissions (owner/admin/member/creative/client_viewer)
src/types/index.ts          # All TypeScript interfaces
supabase/migrations/        # 6 SQL migrations (001-006)
```

## Database Schema (Supabase PostgreSQL)
- `organizations` — Agencies (plan, stripe IDs, client_limit, theme)
- `members` — Team members (org_id, user_id, role)
- `packages` — Custom service tiers agencies offer to their clients
- `clients` — Brands managed by agencies (package, billing, status, social accounts)
- `posts` — Content grid items (copy, type, format, scheduling, approval, AI score)
- `assets` — Media library (stored in `post-assets` Supabase Storage bucket)
- `brand_kits` — Brand guidelines per client
- `post_comments` — Approval thread comments
- `content_weeks` — Weekly content planning blocks
- `profiles` — User profiles (auto-created by trigger)
- `platform_actions_log` — Admin audit log

## Key Patterns
- **Auth**: Supabase Auth with email/password. OAuth callback at `/auth/callback`. DB trigger `handle_new_user()` auto-creates org + member on signup.
- **Multi-tenancy**: All tables scoped by `org_id`. RLS policies enforce org isolation. Role-based write restrictions (migration 005).
- **Billing**: Stripe checkout → webhook updates org plan/status. Plans: free (1 client), pro (5), full_access (20).
- **Permissions**: Frontend-only via `usePermissions()` hook + DB RLS policies for write operations.
- **Plan enforcement**: Banner in DashboardLayout for canceled/past_due. Post creation blocked when canceled.

## Recent Assessment (April 2026)
Completed comprehensive assessment and fixed 21 issues across 2 PRs:
- Critical: Stripe webhook queried wrong table name (`organization_members` → `members`)
- Pricing page showed incorrect prices (double-division)
- Added password reset flow (was dead link)
- AuthContext listens to onAuthStateChange
- Invite member uses server-side API route (was broken frontend signUp)
- Calendar shows all posts (was filtering only status==='scheduled')
- PostCard joins assigned_member, Add Post button works
- RLS tightened by role, approval token policy fixed
- Plan enforcement banners, storage bucket policies
- All TypeScript errors fixed (0 errors on `npx tsc --noEmit`)
- Removed exposed `.env.production` from git, rotated all secrets

## Environment Variables (in Vercel)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_APP_URL
PLATFORM_ADMIN_EMAILS
ANTHROPIC_API_KEY
STRIPE_PRICE_PRO_MONTHLY / QUARTERLY / ANNUAL
STRIPE_PRICE_FULL_MONTHLY / QUARTERLY / ANNUAL
```

## Commands
```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npx tsc --noEmit     # Type check (should be 0 errors)
```

## Language
UI is in Spanish (es-MX). Code comments and variable names in English.
