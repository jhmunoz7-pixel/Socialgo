import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { buildAuthorizeUrl, getCanvaOAuthConfig } from '@/lib/canva-oauth';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * GET /api/canva/auth/authorize
 *
 * Starts the Canva Connect OAuth flow:
 *   1. Verifies the caller is signed in and belongs to an org.
 *   2. Generates a random `state` value, stores it in an HttpOnly cookie.
 *   3. Redirects to Canva's authorize URL.
 *
 * The callback route will validate the state matches the cookie and then
 * swap the returned code for tokens.
 */
export async function GET() {
  try {
    // Surface missing env config early (and clearly)
    getCanvaOAuthConfig();

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(new URL('/auth/login', process.env.NEXT_PUBLIC_APP_URL));

    const { data: member } = await supabase
      .from('members')
      .select('id, org_id')
      .eq('user_id', user.id)
      .single();
    if (!member) {
      return NextResponse.json({ error: 'Sin organización' }, { status: 403 });
    }

    const state = randomBytes(16).toString('hex');
    const url = buildAuthorizeUrl(state);

    const res = NextResponse.redirect(url);
    res.cookies.set('canva_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600, // 10 min
    });
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[canva oauth authorize]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
