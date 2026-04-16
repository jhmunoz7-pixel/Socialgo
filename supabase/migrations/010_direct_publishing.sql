-- Migration 010: Direct Publishing Infrastructure
-- Adds social_connections table and publishing columns to posts

-- Store Meta API tokens per client (each client may have a different IG/FB account)
CREATE TABLE IF NOT EXISTS public.social_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook')),
  access_token TEXT NOT NULL,
  page_id TEXT,  -- Facebook Page ID or Instagram Business Account ID
  page_name TEXT,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (client_id, platform)
);

ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;

-- Members can view connections for their org
CREATE POLICY "Members can view own org connections"
  ON public.social_connections FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.members WHERE user_id = auth.uid()));

-- Admins (owner/admin/member) can manage connections
CREATE POLICY "Admins can manage connections"
  ON public.social_connections FOR ALL
  USING (org_id IN (SELECT org_id FROM public.members WHERE user_id = auth.uid() AND role IN ('owner','admin','member')));

-- Add publishing columns to posts table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS published_url TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS publish_error TEXT;
