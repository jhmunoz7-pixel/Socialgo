/**
 * Notification dispatcher
 * Fetches org webhook config and sends notifications to configured channels.
 * Fire and forget — does not throw or block the caller.
 */

import { Post, Client } from '@/types';
import { sendSlackNotification, formatSlackPostBlock } from '@/lib/slack';
import { createServiceRoleClient } from '@/lib/supabase/server';

export type PostEventType =
  | 'created'
  | 'approved'
  | 'rejected'
  | 'moved_to_review'
  | 'published';

/**
 * Sends a notification for a post event.
 * Fetches the org's Slack webhook URL and sends a formatted message.
 * Fire and forget — never throws.
 */
export async function notifyPostEvent(
  orgId: string,
  event: PostEventType,
  post: Post,
  client: Client
): Promise<void> {
  try {
    const supabase = await createServiceRoleClient();

    const { data: org, error } = await supabase
      .from('organizations')
      .select('slack_webhook_url')
      .eq('id', orgId)
      .single();

    if (error || !org?.slack_webhook_url) return;

    const message = formatSlackPostBlock(post, client, event);
    // Fire and forget — don't await
    sendSlackNotification(org.slack_webhook_url, message).catch(() => {
      // Silently ignore — notification failures should never break the app
    });
  } catch (err) {
    console.error('[Notifications] Error dispatching post event:', err);
  }
}
