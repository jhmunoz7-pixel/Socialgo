-- ============================================================================
-- Migration 015: Per-user Canva OAuth tokens
-- ============================================================================
-- Until now the app used a single org-wide CANVA_API_TOKEN env var. That
-- doesn't scale when each creative needs to see their own Canva designs,
-- and it prevents us from acting on behalf of the specific user who
-- triggered the request. This migration adds per-member OAuth tokens so
-- every team member who connects Canva gets their own access/refresh
-- pair, refreshed automatically when it expires.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.canva_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- OAuth credentials (store raw; rely on RLS + network TLS + Supabase-at-rest encryption)
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  scope TEXT,
  expires_at TIMESTAMPTZ,
  -- Metadata about the Canva account, if returned by /oauth/userinfo
  canva_user_id TEXT,
  canva_display_name TEXT,
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (member_id)
);

CREATE INDEX IF NOT EXISTS canva_oauth_tokens_org_idx
  ON public.canva_oauth_tokens (org_id);

-- Updated-at trigger (reuses the shared handle_updated_at function if present)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
    EXECUTE 'CREATE TRIGGER canva_oauth_tokens_updated_at
      BEFORE UPDATE ON public.canva_oauth_tokens
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()';
  END IF;
EXCEPTION WHEN duplicate_object THEN
  -- trigger already exists, ignore
  NULL;
END $$;

ALTER TABLE public.canva_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- A member can only see and modify their own Canva token. Server-side
-- inserts/updates still go through the service role in the OAuth callback,
-- but the RLS protects the row from any other user in the same org.
CREATE POLICY "Members access own Canva token"
  ON public.canva_oauth_tokens FOR ALL
  USING (member_id = (SELECT id FROM public.members WHERE user_id = auth.uid()))
  WITH CHECK (member_id = (SELECT id FROM public.members WHERE user_id = auth.uid()));

COMMENT ON TABLE public.canva_oauth_tokens IS
  'Per-member Canva Connect API OAuth tokens. One row per member max (UNIQUE).';
COMMENT ON COLUMN public.canva_oauth_tokens.expires_at IS
  'When the access_token expires. If NULL, treat the token as already stale and force a refresh on next use.';
