import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { notifyPostEvent, PostEventType } from '@/lib/notifications';
import { Post, Client } from '@/types';

const VALID_EVENTS: PostEventType[] = [
  'created',
  'approved',
  'rejected',
  'moved_to_review',
  'published',
];

/**
 * POST /api/notifications/post-event
 * Triggers a notification for a post workflow event.
 * Called from the frontend after successful post actions.
 * Auth required.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { data: member } = await supabase
      .from('members')
      .select('org_id')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'Sin organizacion' }, { status: 403 });
    }

    const body = await req.json();
    const { post_id, event_type } = body;

    if (!post_id || typeof post_id !== 'string') {
      return NextResponse.json({ error: 'Se requiere post_id' }, { status: 400 });
    }

    if (!event_type || !VALID_EVENTS.includes(event_type as PostEventType)) {
      return NextResponse.json(
        { error: `event_type invalido. Valores validos: ${VALID_EVENTS.join(', ')}` },
        { status: 400 }
      );
    }

    // Fetch the post and its client
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', post_id)
      .eq('org_id', member.org_id)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 });
    }

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', post.client_id)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Fire and forget — don't block the response
    notifyPostEvent(
      member.org_id,
      event_type as PostEventType,
      post as Post,
      client as Client
    ).catch(() => {
      // Silently ignore notification failures
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Post event notification error:', err);
    return NextResponse.json(
      { error: 'Error al enviar notificacion' },
      { status: 500 }
    );
  }
}
