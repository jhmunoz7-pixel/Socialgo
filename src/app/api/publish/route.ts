import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { publishToInstagram, publishToFacebook } from '@/lib/meta-api';

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    // Rate limit: 5 req / 60s
    const rl = rateLimit({ name: 'publish', limit: 5, windowSeconds: 60 }, user.id);
    if (!rl.success) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta de nuevo en un momento.' }, { status: 429 });

    // Admin check (owner / admin / member)
    const { data: member } = await supabase
      .from('members')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!member) return NextResponse.json({ error: 'Sin organización' }, { status: 403 });
    if (!['owner', 'admin', 'member'].includes(member.role)) {
      return NextResponse.json({ error: 'No tienes permisos para publicar' }, { status: 403 });
    }

    const body = await req.json();
    const { post_id } = body;
    if (!post_id) return NextResponse.json({ error: 'Se requiere post_id' }, { status: 400 });

    // Fetch the post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', post_id)
      .eq('org_id', member.org_id)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 });
    }

    // Only publish posts that are scheduled or approved
    if (!['scheduled', 'published', 'approved'].includes(post.status) && post.approval_status !== 'approved') {
      return NextResponse.json({ error: 'El post debe estar aprobado o programado para publicar' }, { status: 400 });
    }

    const platform = post.platform as string;
    if (!['instagram', 'facebook'].includes(platform)) {
      return NextResponse.json({ error: `La publicación directa no está soportada para ${platform}` }, { status: 400 });
    }

    // Fetch the social connection for this client + platform
    const { data: connection } = await supabase
      .from('social_connections')
      .select('*')
      .eq('client_id', post.client_id)
      .eq('platform', platform)
      .single();

    if (!connection) {
      return NextResponse.json({
        error: `No hay conexión configurada para ${platform}. Configura la conexión en el panel del cliente.`,
      }, { status: 400 });
    }

    // Check token expiry
    if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
      return NextResponse.json({
        error: `El token de ${platform} ha expirado. Renueva la conexión en el panel del cliente.`,
      }, { status: 400 });
    }

    // Instagram requires an image
    if (platform === 'instagram' && !post.image_url) {
      return NextResponse.json({
        error: 'Instagram requiere una imagen para publicar. Agrega un asset al post.',
      }, { status: 400 });
    }

    // Attempt to publish
    let publishedUrl: string | null = null;

    if (platform === 'instagram') {
      const result = await publishToInstagram({
        accessToken: connection.access_token,
        igBusinessAccountId: connection.page_id!,
        imageUrl: post.image_url!,
        caption: post.copy || '',
      });

      if ('error' in result) {
        // Save error to post
        await supabase
          .from('posts')
          .update({ publish_error: result.error })
          .eq('id', post_id);
        return NextResponse.json({ error: result.error }, { status: 502 });
      }

      publishedUrl = result.permalink;
    } else {
      // Facebook
      const result = await publishToFacebook({
        accessToken: connection.access_token,
        pageId: connection.page_id!,
        message: post.copy || '',
        imageUrl: post.image_url || undefined,
      });

      if ('error' in result) {
        await supabase
          .from('posts')
          .update({ publish_error: result.error })
          .eq('id', post_id);
        return NextResponse.json({ error: result.error }, { status: 502 });
      }

      publishedUrl = result.permalink_url;
    }

    // Update post as published
    const now = new Date().toISOString();
    await supabase
      .from('posts')
      .update({
        published_url: publishedUrl,
        published_at: now,
        publish_error: null,
        status: 'published',
      })
      .eq('id', post_id);

    return NextResponse.json({
      success: true,
      published_url: publishedUrl,
      published_at: now,
    });
  } catch (err: unknown) {
    console.error('Publish error:', err);
    return NextResponse.json({ error: 'Error al publicar' }, { status: 500 });
  }
}
