import { NextRequest, NextResponse } from 'next/server';
import { exchangeAuthorizationCode, upsertCanvaToken } from '@/lib/canva-oauth';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const SETTINGS_URL_BASE = '/dashboard/settings?tab=integraciones';

function redirectWith(params: Record<string, string>) {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = new URL(SETTINGS_URL_BASE, base);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return NextResponse.redirect(url);
}

/**
 * GET /api/canva/auth/callback?code=…&state=…
 *
 * Final step of the Canva OAuth flow. Validates the `state` cookie, swaps
 * the code for tokens, tries to fetch the Canva user profile for display
 * purposes, and upserts everything into `canva_oauth_tokens` for the
 * current member. Then redirects to Settings → Integraciones with a
 * success or error flag.
 */
export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const canvaError = url.searchParams.get('error');

    if (canvaError) {
      return redirectWith({ canva: 'error', reason: canvaError });
    }
    if (!code || !state) {
      return redirectWith({ canva: 'error', reason: 'missing_code_or_state' });
    }

    const cookieState = req.cookies.get('canva_oauth_state')?.value;
    if (!cookieState || cookieState !== state) {
      return redirectWith({ canva: 'error', reason: 'state_mismatch' });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirectWith({ canva: 'error', reason: 'not_authenticated' });

    const { data: member } = await supabase
      .from('members')
      .select('id, org_id')
      .eq('user_id', user.id)
      .single();
    if (!member) return redirectWith({ canva: 'error', reason: 'no_member' });

    // Exchange the authorization code for tokens
    const tokens = await exchangeAuthorizationCode(code);

    // Best-effort: fetch Canva user profile for display
    let canvaUserId: string | null = null;
    let canvaDisplayName: string | null = null;
    try {
      const profileRes = await fetch('https://api.canva.com/rest/v1/users/me', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (profileRes.ok) {
        const profile = (await profileRes.json()) as { user?: { id?: string; display_name?: string } };
        canvaUserId = profile.user?.id ?? null;
        canvaDisplayName = profile.user?.display_name ?? null;
      }
    } catch (profileErr) {
      // Non-fatal; we can still use the token without profile info.
      console.warn('[canva oauth callback] profile fetch failed:', profileErr);
    }

    await upsertCanvaToken(member.id, member.org_id, tokens, {
      canvaUserId,
      canvaDisplayName,
    });

    const res = redirectWith({ canva: 'connected' });
    // Clear the state cookie once consumed
    res.cookies.set('canva_oauth_state', '', { path: '/', maxAge: 0 });
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[canva oauth callback]', message);
    return redirectWith({ canva: 'error', reason: 'exception' });
  }
}
