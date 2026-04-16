import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { deleteCanvaToken } from '@/lib/canva-oauth';

/**
 * POST /api/canva/auth/disconnect
 * Removes the Canva OAuth token for the current member. Silent if no
 * token exists. Does not revoke the token on Canva's side — the access
 * token just stops being used.
 */
export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data: member } = await supabase
      .from('members')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (!member) return NextResponse.json({ error: 'Sin organización' }, { status: 403 });

    await deleteCanvaToken(member.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
