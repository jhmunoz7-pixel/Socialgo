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

## Session: April 16, 2026 — Changes Made
- "Empezar Gratis" → redirects to /pricing (plan selection first)
- Signup form: added agency name + phone fields, trial 7 days
- Dashboard sidebar: Paquetes first, then Clientes
- Onboarding popup (3-step setup guide, auto-hides after first client)
- Client form: removed "Status inicial", defaults to "activo"
- Client panel: activate/deactivate toggle with tooltip
- Team settings: removed "Miembro" from invite roles, default "Creativo"
- Resend invitation button + /api/members/resend-invite endpoint
- Permission matrix tab removed, owner/admin/member unified as "Administrador"
- Invite flow: InviteTokenHandler on login/set-password pages for Supabase hash tokens
- DashboardLayout split into outer (AuthProvider) + DashboardLayoutInner (consumes context)
- Role-based sidebar filtering (creative: no Paquetes/Agencia; client_viewer: only Planificación/Contenido)
- Client panel: creatives see no financial data (MRR, payments, tipo, mensualidad)
- Reports: creatives/clients see no MRR or payment sections; charts compacted in 2-col grids
- Planning page redesign: calendar (left) + posts table (right), "Nuevo Post Planeado" button/modal
- Post review modal: editable for non-clients, asset upload, comments system
- Content approval workflow: En edición → Listo para revisión interna → En revisión interna → Aprobación interna → Visible al cliente → Aprobado
- Client_viewer only sees internally-approved posts in Contenido
- Asset download for client_viewer in planning and contenido

## Roadmap: SocialGo v2 — Competitive Upgrade (vs Kontentino)

### Design Direction
- Adopt Kontentino-inspired minimalist UX: softer rounded shapes (no harsh squares),
  generous whitespace, subtle shadows, informational banners/tips, clean iconography
- Keep SocialGo's warm color palette (#FF8FAD rose, #FFBA8A peach, #FFF8F3 warm white)
- Transition from glass-morphism heavy to clean, airy panels with subtle borders
- Use Lucide React icons (outline style) instead of emoji for navigation and actions
- Add contextual tip banners ("💡 Tip: ...") and empty state illustrations
- Cards with rounded-2xl+, subtle hover lift, no heavy borders

### Phase 1 — Quick Wins (high impact, low effort)
1. **UI/UX Overhaul** — Redesign all dashboard pages with Kontentino-inspired minimalism
   - Softer panels, better spacing, icon-based nav, tip banners
   - Consistent component library (cards, buttons, badges, modals)
2. **AI Content Generation** — Expand Claude API usage:
   - Generate copy from prompt, improve existing copy, suggest hashtags
   - Translate posts (84 languages via Claude)
   - Integrate into planning modal and post editor
3. **Vista Kanban** in Contenido — Drag-and-drop columns by workflow stage
   (En edición | Revisión interna | Con cliente | Aprobado)
4. **Client approval portal (no login)** — Unique token-based link per post
   Client opens link → sees preview + can approve/comment without account
5. **Instagram Grid Preview** — Visual feed preview for each client

### Phase 2 — Differentiators (medium effort)
6. **Live Post Previews** — Mockup how post looks on IG, FB, TikTok, LinkedIn
7. **AI Brand Voice** — Analyze client's previous posts to replicate tone
8. **Enhanced Analytics** — Engagement tracking, period comparison, visual charts
9. **AI Image Generation** — Integrate image gen for asset creation
10. **Drag & Drop Calendar** — Reschedule posts by dragging

### Phase 3 — Full Competition (high effort)
11. **Direct Publishing** — Auto-publish to Instagram/Facebook via Meta Graph API
12. **PWA / Mobile** — Progressive web app for mobile access
13. **Integrations** — Canva, Google Drive, Slack notifications
14. **Competitor Analysis** — Monitor competitor social accounts

### SocialGo's Competitive Moat (what Kontentino can't copy)
- **Integrated client billing** (Stripe, packages, MRR tracking, payment status)
- **Multi-tenant agency SaaS** (org subscriptions, plan enforcement, white-label potential)
- **LATAM-native** (Spanish UI, MXN pricing, local payment methods)
- **AI-first with Claude** (more powerful than Kontentino's AI, included in all plans)
- **All-in-one** — "The only platform that manages your entire agency business:
  from client contracts to post publication"
