-- ============================================================================
-- Migration 016: Codify the client_members assignment table
-- ============================================================================
-- The `client_members` table was introduced ad-hoc in production to let
-- admins assign creatives to specific clients (a creative only sees posts
-- and clients they're scoped to). It was already used by the /api/members
-- routes and by our UI scope logic, but no migration was ever committed.
--
-- This migration creates the table and policies idempotently so:
--   • fresh databases get the schema,
--   • production gets NOOP'd because the table already exists,
--   • developers stop being surprised by an undocumented dependency.
--
-- Shape:
--   (client_id, user_id, org_id) — composite uniqueness on (client_id, user_id)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.client_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (client_id, user_id)
);

CREATE INDEX IF NOT EXISTS client_members_user_idx
  ON public.client_members (user_id, org_id);
CREATE INDEX IF NOT EXISTS client_members_client_idx
  ON public.client_members (client_id);

ALTER TABLE public.client_members ENABLE ROW LEVEL SECURITY;

-- A member can read their own assignments and any assignment within their org.
-- Only admins can write (inserts/updates come through the /api/members route
-- which uses the service-role client, so RLS mostly guards reads here).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'client_members'
      AND policyname = 'Members read own-org client assignments'
  ) THEN
    CREATE POLICY "Members read own-org client assignments"
      ON public.client_members FOR SELECT
      USING (org_id IN (
        SELECT org_id FROM public.members WHERE user_id = auth.uid()
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'client_members'
      AND policyname = 'Admins manage client assignments'
  ) THEN
    CREATE POLICY "Admins manage client assignments"
      ON public.client_members FOR ALL
      USING (org_id IN (
        SELECT org_id FROM public.members
        WHERE user_id = auth.uid()
          AND role IN ('owner', 'admin', 'member')
      ))
      WITH CHECK (org_id IN (
        SELECT org_id FROM public.members
        WHERE user_id = auth.uid()
          AND role IN ('owner', 'admin', 'member')
      ));
  END IF;
END $$;

COMMENT ON TABLE public.client_members IS
  'Scope creatives to specific clients. A creative only sees a client if they have a row here OR are the client.manager_id.';
