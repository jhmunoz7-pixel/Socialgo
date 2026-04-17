import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  discoverPages,
  exchangeForLongLivedUserToken,
} from '@/lib/meta-oauth';

const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';

function redirectBack(appUrl: string, clientId: string | null, params: Record<string, string>) {
  const path = clientId
    ? `/dashboard/clients/${clientId}?tab=publishing`
    : '/dashboard/home';
  const url = new URL(path, appUrl);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = NextResponse.redirect(url);
  res.cookies.set('meta_oauth_state', '', { path: '/', maxAge: 0 });
  return res;
}

/**
 * GET /api/meta/oauth/callback?code=…&state=…
 *
 * Completes the "Conectar Facebook" flow:
 *   1. Validates the state cookie.
 *   2. Exchanges the code for a user token, then extends to 60 days.
 *   3. Discovers the user's Pages + their linked IG Business Accounts.
 *   4. Auto-saves the first Page (IG if present, plus FB) as social_connections
 *      rows for the pending client_id.
 *   5. Redirects back to the client's publishing tab with a status flag.
 */
export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  const cookieRaw = req.cookies.get('meta_oauth_state')?.value;
  let cookieState: { csrf: string; clientId: string } | null = null;
  try {
    cookieState = cookieRaw ? JSON.parse(cookieRaw) : null;
  } catch {
    cookieState = null;
  }
  const clientId = cookieState?.clientId ?? null;

  try {
    const url = req.nextUrl;
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const metaError = url.searchParams.get('error');
    const metaErrorReason = url.searchParams.get('error_reason');

    if (metaError) {
      return redirectBack(appUrl, clientId, {
        meta_oauth: 'error',
        reason: metaErrorReason || metaError,
      });
    }
    if (!code || !state) {
      return redirectBack(appUrl, clientId, { meta_oauth: 'error', reason: 'missing_code_or_state' });
    }
    if (!cookieState || cookieState.csrf !== state) {
      return redirectBack(appUrl, clientId, { meta_oauth: 'error', reason: 'state_mismatch' });
    }
    if (!appId || !appSecret) {
      return redirectBack(appUrl, clientId, { meta_oauth: 'error', reason: 'server_not_configured' });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return redirectBack(appUrl, clientId, { meta_oauth: 'error', reason: 'not_authenticated' });
    }

    const { data: member } = await supabase
      .from('members')
      .select('id, org_id')
      .eq('user_id', user.id)
      .single();
    if (!member) {
      return redirectBack(appUrl, clientId, { meta_oauth: 'error', reason: 'no_member' });
    }

    // Verify the pending client belongs to the caller's org
    const { data: clientRow } = await supabase
      .from('clients')
      .select('id')
      .eq('id', cookieState.clientId)
      .eq('org_id', member.org_id)
      .single();
    if (!clientRow) {
      return redirectBack(appUrl, clientId, { meta_oauth: 'error', reason: 'client_not_found' });
    }

    // Step 1 — code → short-lived user token
    const redirectUri = `${appUrl.replace(/\/$/, '')}/api/meta/oauth/callback`;
    const tokenRes = await fetch(
      `${META_GRAPH_URL}/oauth/access_token?` +
        new URLSearchParams({
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: redirectUri,
          code,
        }).toString(),
      { cache: 'no-store' },
    );
    const tokenJson = (await tokenRes.json()) as {
      access_token?: string;
      error?: { message?: string };
    };
    if (!tokenJson.access_token) {
      return redirectBack(appUrl, clientId, {
        meta_oauth: 'error',
        reason: tokenJson.error?.message || 'token_exchange_failed',
      });
    }

    // Step 2 — extend to ~60 days
    const { token: longLivedToken, expires_at } = await exchangeForLongLivedUserToken(
      tokenJson.access_token,
    );

    // Step 3 — discover pages and their IGs
    const pages = await discoverPages(longLivedToken);
    if (pages.length === 0) {
      return redirectBack(appUrl, clientId, {
        meta_oauth: 'error',
        reason: 'no_pages_found',
      });
    }

    // Step 4 — auto-save the first page (IG if any has one, else first page)
    const pageWithIg = pages.find((p) => p.ig_business_account_id) ?? pages[0];

    const rows: Array<{
      org_id: string;
      client_id: string;
      platform: 'instagram' | 'facebook';
      access_token: string;
      page_id: string;
      page_name: string;
      token_expires_at: string | null;
    }> = [];

    if (pageWithIg.ig_business_account_id) {
      rows.push({
        org_id: member.org_id,
        client_id: cookieState.clientId,
        platform: 'instagram',
        access_token: pageWithIg.page_access_token,
        page_id: pageWithIg.ig_business_account_id,
        page_name: `${pageWithIg.page_name}${pageWithIg.ig_username ? ` · @${pageWithIg.ig_username}` : ''}`,
        token_expires_at: expires_at,
      });
    }
    rows.push({
      org_id: member.org_id,
      client_id: cookieState.clientId,
      platform: 'facebook',
      access_token: pageWithIg.page_access_token,
      page_id: pageWithIg.page_id,
      page_name: pageWithIg.page_name,
      token_expires_at: expires_at,
    });

    for (const row of rows) {
      const { error: upsertError } = await supabase
        .from('social_connections')
        .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'client_id,platform' });
      if (upsertError) {
        return redirectBack(appUrl, clientId, {
          meta_oauth: 'error',
          reason: `save_failed_${row.platform}`,
        });
      }
    }

    return redirectBack(appUrl, clientId, {
      meta_oauth: 'success',
      page: pageWithIg.page_name,
      has_ig: pageWithIg.ig_business_account_id ? '1' : '0',
      pages_count: String(pages.length),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[meta oauth callback]', message);
    return redirectBack(appUrl, clientId, { meta_oauth: 'error', reason: 'exception' });
  }
}
