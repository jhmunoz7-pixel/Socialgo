/**
 * Canva Connect API — OAuth helpers (server-only).
 *
 * Flow:
 *   1. UI hits /api/canva/auth/authorize, which redirects the user to
 *      Canva's authorize URL with a random state param cookie.
 *   2. Canva redirects back to /api/canva/auth/callback with ?code=… &state=…
 *   3. The callback exchanges the code at /rest/v1/oauth/token and upserts
 *      the tokens into `canva_oauth_tokens` keyed by member_id.
 *   4. Server routes that need to call the Canva API use
 *      `getValidCanvaAccessToken(memberId)` to get a fresh access token,
 *      refreshing via `/rest/v1/oauth/token` (grant_type=refresh_token) if
 *      the stored one is within REFRESH_SLACK_MS of expiring.
 *
 * All functions here assume the caller has already authenticated the
 * Supabase user and resolved their member row.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';

const CANVA_AUTHORIZE_URL = 'https://www.canva.com/api/oauth/authorize';
const CANVA_TOKEN_URL = 'https://api.canva.com/rest/v1/oauth/token';
const REFRESH_SLACK_MS = 60_000; // refresh if token expires within 60s

export const DEFAULT_CANVA_SCOPES = [
  'design:content:read',
  'asset:read',
  'folder:read',
  'profile:read',
].join(' ');

export interface CanvaTokenRow {
  id: string;
  member_id: string;
  org_id: string;
  access_token: string;
  refresh_token: string | null;
  token_type: string | null;
  scope: string | null;
  expires_at: string | null;
  canva_user_id: string | null;
  canva_display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CanvaTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  scope?: string;
  expires_in?: number;
}

/**
 * Read OAuth client config from env. Throws a descriptive error if any
 * required variable is missing. Callers should catch and surface a 503.
 */
export function getCanvaOAuthConfig() {
  const clientId = process.env.CANVA_CLIENT_ID;
  const clientSecret = process.env.CANVA_CLIENT_SECRET;
  const redirectUri =
    process.env.CANVA_REDIRECT_URI ||
    (process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/api/canva/auth/callback`
      : null);

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'Canva OAuth no está configurado. Define CANVA_CLIENT_ID, CANVA_CLIENT_SECRET y CANVA_REDIRECT_URI (o NEXT_PUBLIC_APP_URL).',
    );
  }

  return { clientId, clientSecret, redirectUri };
}

export function buildAuthorizeUrl(state: string, scopes = DEFAULT_CANVA_SCOPES): string {
  const { clientId, redirectUri } = getCanvaOAuthConfig();
  const url = new URL(CANVA_AUTHORIZE_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', scopes);
  url.searchParams.set('state', state);
  return url.toString();
}

async function postTokenRequest(body: Record<string, string>): Promise<CanvaTokenResponse> {
  const { clientId, clientSecret } = getCanvaOAuthConfig();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(CANVA_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body).toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Canva token exchange failed (${res.status}): ${text}`);
  }
  return (await res.json()) as CanvaTokenResponse;
}

export function exchangeAuthorizationCode(code: string): Promise<CanvaTokenResponse> {
  const { redirectUri } = getCanvaOAuthConfig();
  return postTokenRequest({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });
}

export function refreshAccessToken(refreshToken: string): Promise<CanvaTokenResponse> {
  return postTokenRequest({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
}

/**
 * Persist the token returned from Canva onto a member row, overwriting
 * any previous token (one-per-member). Uses the service role client to
 * bypass RLS — callers must have already verified the member_id.
 */
export async function upsertCanvaToken(
  memberId: string,
  orgId: string,
  token: CanvaTokenResponse,
  extras: { canvaUserId?: string | null; canvaDisplayName?: string | null } = {},
) {
  const supabase = await createServiceRoleClient();
  const expiresAt = token.expires_in
    ? new Date(Date.now() + token.expires_in * 1000).toISOString()
    : null;
  const { error } = await supabase
    .from('canva_oauth_tokens')
    .upsert(
      {
        member_id: memberId,
        org_id: orgId,
        access_token: token.access_token,
        refresh_token: token.refresh_token ?? null,
        token_type: token.token_type ?? 'Bearer',
        scope: token.scope ?? null,
        expires_at: expiresAt,
        canva_user_id: extras.canvaUserId ?? null,
        canva_display_name: extras.canvaDisplayName ?? null,
      },
      { onConflict: 'member_id' },
    );
  if (error) throw error;
}

/**
 * Returns a valid access token for the given member, refreshing if it
 * expires soon. Returns `null` if no token is stored (member never
 * connected Canva or they disconnected).
 */
export async function getValidCanvaAccessToken(memberId: string): Promise<string | null> {
  const supabase = await createServiceRoleClient();
  const { data: row, error } = await supabase
    .from('canva_oauth_tokens')
    .select('*')
    .eq('member_id', memberId)
    .maybeSingle();
  if (error) throw error;
  if (!row) return null;

  const token = row as CanvaTokenRow;
  const expiresAt = token.expires_at ? new Date(token.expires_at).getTime() : 0;
  const isStale = expiresAt - Date.now() < REFRESH_SLACK_MS;
  if (!isStale) return token.access_token;

  // Need a refresh token to recover. If we don't have one, surface null so
  // the caller can prompt the user to reconnect.
  if (!token.refresh_token) return null;

  try {
    const refreshed = await refreshAccessToken(token.refresh_token);
    await upsertCanvaToken(token.member_id, token.org_id, refreshed, {
      canvaUserId: token.canva_user_id,
      canvaDisplayName: token.canva_display_name,
    });
    return refreshed.access_token;
  } catch (err) {
    console.error('[canva-oauth] refresh failed, clearing token:', err);
    await supabase.from('canva_oauth_tokens').delete().eq('member_id', memberId);
    return null;
  }
}

export async function deleteCanvaToken(memberId: string) {
  const supabase = await createServiceRoleClient();
  await supabase.from('canva_oauth_tokens').delete().eq('member_id', memberId);
}

export async function getCanvaConnectionInfo(memberId: string) {
  const supabase = await createServiceRoleClient();
  const { data } = await supabase
    .from('canva_oauth_tokens')
    .select('canva_display_name, canva_user_id, scope, expires_at, updated_at')
    .eq('member_id', memberId)
    .maybeSingle();
  return data as Pick<
    CanvaTokenRow,
    'canva_display_name' | 'canva_user_id' | 'scope' | 'expires_at' | 'updated_at'
  > | null;
}
