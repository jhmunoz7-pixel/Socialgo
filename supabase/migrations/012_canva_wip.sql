-- ============================================================================
-- Migration 012: Canva WIP Integration
-- Link Canva folders to clients and cache synced designs
-- ============================================================================

-- Link Canva folders to clients
CREATE TABLE IF NOT EXISTS public.canva_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  folder_id TEXT NOT NULL,
  folder_name TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (client_id, folder_id)
);

ALTER TABLE public.canva_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own org canva connections"
  ON public.canva_connections FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.members WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage canva connections"
  ON public.canva_connections FOR ALL
  USING (org_id IN (SELECT org_id FROM public.members WHERE user_id = auth.uid() AND role IN ('owner','admin','member','creative')));

-- Cache synced Canva designs
CREATE TABLE IF NOT EXISTS public.canva_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  canva_design_id TEXT NOT NULL,
  title TEXT,
  thumbnail_url TEXT,
  design_url TEXT,
  page_count INTEGER DEFAULT 1,
  canva_updated_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  -- Link to SocialGo post (null until assigned)
  linked_post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'wip' CHECK (status IN ('wip', 'assigned', 'exported')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_id, canva_design_id)
);

ALTER TABLE public.canva_designs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own org canva designs"
  ON public.canva_designs FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.members WHERE user_id = auth.uid()));

CREATE POLICY "Team can manage canva designs"
  ON public.canva_designs FOR ALL
  USING (org_id IN (SELECT org_id FROM public.members WHERE user_id = auth.uid() AND role IN ('owner','admin','member','creative')));
