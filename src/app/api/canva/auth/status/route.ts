import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCanvaConnectionInfo } from '@/lib/canva-oauth';

/**
 * GET /api/canva/auth/status
 * Returns whether the current member has a Canva token stored, plus
 * basic display info. Used by the Settings UI to toggle Connect/Disconnect.
 */
export async function GET() {
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

    const info = await getCanvaConnectionInfo(member.id);
    const configured = Boolean(
      process.env.CANVA_CLIENT_ID && process.env.CANVA_CLIENT_SECRET,
    );
    return NextResponse.json({
      configured,
      connected: !!info,
      displayName: info?.canva_display_name ?? null,
      canvaUserId: info?.canva_user_id ?? null,
      expiresAt: info?.expires_at ?? null,
      updatedAt: info?.updated_at ?? null,
      scope: info?.scope ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
