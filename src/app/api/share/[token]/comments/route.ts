import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit } from '@/lib/rate-limit';

const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const supabaseAdmin = getAdmin();

    // Find the post by token
    const { data: post, error: postErr } = await supabaseAdmin
      .from('posts')
      .select('id')
      .eq('approval_token', token)
      .single();

    if (postErr || !post) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 404 });
    }

    const { data: comments } = await supabaseAdmin
      .from('post_comments')
      .select('*')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });

    return NextResponse.json({ success: true, comments: comments || [] });
  } catch (err: unknown) {
    console.error('Share comments GET error:', err);
    return NextResponse.json({ error: 'Error obteniendo comentarios' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const rl = rateLimit({ name: 'share-comment', limit: 20, windowSeconds: 60 }, ip);
    if (!rl.success) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });

    const body = await req.json();
    const { content, author_name } = body;

    if (!content || content.trim().length < 1) {
      return NextResponse.json({ error: 'Se requiere contenido' }, { status: 400 });
    }

    const supabaseAdmin = getAdmin();

    // Find the post by token
    const { data: post, error: postErr } = await supabaseAdmin
      .from('posts')
      .select('id')
      .eq('approval_token', token)
      .single();

    if (postErr || !post) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 404 });
    }

    const { data: comment, error: insertErr } = await supabaseAdmin
      .from('post_comments')
      .insert({
        post_id: post.id,
        content: content.trim(),
        is_client_comment: true,
        author_name: author_name || 'Cliente',
        author_email: null,
        author_member_id: null,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    return NextResponse.json({ success: true, comment });
  } catch (err: unknown) {
    console.error('Share comments POST error:', err);
    return NextResponse.json({ error: 'Error agregando comentario' }, { status: 500 });
  }
}
