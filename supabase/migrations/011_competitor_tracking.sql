-- 011: Competitor tracking for competitive analysis feature
-- Allows agencies to track competitors for each client

CREATE TABLE IF NOT EXISTS public.competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  instagram_handle TEXT,
  facebook_url TEXT,
  tiktok_handle TEXT,
  linkedin_url TEXT,
  website TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;

-- All org members can view competitors
CREATE POLICY "Members can view own org competitors"
  ON public.competitors FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.members WHERE user_id = auth.uid()));

-- Admins (owner/admin/member) can insert/update/delete competitors
CREATE POLICY "Admins can manage competitors"
  ON public.competitors FOR ALL
  USING (org_id IN (SELECT org_id FROM public.members WHERE user_id = auth.uid() AND role IN ('owner','admin','member')));
