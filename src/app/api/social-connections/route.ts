import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { validateToken } from '@/lib/meta-api';

/**
 * GET /api/social-connections?client_id=xxx
 * Returns all connections for the current org, optionally filtered by client_id.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data: member } = await supabase
      .from('members')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!member) return NextResponse.json({ error: 'Sin organización' }, { status: 403 });

    const clientId = req.nextUrl.searchParams.get('client_id');

    let query = supabase
      .from('social_connections')
      .select('*')
      .eq('org_id', member.org_id)
      .order('created_at', { ascending: false });

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Strip access_token from response for security (only show last 8 chars)
    const sanitized = (data || []).map((c) => ({
      ...c,
      access_token: c.access_token ? `...${c.access_token.slice(-8)}` : '',
    }));

    return NextResponse.json({ success: true, data: sanitized });
  } catch (err: unknown) {
    console.error('Social connections GET error:', err);
    return NextResponse.json({ error: 'Error al obtener conexiones' }, { status: 500 });
  }
}

/**
 * POST /api/social-connections
 * Creates or updates a social connection.
 * Body: { client_id, platform, access_token, page_id, page_name }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data: member } = await supabase
      .from('members')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!member) return NextResponse.json({ error: 'Sin organización' }, { status: 403 });
    if (!['owner', 'admin', 'member'].includes(member.role)) {
      return NextResponse.json({ error: 'No tienes permisos para gestionar conexiones' }, { status: 403 });
    }

    const body = await req.json();
    const { client_id, platform, access_token, page_id, page_name } = body;

    if (!client_id || !platform || !access_token) {
      return NextResponse.json({ error: 'Se requieren client_id, platform y access_token' }, { status: 400 });
    }

    if (!['instagram', 'facebook'].includes(platform)) {
      return NextResponse.json({ error: 'Plataforma no soportada. Use instagram o facebook.' }, { status: 400 });
    }

    // Validate the client belongs to this org
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('id', client_id)
      .eq('org_id', member.org_id)
      .single();

    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Validate token with Meta API
    const tokenValid = await validateToken(access_token);

    // Upsert connection (unique on client_id + platform)
    const { data, error } = await supabase
      .from('social_connections')
      .upsert(
        {
          org_id: member.org_id,
          client_id,
          platform,
          access_token,
          page_id: page_id || null,
          page_name: page_name || null,
          token_expires_at: null, // User can set this manually or we detect from Meta response
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'client_id,platform' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
      token_valid: tokenValid,
      message: tokenValid
        ? 'Conexión guardada y token validado correctamente'
        : 'Conexión guardada, pero el token no pudo ser validado. Verifica tus credenciales.',
    });
  } catch (err: unknown) {
    console.error('Social connections POST error:', err);
    return NextResponse.json({ error: 'Error al guardar conexión' }, { status: 500 });
  }
}

/**
 * DELETE /api/social-connections
 * Removes a social connection.
 * Body: { id }
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data: member } = await supabase
      .from('members')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!member) return NextResponse.json({ error: 'Sin organización' }, { status: 403 });
    if (!['owner', 'admin', 'member'].includes(member.role)) {
      return NextResponse.json({ error: 'No tienes permisos para eliminar conexiones' }, { status: 403 });
    }

    const body = await req.json();
    const { id } = body;

    if (!id) return NextResponse.json({ error: 'Se requiere id' }, { status: 400 });

    const { error } = await supabase
      .from('social_connections')
      .delete()
      .eq('id', id)
      .eq('org_id', member.org_id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Conexión eliminada' });
  } catch (err: unknown) {
    console.error('Social connections DELETE error:', err);
    return NextResponse.json({ error: 'Error al eliminar conexión' }, { status: 500 });
  }
}
