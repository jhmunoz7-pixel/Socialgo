import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * POST /api/canva/assign
 * Assigns a Canva design to a SocialGo post.
 * Body: { canva_design_id: string, post_id: string }
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
    const { canva_design_id, post_id } = body;

    if (!canva_design_id || !post_id) {
      return NextResponse.json(
        { error: 'canva_design_id y post_id son requeridos' },
        { status: 400 }
      );
    }

    // Verify canva design belongs to same org
    const { data: design, error: designError } = await supabase
      .from('canva_designs')
      .select('*')
      .eq('id', canva_design_id)
      .eq('org_id', member.org_id)
      .single();

    if (designError || !design) {
      return NextResponse.json({ error: 'Diseño no encontrado' }, { status: 404 });
    }

    // Verify post belongs to same org
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', post_id)
      .eq('org_id', member.org_id)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 });
    }

    // Update canva_designs: set linked_post_id and status
    const { error: updateDesignError } = await supabase
      .from('canva_designs')
      .update({
        linked_post_id: post_id,
        status: 'assigned',
      })
      .eq('id', canva_design_id);

    if (updateDesignError) throw updateDesignError;

    // Update the post: set image_url from thumbnail and move to in_production
    const postUpdate: Record<string, unknown> = {
      status: 'in_production',
    };

    if (design.thumbnail_url) {
      postUpdate.image_url = design.thumbnail_url;
    }

    const { error: updatePostError } = await supabase
      .from('posts')
      .update(postUpdate)
      .eq('id', post_id);

    if (updatePostError) throw updatePostError;

    return NextResponse.json({ success: true, message: 'Diseño asignado al post' });
  } catch (err: unknown) {
    console.error('Canva assign error:', err);
    return NextResponse.json({ error: 'Error al asignar diseño' }, { status: 500 });
  }
}
