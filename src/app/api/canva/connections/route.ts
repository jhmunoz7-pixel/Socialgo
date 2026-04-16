import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * GET /api/canva/connections?client_id=xxx
 * Returns all Canva folder connections for the current org.
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
      .from('canva_connections')
      .select('*')
      .eq('org_id', member.org_id)
      .order('created_at', { ascending: false });

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err: unknown) {
    console.error('Canva connections GET error:', err);
    return NextResponse.json({ error: 'Error al obtener conexiones' }, { status: 500 });
  }
}

/**
 * POST /api/canva/connections
 * Creates or updates a Canva folder connection.
 * Body: { client_id, folder_id, folder_name }
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

    // Only admin/creative roles can manage connections
    if (!['owner', 'admin', 'member', 'creative'].includes(member.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const body = await req.json();
    const { client_id, folder_id, folder_name } = body;

    if (!client_id || !folder_id) {
      return NextResponse.json(
        { error: 'client_id y folder_id son requeridos' },
        { status: 400 }
      );
    }

    // Verify client belongs to same org
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('id', client_id)
      .eq('org_id', member.org_id)
      .single();

    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('canva_connections')
      .upsert(
        {
          org_id: member.org_id,
          client_id,
          folder_id,
          folder_name: folder_name || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'client_id,folder_id' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    console.error('Canva connections POST error:', err);
    return NextResponse.json({ error: 'Error al crear conexión' }, { status: 500 });
  }
}

/**
 * DELETE /api/canva/connections
 * Removes a Canva folder connection.
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

    if (!['owner', 'admin', 'member', 'creative'].includes(member.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'id es requerido' }, { status: 400 });
    }

    const { error } = await supabase
      .from('canva_connections')
      .delete()
      .eq('id', id)
      .eq('org_id', member.org_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Canva connections DELETE error:', err);
    return NextResponse.json({ error: 'Error al eliminar conexión' }, { status: 500 });
  }
}
