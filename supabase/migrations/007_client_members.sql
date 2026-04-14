-- ============================================================================
-- 007: client_members — scoping table for creative & client_viewer roles
-- ============================================================================
-- This table links members to specific clients within an org.
-- Creatives only see clients they are assigned to.
-- Client viewers only see their assigned client(s).
-- Owner/admin/member roles ignore this table (they see everything).

CREATE TABLE IF NOT EXISTS public.client_members (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id     uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id  uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),

  -- Each user can only be assigned to a client once
  UNIQUE (client_id, user_id)
);

-- Indexes for fast lookups
CREATE INDEX idx_client_members_user   ON public.client_members (user_id);
CREATE INDEX idx_client_members_client ON public.client_members (client_id);
CREATE INDEX idx_client_members_org    ON public.client_members (org_id);

-- Enable RLS
ALTER TABLE public.client_members ENABLE ROW LEVEL SECURITY;

-- Org members can see client_members within their org
CREATE POLICY "Org members can view client_members"
  ON public.client_members FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM public.members
      WHERE user_id = auth.uid()
    )
  );

-- Only owner/admin can manage client_members
CREATE POLICY "Admins can manage client_members"
  ON public.client_members FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM public.members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );
