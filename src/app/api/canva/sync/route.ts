import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * POST /api/canva/sync
 * Syncs Canva designs for a client.
 *
 * Accepts either:
 * 1. { client_id, folder_id } — sync from stored connection (uses mock data for now)
 * 2. { client_id, designs: [...] } — directly upsert designs from frontend
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
    const { client_id, designs, folder_id } = body;

    if (!client_id) {
      return NextResponse.json({ error: 'client_id es requerido' }, { status: 400 });
    }

    // Verify client belongs to same org
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', client_id)
      .eq('org_id', member.org_id)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    let designsToUpsert: Array<{
      canva_design_id: string;
      title: string | null;
      thumbnail_url: string | null;
      design_url: string | null;
      page_count: number;
      canva_updated_at: string | null;
    }>;

    if (designs && Array.isArray(designs)) {
      // Mode 2: Directly upsert designs from frontend
      designsToUpsert = designs;
    } else {
      // Mode 1: Sync from stored connection
      // TODO: Replace with real Canva API call using OAuth token
      // For now, generate mock designs to demonstrate the flow
      const connectionFolderId = folder_id;

      if (!connectionFolderId) {
        // Check for existing connection
        const { data: connection } = await supabase
          .from('canva_connections')
          .select('folder_id')
          .eq('client_id', client_id)
          .eq('org_id', member.org_id)
          .single();

        if (!connection) {
          return NextResponse.json(
            { error: 'No hay carpeta de Canva vinculada. Conecta una carpeta primero.' },
            { status: 400 }
          );
        }
      }

      // TODO: Replace with real Canva API call
      // const canvaDesigns = await canvaApi.listFolderItems(connectionFolderId || connection.folder_id);
      const mockDesigns = [
        {
          canva_design_id: `mock_${Date.now()}_1`,
          title: 'Post de Instagram - Promoción',
          thumbnail_url: 'https://placehold.co/400x400/FFB5C8/2A1F1A?text=IG+Post',
          design_url: 'https://www.canva.com/design/mock1/view',
          page_count: 1,
          canva_updated_at: new Date().toISOString(),
        },
        {
          canva_design_id: `mock_${Date.now()}_2`,
          title: 'Carousel Educativo',
          thumbnail_url: 'https://placehold.co/400x400/E8D5FF/2A1F1A?text=Carousel',
          design_url: 'https://www.canva.com/design/mock2/view',
          page_count: 5,
          canva_updated_at: new Date().toISOString(),
        },
        {
          canva_design_id: `mock_${Date.now()}_3`,
          title: 'Story - Lanzamiento',
          thumbnail_url: 'https://placehold.co/400x400/FFD4B8/2A1F1A?text=Story',
          design_url: 'https://www.canva.com/design/mock3/view',
          page_count: 3,
          canva_updated_at: new Date().toISOString(),
        },
        {
          canva_design_id: `mock_${Date.now()}_4`,
          title: 'Reel Cover - Marca',
          thumbnail_url: 'https://placehold.co/400x400/B8E8C8/2A1F1A?text=Reel',
          design_url: 'https://www.canva.com/design/mock4/view',
          page_count: 1,
          canva_updated_at: new Date().toISOString(),
        },
      ];

      designsToUpsert = mockDesigns;
    }

    // Upsert designs into canva_designs table
    const upsertRows = designsToUpsert.map((d) => ({
      org_id: member.org_id,
      client_id,
      canva_design_id: d.canva_design_id,
      title: d.title,
      thumbnail_url: d.thumbnail_url,
      design_url: d.design_url,
      page_count: d.page_count || 1,
      canva_updated_at: d.canva_updated_at,
      synced_at: new Date().toISOString(),
    }));

    const { data: upsertedDesigns, error: upsertError } = await supabase
      .from('canva_designs')
      .upsert(upsertRows, { onConflict: 'org_id,canva_design_id' })
      .select('*, client:clients(name, emoji, color)');

    if (upsertError) throw upsertError;

    // Update last_synced_at on the connection
    await supabase
      .from('canva_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('client_id', client_id)
      .eq('org_id', member.org_id);

    return NextResponse.json({ success: true, data: upsertedDesigns });
  } catch (err: unknown) {
    console.error('Canva sync error:', err);
    return NextResponse.json({ error: 'Error al sincronizar diseños' }, { status: 500 });
  }
}
