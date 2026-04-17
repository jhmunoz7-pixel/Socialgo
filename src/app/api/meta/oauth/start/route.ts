import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const META_PERMISSIONS = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'instagram_basic',
  'instagram_content_publish',
  'business_management',
];

/**
 * GET /api/meta/oauth/start?client_id=xxx
 *
 * One-click "Conectar Facebook/Instagram" flow. Validates the caller,
 * stashes {csrf, clientId} in an HttpOnly cookie, and redirects to the
 * Facebook OAuth dialog. The callback completes the exchange and saves
 * the connection.
 */
export async function GET(req: NextRequest) {
  const appId = process.env.META_APP_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appId || !appUrl) {
    return NextResponse.json(
      { error: 'META_APP_ID o NEXT_PUBLIC_APP_URL no configurados en el servidor' },
      { status: 500 },
    );
  }

  const clientId = req.nextUrl.searchParams.get('client_id');
  if (!clientId) {
    return NextResponse.json({ error: 'Falta client_id' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', appUrl));
  }

  const { data: member } = await supabase
    .from('members')
    .select('org_id')
    .eq('user_id', user.id)
    .single();
  if (!member) {
    return NextResponse.json({ error: 'Sin organización' }, { status: 403 });
  }

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('org_id', member.org_id)
    .single();
  if (!client) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
  }

  const csrf = randomBytes(16).toString('hex');
  const redirectUri = `${appUrl.replace(/\/$/, '')}/api/meta/oauth/callback`;

  const dialogUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth');
  dialogUrl.searchParams.set('client_id', appId);
  dialogUrl.searchParams.set('redirect_uri', redirectUri);
  dialogUrl.searchParams.set('state', csrf);
  dialogUrl.searchParams.set('scope', META_PERMISSIONS.join(','));
  dialogUrl.searchParams.set('response_type', 'code');

  const res = NextResponse.redirect(dialogUrl);
  res.cookies.set('meta_oauth_state', JSON.stringify({ csrf, clientId }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 min
  });
  return res;
}
