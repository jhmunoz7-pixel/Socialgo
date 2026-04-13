-- SocialGo V2 — Complete schema for agency management platform
-- Run this AFTER 001_initial.sql

-- ======================== Organizations ========================
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  email TEXT,
  phone TEXT,
  website TEXT,
  timezone TEXT DEFAULT 'America/Mexico_City',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'full_access')),
  plan_status TEXT DEFAULT 'trialing' CHECK (plan_status IN ('trialing', 'active', 'past_due', 'canceled')),
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'quarterly', 'annual')),
  client_limit INTEGER DEFAULT 1,
  theme TEXT DEFAULT 'rose' CHECK (theme IN ('rose', 'blue', 'dark')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- ======================== Members ========================
CREATE TABLE IF NOT EXISTS public.members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'creative', 'client_viewer')),
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

CREATE INDEX IF NOT EXISTS members_org_id_idx ON public.members(org_id);
CREATE INDEX IF NOT EXISTS members_user_id_idx ON public.members(user_id);

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- ======================== Packages ========================
CREATE TABLE IF NOT EXISTS public.packages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12,2),
  currency TEXT DEFAULT 'MXN',
  features TEXT[] DEFAULT '{}',
  discount_quarterly NUMERIC(5,2) DEFAULT 0,
  discount_semiannual NUMERIC(5,2) DEFAULT 0,
  discount_annual NUMERIC(5,2) DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS packages_org_id_idx ON public.packages(org_id);

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

-- ======================== Clients ========================
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Brand identity
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '🎯',
  color TEXT DEFAULT '#E8D5FF',
  -- Contact
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  city TEXT,
  -- Social
  instagram TEXT,
  instagram_connected BOOLEAN DEFAULT FALSE,
  instagram_access_token TEXT,
  tiktok TEXT,
  facebook TEXT,
  linkedin TEXT,
  -- Package & billing
  package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
  package_type TEXT DEFAULT 'monthly' CHECK (package_type IN ('monthly', 'quarterly', 'semiannual', 'annual')),
  contract_months INTEGER DEFAULT 1,
  custom_price NUMERIC(12,2),
  requires_iva BOOLEAN DEFAULT FALSE,
  iva_included BOOLEAN DEFAULT FALSE,
  total_accumulated NUMERIC(12,2) DEFAULT 0,
  -- Dates
  start_date DATE,
  end_date DATE,
  -- Status
  pay_status TEXT DEFAULT 'pendiente' CHECK (pay_status IN ('pagado', 'pendiente', 'vencido')),
  account_status TEXT DEFAULT 'onboarding' CHECK (account_status IN ('activo', 'on_track', 'pago_pendiente', 'onboarding', 'pausado')),
  -- Assignment
  manager_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS clients_org_id_idx ON public.clients(org_id);
CREATE INDEX IF NOT EXISTS clients_package_id_idx ON public.clients(package_id);
CREATE INDEX IF NOT EXISTS clients_manager_id_idx ON public.clients(manager_id);
CREATE INDEX IF NOT EXISTS clients_account_status_idx ON public.clients(account_status);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- ======================== Posts ========================
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  -- Content
  name TEXT,
  copy TEXT,
  explanation TEXT,
  cta TEXT,
  inspo_url TEXT,
  internal_comments TEXT,
  -- Classification
  post_type TEXT CHECK (post_type IN ('ventas_promo', 'fun_casual', 'educativo', 'formal', 'otro')),
  format TEXT CHECK (format IN ('video', 'estatico', 'carousel', 'story', 'reel', 'otro')),
  platform TEXT DEFAULT 'instagram' CHECK (platform IN ('instagram', 'tiktok', 'facebook', 'linkedin', 'twitter', 'youtube')),
  -- Scheduling
  scheduled_date DATE,
  scheduled_time TIME,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'planned', 'approved', 'approved_with_changes', 'rejected', 'review_1_1', 'in_production', 'scheduled', 'published', 'archived')),
  -- Approval
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'approved_with_changes', 'rejected', 'review_1_1')),
  approval_token TEXT UNIQUE,
  approval_comments TEXT,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  -- Media
  image_url TEXT,
  media_urls TEXT[] DEFAULT '{}',
  -- AI
  ai_score INTEGER,
  ai_insights JSONB DEFAULT '[]',
  -- Assignment
  assigned_to UUID REFERENCES public.members(id) ON DELETE SET NULL,
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS posts_org_id_idx ON public.posts(org_id);
CREATE INDEX IF NOT EXISTS posts_client_id_idx ON public.posts(client_id);
CREATE INDEX IF NOT EXISTS posts_scheduled_date_idx ON public.posts(scheduled_date);
CREATE INDEX IF NOT EXISTS posts_status_idx ON public.posts(status);
CREATE INDEX IF NOT EXISTS posts_approval_token_idx ON public.posts(approval_token);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- ======================== Assets ========================
CREATE TABLE IF NOT EXISTS public.assets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT CHECK (file_type IN ('photo', 'video', 'template', 'kit', 'brandbook', 'logo', 'font', 'other')),
  file_size INTEGER,
  dimensions TEXT,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'brandkit', 'inspo', 'content', 'logo', 'font')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS assets_org_id_idx ON public.assets(org_id);
CREATE INDEX IF NOT EXISTS assets_client_id_idx ON public.assets(client_id);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- ======================== Brand Kit ========================
CREATE TABLE IF NOT EXISTS public.brand_kits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Style preferences
  color_palette JSONB DEFAULT '[]',
  fonts JSONB DEFAULT '[]',
  style_questionnaire JSONB DEFAULT '{}',
  -- Inspiration
  inspo_accounts TEXT[] DEFAULT '{}',
  inspo_notes TEXT,
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS brand_kits_client_id_idx ON public.brand_kits(client_id);

ALTER TABLE public.brand_kits ENABLE ROW LEVEL SECURITY;

-- ======================== Post Comments (for approvals) ========================
CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_name TEXT,
  author_email TEXT,
  author_member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_client_comment BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS post_comments_post_id_idx ON public.post_comments(post_id);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- ======================== Content Weeks ========================
CREATE TABLE IF NOT EXISTS public.content_weeks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'pending_approval', 'approved', 'published')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS content_weeks_client_id_idx ON public.content_weeks(client_id);

ALTER TABLE public.content_weeks ENABLE ROW LEVEL SECURITY;

-- ======================== RLS Policies ========================

-- Organizations: members can read their org
CREATE POLICY "Members can view their organization"
  ON public.organizations FOR SELECT
  USING (id IN (SELECT org_id FROM public.members WHERE user_id = auth.uid()));

CREATE POLICY "Owners can update their organization"
  ON public.organizations FOR UPDATE
  USING (id IN (SELECT org_id FROM public.members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "Service role manages organizations"
  ON public.organizations FOR ALL
  USING (auth.role() = 'service_role');

-- Members: org members can see each other
CREATE POLICY "Members can view org members"
  ON public.members FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.members WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage members"
  ON public.members FOR ALL
  USING (org_id IN (SELECT org_id FROM public.members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "Service role manages members"
  ON public.members FOR ALL
  USING (auth.role() = 'service_role');

-- Packages: org members can read, admins can write
CREATE POLICY "Members can view packages"
  ON public.packages FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.members WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage packages"
  ON public.packages FOR ALL
  USING (org_id IN (SELECT org_id FROM public.members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "Service role manages packages"
  ON public.packages FOR ALL
  USING (auth.role() = 'service_role');

-- Clients: org members can read, admins can write, creatives see assigned
CREATE POLICY "Members can view clients"
  ON public.clients FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.members WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage clients"
  ON public.clients FOR ALL
  USING (org_id IN (SELECT org_id FROM public.members WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')));

CREATE POLICY "Service role manages clients"
  ON public.clients FOR ALL
  USING (auth.role() = 'service_role');

-- Posts: org members can read/write
CREATE POLICY "Members can view posts"
  ON public.posts FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.members WHERE user_id = auth.uid()));

CREATE POLICY "Members can manage posts"
  ON public.posts FOR ALL
  USING (org_id IN (SELECT org_id FROM public.members WHERE user_id = auth.uid()));

-- Public access for approval tokens
CREATE POLICY "Public can view posts by approval token"
  ON public.posts FOR SELECT
  USING (approval_token IS NOT NULL);

CREATE POLICY "Service role manages posts"
  ON public.posts FOR ALL
  USING (auth.role() = 'service_role');

-- Assets: org members can read/write
CREATE POLICY "Members can view assets"
  ON public.assets FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.members WHERE user_id = auth.uid()));

CREATE POLICY "Members can manage assets"
  ON public.assets FOR ALL
  USING (org_id IN (SELECT org_id FROM public.members WHERE user_id = auth.uid()));

CREATE POLICY "Service role manages assets"
  ON public.assets FOR ALL
  USING (auth.role() = 'service_role');

-- Brand Kits
CREATE POLICY "Members can view brand kits"
  ON public.brand_kits FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.members WHERE user_id = auth.uid()));

CREATE POLICY "Members can manage brand kits"
  ON public.brand_kits FOR ALL
  USING (org_id IN (SELECT org_id FROM public.members WHERE user_id = auth.uid()));

CREATE POLICY "Service role manages brand kits"
  ON public.brand_kits FOR ALL
  USING (auth.role() = 'service_role');

-- Post Comments
CREATE POLICY "Members can view post comments"
  ON public.post_comments FOR SELECT
  USING (post_id IN (SELECT id FROM public.posts WHERE org_id IN (SELECT org_id FROM public.members WHERE user_id = auth.uid())));

CREATE POLICY "Anyone can comment via token"
  ON public.post_comments FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Service role manages comments"
  ON public.post_comments FOR ALL
  USING (auth.role() = 'service_role');

-- Content Weeks
CREATE POLICY "Members can view content weeks"
  ON public.content_weeks FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.members WHERE user_id = auth.uid()));

CREATE POLICY "Members can manage content weeks"
  ON public.content_weeks FOR ALL
  USING (org_id IN (SELECT org_id FROM public.members WHERE user_id = auth.uid()));

CREATE POLICY "Service role manages content weeks"
  ON public.content_weeks FOR ALL
  USING (auth.role() = 'service_role');

-- ======================== Triggers ========================
CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER members_updated_at BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER packages_updated_at BEFORE UPDATE ON public.packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER posts_updated_at BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER brand_kits_updated_at BEFORE UPDATE ON public.brand_kits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER content_weeks_updated_at BEFORE UPDATE ON public.content_weeks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ======================== Auto-create org on signup ========================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
  org_slug TEXT;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');

  -- Generate slug from email
  org_slug := LOWER(REPLACE(SPLIT_PART(NEW.email, '@', 1), '.', '-')) || '-' || SUBSTR(gen_random_uuid()::TEXT, 1, 6);

  -- Create organization
  INSERT INTO public.organizations (name, slug, email)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'company', 'Mi Agencia'),
    org_slug,
    NEW.email
  )
  RETURNING id INTO new_org_id;

  -- Create member as owner
  INSERT INTO public.members (org_id, user_id, role, full_name)
  VALUES (
    new_org_id,
    NEW.id,
    'owner',
    NEW.raw_user_meta_data->>'full_name'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
