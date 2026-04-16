-- ============================================================
-- Migration 007: Client Approval Portal
-- Adds token lifecycle columns and an RPC function for safe
-- anonymous approval (SECURITY DEFINER avoids anon UPDATE RLS).
-- ============================================================

-- 1. Token lifecycle columns
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS approval_token_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_token_expires_at TIMESTAMPTZ;

-- 2. Allow anon users to read comments on posts they can view via token
CREATE POLICY "Anon can view comments on posts by approval_token"
  ON public.post_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.posts
      WHERE posts.id = post_comments.post_id
        AND posts.approval_token IS NOT NULL
    )
    AND auth.role() = 'anon'
  );

-- 3. Allow anon users to insert comments on posts they can view via token
CREATE POLICY "Anon can comment on posts by approval_token"
  ON public.post_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.posts
      WHERE posts.id = post_comments.post_id
        AND posts.approval_token IS NOT NULL
    )
    AND auth.role() = 'anon'
  );

-- 4. Secure RPC function for approving posts via token
--    Uses SECURITY DEFINER so anon only needs SELECT on posts.
CREATE OR REPLACE FUNCTION public.approve_post_by_token(
  p_token TEXT,
  p_status TEXT,
  p_comments TEXT DEFAULT NULL,
  p_approved_by TEXT DEFAULT 'Cliente'
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_status NOT IN ('approved', 'approved_with_changes', 'rejected') THEN
    RAISE EXCEPTION 'Invalid approval status: %', p_status;
  END IF;

  UPDATE public.posts
  SET
    approval_status = p_status,
    approval_comments = COALESCE(p_comments, approval_comments),
    approved_at = NOW(),
    approved_by = p_approved_by,
    status = CASE WHEN p_status = 'approved' THEN 'published' ELSE status END,
    updated_at = NOW()
  WHERE approval_token = p_token
    AND approval_token IS NOT NULL
    AND (approval_token_expires_at IS NULL OR approval_token_expires_at > NOW());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Token inválido o expirado';
  END IF;
END;
$$;
