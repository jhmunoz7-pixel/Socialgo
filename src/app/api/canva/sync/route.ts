import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * POST /api/canva/sync
 * Add Canva designs to a client's WIP board.
 *
 * Accepts:
 * { client_id, designs: [{ canva_design_id, title?, thumbnail_url?, page_count? }] }
 *
 * When only canva_design_id is provided, we construct the Canva URL automatically.
 * Title and thumbnail can be updated later when the real Canva API is connected.
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

    const body = await req.json();
    const { client_id, designs } = body;

    if (!client_id) {
      return NextResponse.json({ error: 'client_id es requerido' }, { status: 400 });
    }

    if (!designs || !Array.isArray(designs) || designs.length === 0) {
      return NextResponse.json({ error: 'Se requiere al menos un diseño' }, { status: 400 });
    }

    // Verify client belongs to same org
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name')
      .eq('id', client_id)
      .eq('org_id', member.org_id)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    type PageInput = { page_number: number; thumbnail_url?: string | null };
    type DesignInput = {
      canva_design_id: string;
      title?: string;
      thumbnail_url?: string;
      page_count?: number;
      pages?: PageInput[];
    };

    // Build upsert rows — construct Canva URL from design ID
    const upsertRows = (designs as DesignInput[]).map((d) => {
      const designId = d.canva_design_id;
      // Normalize pages: drop invalid entries, enforce shape, derive page_count if missing
      const normalizedPages = (d.pages || [])
        .filter((p) => Number.isInteger(p?.page_number) && p.page_number >= 1)
        .map((p) => ({
          page_number: p.page_number,
          thumbnail_url: p.thumbnail_url || null,
        }));
      return {
        org_id: member.org_id,
        client_id,
        canva_design_id: designId,
        title: d.title || `Diseño ${designId.slice(0, 8)}...`,
        thumbnail_url: d.thumbnail_url || null,
        design_url: `https://www.canva.com/design/${designId}/view`,
        page_count: d.page_count || normalizedPages.length || 1,
        pages: normalizedPages,
        canva_updated_at: new Date().toISOString(),
        synced_at: new Date().toISOString(),
      };
    });

    const { data: upsertedDesigns, error: upsertError } = await supabase
      .from('canva_designs')
      .upsert(upsertRows, { onConflict: 'org_id,canva_design_id' })
      .select('*, client:clients(name, emoji, color)');

    if (upsertError) throw upsertError;

    return NextResponse.json({ success: true, data: upsertedDesigns });
  } catch (err: unknown) {
    console.error('Canva sync error:', err);
    return NextResponse.json({ error: 'Error al agregar diseño' }, { status: 500 });
  }
}
