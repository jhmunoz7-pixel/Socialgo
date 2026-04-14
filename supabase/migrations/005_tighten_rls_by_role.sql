-- Tighten RLS write policies to enforce role-based access.
-- Previously any org member could INSERT/UPDATE/DELETE on all tables.
-- Now only appropriate roles can write.

-- ======================== Posts: restrict write by role ========================

-- Drop the overly permissive "Members can manage posts" policy
DROP POLICY IF EXISTS "Members can manage posts" ON public.posts;

-- Owner, admin, member, creative can INSERT posts
CREATE POLICY "Authorized roles can insert posts"
  ON public.posts FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'member', 'creative')
    )
  );

-- Owner, admin, member, creative can UPDATE posts
CREATE POLICY "Authorized roles can update posts"
  ON public.posts FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM public.members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'member', 'creative')
    )
  );

-- Only owner, admin, member can DELETE posts
CREATE POLICY "Authorized roles can delete posts"
  ON public.posts FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM public.members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'member')
    )
  );

-- ======================== Clients: restrict write by role ========================

-- The existing "Admins can manage clients" already restricts to owner/admin/member.
-- No change needed for clients.

-- ======================== Packages: already restricted ========================
-- Existing policy limits to owner/admin. OK.

-- ======================== Assets: restrict write by role ========================

DROP POLICY IF EXISTS "Members can manage assets" ON public.assets;

CREATE POLICY "Authorized roles can manage assets"
  ON public.assets FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM public.members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'member', 'creative')
    )
  );

-- ======================== Brand Kits: restrict write by role ========================

DROP POLICY IF EXISTS "Members can manage brand kits" ON public.brand_kits;

CREATE POLICY "Authorized roles can manage brand kits"
  ON public.brand_kits FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM public.members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'member', 'creative')
    )
  );

-- ======================== Content Weeks: restrict write by role ========================

DROP POLICY IF EXISTS "Members can manage content weeks" ON public.content_weeks;

CREATE POLICY "Authorized roles can manage content weeks"
  ON public.content_weeks FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM public.members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'member')
    )
  );
