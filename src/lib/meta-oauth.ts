/**
 * Meta Graph API OAuth helpers for the "connect Meta" wizard.
 *
 * The flow we support is the paste-a-token path (no registered Meta App
 * redirect URI needed):
 *
 *   1. User pastes a short-lived User Access Token from Graph API Explorer.
 *   2. We optionally exchange it for a long-lived one if META_APP_ID +
 *      META_APP_SECRET are configured server-side.
 *   3. We call /me/accounts to list the Facebook Pages the user manages —
 *      the response includes a Page Access Token per page.
 *   4. For each page we call /{pageId}?fields=instagram_business_account
 *      so we can show the user which of their pages has an IG connected.
 *   5. User picks the right page → we save the Page Access Token + IG
 *      Business Account ID as a social_connections row.
 */

const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';

export interface DiscoveredPage {
  page_id: string;
  page_name: string;
  page_access_token: string;
  /** Present only if the Page has an Instagram Business Account linked. */
  ig_business_account_id: string | null;
  ig_username: string | null;
  category: string | null;
}

export interface DiscoverResult {
  user_name: string | null;
  long_lived_token: string | null;
  long_lived_expires_at: string | null;
  used_app_secret: boolean;
  pages: DiscoveredPage[];
}

interface MetaError {
  error?: { message?: string; type?: string; code?: number };
}

async function metaFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${META_GRAPH_URL}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { cache: 'no-store' });
  const json = (await res.json()) as T & MetaError;
  if ((json as MetaError).error) {
    throw new Error(
      `Meta API: ${(json as MetaError).error?.message || 'unknown error'}`,
    );
  }
  return json as T;
}

/**
 * Exchange a short-lived user token (1-2h) for a long-lived one (~60 days).
 * Requires a Meta App with `client_id` + `client_secret` configured as env
 * vars. If either is missing we skip and the caller falls back to the
 * short-lived token.
 */
export async function exchangeForLongLivedUserToken(
  shortToken: string,
): Promise<{ token: string; expires_at: string | null; used_app_secret: boolean }> {
  const clientId = process.env.META_APP_ID;
  const clientSecret = process.env.META_APP_SECRET;
  if (!clientId || !clientSecret) {
    return { token: shortToken, expires_at: null, used_app_secret: false };
  }
  const data = await metaFetch<{ access_token?: string; expires_in?: number }>(
    '/oauth/access_token',
    {
      grant_type: 'fb_exchange_token',
      client_id: clientId,
      client_secret: clientSecret,
      fb_exchange_token: shortToken,
    },
  );
  const expiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000).toISOString()
    : null;
  return {
    token: data.access_token || shortToken,
    expires_at: expiresAt,
    used_app_secret: true,
  };
}

/**
 * List the user's pages (with page access tokens) and mark which ones have
 * an Instagram Business Account linked.
 */
export async function discoverPages(userToken: string): Promise<DiscoveredPage[]> {
  const accounts = await metaFetch<{
    data?: Array<{
      id: string;
      name: string;
      access_token: string;
      category?: string;
    }>;
  }>('/me/accounts', { access_token: userToken, fields: 'id,name,access_token,category', limit: '50' });

  const pages = accounts.data ?? [];
  const enriched = await Promise.all(
    pages.map(async (page) => {
      try {
        const igLookup = await metaFetch<{
          instagram_business_account?: { id?: string; username?: string };
        }>(`/${page.id}`, {
          access_token: page.access_token,
          fields: 'instagram_business_account{id,username}',
        });
        return {
          page_id: page.id,
          page_name: page.name,
          page_access_token: page.access_token,
          ig_business_account_id: igLookup.instagram_business_account?.id ?? null,
          ig_username: igLookup.instagram_business_account?.username ?? null,
          category: page.category ?? null,
        } satisfies DiscoveredPage;
      } catch {
        // Missing permissions or IG not linked — still include the page.
        return {
          page_id: page.id,
          page_name: page.name,
          page_access_token: page.access_token,
          ig_business_account_id: null,
          ig_username: null,
          category: page.category ?? null,
        } satisfies DiscoveredPage;
      }
    }),
  );
  return enriched;
}

/** Optional nicety — returns the Meta user's name so the UI can say "Hola Jorge". */
export async function getUserName(token: string): Promise<string | null> {
  try {
    const me = await metaFetch<{ name?: string }>('/me', {
      access_token: token,
      fields: 'name',
    });
    return me.name ?? null;
  } catch {
    return null;
  }
}
