# Duo SaaS Boilerplate

A production-ready SaaS boilerplate built for Loonshot Labs. Rapidly launch 2-3 SaaS products under the Duo brand with all essential features pre-configured.

**Built with:** Next.js 14 (App Router) + Supabase (Auth, Database, Storage) + Stripe (Payments & Subscriptions)

## Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Supabase account (free tier works)
- Stripe account (free tier works)
- Git

### 1. Clone and Install

```bash
git clone <repository-url> my-saas-product
cd my-saas-product
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Settings > API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Anon Key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Service Role Key → `SUPABASE_SERVICE_ROLE_KEY`
3. Run migrations in Supabase SQL Editor:
   ```bash
   # Copy the contents of supabase/migrations/001_initial.sql
   # Paste into Supabase SQL Editor and execute
   ```

### 3. Set Up Stripe

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Go to **Developers > API Keys** and copy:
   - Secret Key (live/test) → `STRIPE_SECRET_KEY`
   - Publishable Key (live/test) → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
3. Create webhook endpoint:
   - Go to **Developers > Webhooks**
   - Add endpoint: `https://your-domain.com/api/stripe/webhook`
   - Subscribe to events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `charge.succeeded`, `charge.failed`
   - Copy Signing Secret → `STRIPE_WEBHOOK_SECRET`

### 4. Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) - you should see the landing page.

## Project Structure

```
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── page.tsx        # Landing page
│   │   ├── auth/           # Authentication pages (login, signup, callback)
│   │   ├── dashboard/      # Protected dashboard pages
│   │   ├── api/            # API routes (Stripe endpoints)
│   │   ├── layout.tsx      # Root layout
│   │   └── globals.css     # Global styles
│   ├── components/          # Reusable React components
│   │   ├── ui/             # Base UI components (Button, Card, Input)
│   │   ├── auth/           # Auth-related components (LoginForm, SignUpForm)
│   │   ├── layout/         # Layout components (Navbar, DashboardLayout)
│   │   └── pricing/        # Pricing components
│   ├── lib/                # Utility functions and helpers
│   │   ├── supabase/       # Supabase client initialization
│   │   ├── stripe.ts       # Stripe client setup
│   │   └── stripe-helpers.ts # Stripe utility functions
│   ├── types/              # TypeScript type definitions
│   └── middleware.ts       # Next.js middleware for route protection
├── supabase/
│   └── migrations/         # Database migration SQL files
├── package.json            # Dependencies
├── tailwind.config.js      # Tailwind CSS configuration
├── tsconfig.json          # TypeScript configuration
└── next.config.js         # Next.js configuration
```

## Key Features

### Authentication
- Email/password signup and login
- OAuth provider support (Google, GitHub)
- Protected routes with middleware
- Automatic profile creation on signup
- Secure session management with httpOnly cookies

### Database (Supabase)
- PostgreSQL with Row Level Security (RLS)
- User profiles with metadata
- Subscription tracking
- Invoice history
- Activity logs for audit trails
- Automatic `updated_at` timestamps

### Payments (Stripe)
- Subscription checkout sessions
- Webhook handling for subscription events
- Customer portal for subscription management
- Subscription status tracking
- Invoice logging

### UI/Design
- Loonshot Labs brand color system
- Tailwind CSS with custom configuration
- Responsive component library
- Loading states and error handling
- Accessible form components

### Routing & Protection
- Public pages: `/`, `/auth/login`, `/auth/signup`
- Protected pages: `/dashboard/*` (requires authentication)
- Automatic redirects for unauthenticated users
- Middleware for session refresh

## Development Workflow

### Running Tests
```bash
npm run lint
npm run type-check
```

### Building for Production
```bash
npm run build
npm run start
```

### Database Migrations
To add new database features:

1. Create a new migration file: `supabase/migrations/002_your_feature.sql`
2. Write your SQL changes
3. Run in Supabase SQL Editor or use Supabase CLI

## Customization Guide

### Brand Colors

Edit `tailwind.config.js` to change colors:

```javascript
colors: {
  navy: { 950: "#0F1D27" },       // Primary dark background
  charcoal: { 700: "#354654" },   // Cards on dark backgrounds
  aurometal: { 500: "#6C7A83" },  // Muted text and borders
  seashell: { 50: "#E5E5E3" },    // Light text
  inchworm: { 400: "#B4F965" },   // Primary accent/CTAs
}
```

### Typography

Font stack uses "Mont" (fallback: system sans-serif). To use custom fonts:

1. Import fonts in `src/app/layout.tsx`
2. Update `tailwind.config.js` fontFamily
3. Update `src/app/globals.css` if needed

### Pricing Plans

1. Create prices in Stripe Dashboard
2. Copy price IDs
3. Use in checkout pages with the `priceId` parameter

### Adding Pages

New authenticated pages:

```typescript
// src/app/dashboard/new-page/page.tsx
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function NewPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Your page content
  return <div>Protected content</div>;
}
```

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous public key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (never expose publicly) | Yes |
| `STRIPE_SECRET_KEY` | Stripe secret API key (never expose publicly) | Yes |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | Yes |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | Yes |
| `NEXT_PUBLIC_APP_URL` | Your app's public URL | Yes |

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Connect repo to Vercel
3. Add environment variables in Vercel project settings
4. Deploy (automatic on push to main)

### Other Platforms

Works on any Node.js 18+ platform:
- Railway
- Render
- Fly.io
- AWS/Azure/GCP App Services
- Docker

## Security Checklist

- [ ] All sensitive keys are in `.env.local` (not committed)
- [ ] Supabase RLS policies are configured correctly
- [ ] Stripe webhook secret is configured
- [ ] HTTPS is enabled in production
- [ ] CORS is properly configured in Supabase
- [ ] Password requirements enforced (8+ chars)
- [ ] Rate limiting on auth endpoints (consider adding)
- [ ] Audit logs reviewed regularly

## Troubleshooting

### "Invalid supabase credentials"
- Check `.env.local` has correct URL and keys
- Ensure keys are from the same Supabase project
- Verify API is enabled in Supabase

### Stripe webhook not working
- Check webhook URL is publicly accessible
- Verify signing secret matches in code
- Check Stripe dashboard webhook logs

### Users can't sign up
- Check Supabase auth policies aren't too restrictive
- Verify email confirmation isn't required (or configure it)
- Check database migrations ran successfully

### Dashboard redirects to login
- Check user session cookie exists
- Verify middleware is not blocking auth routes
- Check Supabase session validity

## Performance Tips

1. **Images**: Use Next.js Image component for optimization
2. **Database**: Add indexes for frequently queried columns (done in migrations)
3. **API Routes**: Cache responses where appropriate
4. **Styling**: Purge unused CSS with Tailwind
5. **Code Splitting**: Use dynamic imports for large components

## Support & Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Stripe Docs](https://stripe.com/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

## License

This boilerplate is provided by Loonshot Labs. Use it to build amazing SaaS products.

---

**Made with by Loonshot Labs for founders building the future.**
