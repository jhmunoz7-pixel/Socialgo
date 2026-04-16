-- Add Slack webhook URL column to organizations for notifications
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS slack_webhook_url TEXT;
