-- ============================================================================
-- 008: Fix handle_new_user trigger for invited users
-- ============================================================================
-- When a user is invited via admin.inviteUserByEmail(), their metadata contains
-- invited_org_id and invited_role. The trigger should skip auto-org creation
-- and instead add them to the inviting org with the correct role.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
  org_slug TEXT;
  invited_org UUID;
  invited_role TEXT;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

  -- Check if this is an invited user
  invited_org := (NEW.raw_user_meta_data->>'invited_org_id')::UUID;
  invited_role := COALESCE(NEW.raw_user_meta_data->>'invited_role', 'member');

  IF invited_org IS NOT NULL THEN
    -- Invited user: add to existing org, skip auto-org creation
    INSERT INTO public.members (org_id, user_id, role, full_name)
    VALUES (
      invited_org,
      NEW.id,
      invited_role,
      NEW.raw_user_meta_data->>'full_name'
    )
    ON CONFLICT (org_id, user_id) DO NOTHING;
  ELSE
    -- Regular signup: create org + owner membership
    org_slug := LOWER(REPLACE(SPLIT_PART(NEW.email, '@', 1), '.', '-'))
                || '-' || SUBSTR(gen_random_uuid()::TEXT, 1, 6);

    INSERT INTO public.organizations (name, slug, email)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'company', 'Mi Agencia'),
      org_slug,
      NEW.email
    )
    RETURNING id INTO new_org_id;

    INSERT INTO public.members (org_id, user_id, role, full_name)
    VALUES (
      new_org_id,
      NEW.id,
      'owner',
      NEW.raw_user_meta_data->>'full_name'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
