/**
 * Shared publishing logic so the manual /api/publish route and the
 * scheduled cron can reuse the same Meta Graph API flow.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { publishToInstagram, publishToFacebook } from '@/lib/meta-api';

export interface PublishResult {
  ok: boolean;
  published_url?: string | null;
  published_at?: string;
  error?: string;
  errorCode?:
    | 'POST_NOT_FOUND'
    | 'POST_NOT_READY'
    | 'PLATFORM_UNSUPPORTED'
    | 'NO_CONNECTION'
    | 'TOKEN_EXPIRED'
    | 'NO_IMAGE'
    | 'META_API_ERROR'
    | 'EXCEPTION';
}

type PostRow = {
  id: string;
  client_id: string;
  org_id: string;
  status: string;
  approval_status: string;
  platform: string;
  image_url: string | null;
  copy: string | null;
};

type ConnectionRow = {
  access_token: string;
  page_id: string | null;
  token_expires_at: string | null;
};

/**
 * Publishes a post by ID. The caller provides a Supabase client that
 * already has the right scope — either a user-scoped client from the
 * /api/publish route, or a service-role client from the cron. `orgId`
 * is used to double-check ownership when the client wouldn't enforce
 * RLS (service role).
 */
export async function publishPost(
  supabase: SupabaseClient,
  postId: string,
  orgId: string,
): Promise<PublishResult> {
  try {
    const { data: post, error: postErr } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .eq('org_id', orgId)
      .single<PostRow>();

    if (postErr || !post) {
      return { ok: false, error: 'Post no encontrado', errorCode: 'POST_NOT_FOUND' };
    }

    const isReady =
      post.approval_status === 'approved' ||
      ['scheduled', 'approved', 'published'].includes(post.status);
    if (!isReady) {
      return { ok: false, error: 'El post no está listo para publicar', errorCode: 'POST_NOT_READY' };
    }

    if (!['instagram', 'facebook'].includes(post.platform)) {
      return {
        ok: false,
        error: `Publicación directa no soportada en ${post.platform}`,
        errorCode: 'PLATFORM_UNSUPPORTED',
      };
    }

    const { data: connection } = await supabase
      .from('social_connections')
      .select('*')
      .eq('client_id', post.client_id)
      .eq('platform', post.platform)
      .single<ConnectionRow>();

    if (!connection) {
      return {
        ok: false,
        error: `No hay conexión de ${post.platform} para este cliente`,
        errorCode: 'NO_CONNECTION',
      };
    }

    if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
      return {
        ok: false,
        error: `El token de ${post.platform} expiró. Renueva la conexión.`,
        errorCode: 'TOKEN_EXPIRED',
      };
    }

    if (post.platform === 'instagram' && !post.image_url) {
      return { ok: false, error: 'Instagram requiere imagen', errorCode: 'NO_IMAGE' };
    }

    let publishedUrl: string | null = null;
    if (post.platform === 'instagram') {
      const result = await publishToInstagram({
        accessToken: connection.access_token,
        igBusinessAccountId: connection.page_id!,
        imageUrl: post.image_url!,
        caption: post.copy || '',
      });
      if ('error' in result) {
        await supabase.from('posts').update({ publish_error: result.error }).eq('id', postId);
        return { ok: false, error: result.error, errorCode: 'META_API_ERROR' };
      }
      publishedUrl = result.permalink;
    } else {
      const result = await publishToFacebook({
        accessToken: connection.access_token,
        pageId: connection.page_id!,
        message: post.copy || '',
        imageUrl: post.image_url || undefined,
      });
      if ('error' in result) {
        await supabase.from('posts').update({ publish_error: result.error }).eq('id', postId);
        return { ok: false, error: result.error, errorCode: 'META_API_ERROR' };
      }
      publishedUrl = result.permalink_url;
    }

    const now = new Date().toISOString();
    await supabase
      .from('posts')
      .update({
        published_url: publishedUrl,
        published_at: now,
        publish_error: null,
        status: 'published',
      })
      .eq('id', postId);

    return { ok: true, published_url: publishedUrl, published_at: now };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al publicar';
    console.error('[publishPost] exception:', err);
    return { ok: false, error: message, errorCode: 'EXCEPTION' };
  }
}
