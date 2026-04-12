# Duo SaaS Boilerplate - Quick Start

## 30 Second Setup

```bash
# 1. Clone & install
git clone <your-repo> my-saas
cd my-saas
npm install

# 2. Copy env template
cp .env.example .env.local

# 3. Fill in secrets (see below)
# 4. Run migrations in Supabase dashboard
# 5. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Environment Variables (Get These First)

### From Supabase
1. Go to supabase.com → Create project
2. Settings → API → Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Anon Key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Service Role Key → `SUPABASE_SERVICE_ROLE_KEY`

### From Stripe
1. Go to stripe.com → Developers → API Keys → Copy:
   - Secret Key → `STRIPE_SECRET_KEY`
   - Publishable Key → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
2. Webhooks → Add endpoint: `https://your-domain.com/api/stripe/webhook`
   - Copy Signing Secret → `STRIPE_WEBHOOK_SECRET`

### App Config
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Database Setup

1. In Supabase, go to SQL Editor
2. Copy contents of `supabase/migrations/001_initial.sql`
3. Paste and execute

Done! Tables ready.

---

## Project Structure

```
src/
├── app/              # Pages & routes
│   ├── page.tsx      # Home
│   ├── pricing/      # Pricing page
│   ├── auth/         # Login, signup
│   ├── dashboard/    # Protected area
│   └── api/          # API endpoints
├── components/       # React components
│   ├── ui/          # Button, Card, Input
│   ├── auth/        # LoginForm, SignUpForm
│   └── layout/      # Navbar, DashboardLayout
├── lib/             # Utilities
│   ├── supabase/   # Auth clients
│   └── stripe/     # Payment helpers
└── types/          # TypeScript defs
```

---

## Key Files to Know

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Landing page |
| `src/app/pricing/page.tsx` | Pricing page |
| `src/app/auth/login/page.tsx` | Login page |
| `src/app/dashboard/page.tsx` | Dashboard |
| `tailwind.config.js` | Brand colors |
| `.env.local` | Your secrets |
| `supabase/migrations/001_initial.sql` | Database schema |

---

## Common Tasks

### Add a New Page
```typescript
// src/app/my-page/page.tsx
export default function MyPage() {
  return <div>Hello</div>
}
```

### Add a Component
```typescript
// src/components/MyComponent.tsx
export function MyComponent() {
  return <div>My Component</div>
}
```

### Customize Colors
Edit `tailwind.config.js` colors section:
```js
navy: { 950: "#0F1D27" }      // Primary dark
charcoal: { 700: "#354654" }  // Cards
inchworm: { 400: "#B4F965" }  // Accent
```

### Query Database
```typescript
const supabase = await createServerSupabaseClient();
const { data } = await supabase.from('profiles').select('*');
```

### Handle Stripe
```typescript
import { createCheckoutSession } from '@/lib/stripe-helpers';

const url = await createCheckoutSession({
  userId: user.id,
  priceId: 'price_xyz',
  successUrl: 'https://example.com/success',
  cancelUrl: 'https://example.com/cancel',
});
```

---

## Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Connect repo to Vercel
3. Add `.env` vars in project settings
4. Deploy (auto-triggers on push)

### Other Platforms
Works on any Node.js 18+ host. Set these environment variables and run `npm run build && npm run start`.

---

## Support

- Full docs in `README.md`
- File manifest in `BOILERPLATE_SUMMARY.md`
- TypeScript types in `src/types/index.ts`
- Comments in every file

---

## What's Included

- Authentication (email/password + OAuth ready)
- Database schema with RLS
- Stripe checkout & webhooks
- Dashboard with billing
- Loonshot brand styling
- TypeScript throughout
- Production-ready code

---

## Next Steps

1. Setup env variables
2. Run migrations
3. Customize colors in `tailwind.config.js`
4. Update copy in `src/app/page.tsx`
5. Add your features
6. Deploy to Vercel

**You're ready to build your SaaS!**
