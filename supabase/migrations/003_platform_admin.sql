-- Platform Admin (Fase 2) — admin-only overrides on organizations + audit log.
-- Safe to re-run: all statements idempotent.

-- 1. Extra columns on organizations for admin use
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- 2. Audit log — every platform-admin mutation writes a row here
CREATE TABLE IF NOT EXISTS public.platform_actions_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_email TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'change_plan', 'change_status', 'extend_trial', 'update_notes'
  )),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS platform_actions_log_org_id_idx
  ON public.platform_actions_log(org_id, created_at DESC);

ALTER TABLE public.platform_actions_log ENABLE ROW LEVEL SECURITY;

-- Only service role reads/writes this table. No client ever touches it.
CREATE POLICY "Service role manages platform_actions_log"
  ON public.platform_actions_log FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
