-- Fix: approval token RLS policy was too permissive.
-- Old policy allowed ANY authenticated user to read ANY post with a non-null
-- approval_token. New policy restricts to anonymous/public access only,
-- which is the intended use case (client reviews via shared link).

DROP POLICY IF EXISTS "Public can view posts by approval token" ON public.posts;

-- Allow unauthenticated (anon) users to read a single post by its token.
-- Authenticated users already have org-scoped read access via the
-- "Members can view posts" policy, so they don't need this.
CREATE POLICY "Anon can view posts by approval token"
  ON public.posts FOR SELECT
  USING (
    approval_token IS NOT NULL
    AND auth.role() = 'anon'
  );
