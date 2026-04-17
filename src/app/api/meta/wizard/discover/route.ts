import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import {
  discoverPages,
  exchangeForLongLivedUserToken,
  getUserName,
} from '@/lib/meta-oauth';

/**
 * POST /api/meta/wizard/discover
 *
 * Body: { token: string }   // short-lived or long-lived user token
 *
 * Takes a User Access Token (from Graph API Explorer, "Get Token → Get
 * User Access Token"), optionally swaps it for a long-lived one if the
 * server has META_APP_ID + META_APP_SECRET, and lists the user's
 * Facebook Pages — flagging which ones have Instagram Business Accounts
 * linked so the UI can show "Boxo Café — @boxocafe ✓" and let the user
 * pick.
 *
 * The token never leaves the server beyond the mirrored Page Access
 * Tokens we return (those are what ConnectionSetup has always stored).
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const rl = rateLimit({ name: 'meta-wizard-discover', limit: 10, windowSeconds: 60 }, user.id);
    if (!rl.success) {
      return NextResponse.json({ error: 'Demasiadas solicitudes, espera un momento.' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === 'string' ? body.token.trim() : '';
    if (!token) {
      return NextResponse.json({ error: 'Falta el token' }, { status: 400 });
    }

    // Step 1 — try to upgrade to a long-lived token (silently falls back).
    const { token: workingToken, expires_at: longLivedExpiresAt, used_app_secret } =
      await exchangeForLongLivedUserToken(token);

    // Step 2 — fetch user name (best-effort) + pages in parallel.
    const [userName, pages] = await Promise.all([
      getUserName(workingToken),
      discoverPages(workingToken),
    ]);

    return NextResponse.json({
      ok: true,
      user_name: userName,
      long_lived_token: workingToken,
      long_lived_expires_at: longLivedExpiresAt,
      used_app_secret,
      pages,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[meta wizard discover]', message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
