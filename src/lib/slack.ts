/**
 * Slack webhook notification utilities
 * Fire-and-forget pattern — never throws, returns boolean success
 */

import { Post, Client, Platform } from '@/types';

export interface SlackMessage {
  text: string;
  blocks?: Record<string, unknown>[];
}

/**
 * Sends a Slack notification via incoming webhook.
 * Returns true on success, false on failure (fire and forget).
 */
export async function sendSlackNotification(
  webhookUrl: string,
  message: SlackMessage
): Promise<boolean> {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    return res.ok;
  } catch (err) {
    console.error('[Slack] Error sending notification:', err);
    return false;
  }
}

const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  twitter: 'Twitter',
  youtube: 'YouTube',
};

const ACTION_LABELS: Record<string, string> = {
  created: 'Nuevo post creado',
  approved: 'Post aprobado',
  rejected: 'Post rechazado',
  moved_to_review: 'Post movido a revision',
  published: 'Post publicado',
};

const ACTION_EMOJI: Record<string, string> = {
  created: ':pencil2:',
  approved: ':white_check_mark:',
  rejected: ':x:',
  moved_to_review: ':eyes:',
  published: ':rocket:',
};

/**
 * Formats a rich Slack Block Kit message for post events.
 */
export function formatSlackPostBlock(
  post: Post,
  client: Client,
  action: string
): SlackMessage {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://socialgo-one.vercel.app';
  const actionLabel = ACTION_LABELS[action] || action;
  const emoji = ACTION_EMOJI[action] || ':bell:';
  const platformLabel = PLATFORM_LABELS[post.platform] || post.platform;
  const postName = post.name || 'Sin titulo';
  const scheduledDate = post.scheduled_date
    ? new Date(post.scheduled_date).toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Sin fecha';

  const dashboardLink = `${appUrl}/dashboard/contenido`;

  const text = `${emoji} ${actionLabel}: "${postName}" para ${client.name} (${platformLabel})`;

  return {
    text,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${actionLabel}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Post:*\n${postName}`,
          },
          {
            type: 'mrkdwn',
            text: `*Cliente:*\n${client.name}`,
          },
          {
            type: 'mrkdwn',
            text: `*Plataforma:*\n${platformLabel}`,
          },
          {
            type: 'mrkdwn',
            text: `*Fecha programada:*\n${scheduledDate}`,
          },
        ],
      },
      ...(post.copy
        ? [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Copy:*\n${post.copy.length > 200 ? post.copy.slice(0, 200) + '...' : post.copy}`,
              },
            },
          ]
        : []),
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Ver en SocialGo',
              emoji: true,
            },
            url: dashboardLink,
            style: 'primary',
          },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `SocialGo | ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}`,
          },
        ],
      },
    ],
  };
}
