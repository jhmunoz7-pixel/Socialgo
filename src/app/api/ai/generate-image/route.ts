import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

/**
 * POST /api/ai/generate-image
 *
 * Body: {
 *   prompt: string,
 *   size?: '1024x1024' | '1024x1792' | '1792x1024',
 *   post_id?: string   // if present, the result is persisted to post-assets
 *                      // and the post's image_url is updated in one shot
 * }
 *
 * Generates a single image via OpenAI's Images API (DALL-E 3). DALL-E's
 * returned URL expires in ~1 hour, so when a post_id is provided we
 * proxy the bytes through our server, upload them to the `post-assets`
 * Supabase Storage bucket, and return a permanent public URL.
 *
 * Requires OPENAI_API_KEY server env var. Returns 503 with a clear code
 * when unconfigured so the UI can render a "Generación de imagen no
 * habilitada" empty state instead of a generic error.
 */
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'Generación de imágenes con IA no está habilitada. Pide al admin que configure OPENAI_API_KEY.',
          code: 'IMAGE_GEN_NOT_CONFIGURED',
        },
        { status: 503 },
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    // Aggressive rate limit — image gen is expensive
    const rl = rateLimit({ name: 'ai-image-gen', limit: 10, windowSeconds: 3600 }, user.id);
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Límite de generación por hora alcanzado. Intenta más tarde.' },
        { status: 429 },
      );
    }

    const body = await req.json();
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
    const postId = typeof body?.post_id === 'string' ? body.post_id : null;
    const size = (['1024x1024', '1024x1792', '1792x1024'] as const).includes(body?.size)
      ? body.size
      : '1024x1024';
    if (!prompt) {
      return NextResponse.json({ error: 'Falta el prompt' }, { status: 400 });
    }
    if (prompt.length > 1000) {
      return NextResponse.json({ error: 'Prompt demasiado largo (max 1000 chars)' }, { status: 400 });
    }

    // If caller wants persistence, verify the post is theirs before we
    // spend money generating the image.
    let post: { id: string; org_id: string } | null = null;
    if (postId) {
      const { data: member } = await supabase
        .from('members')
        .select('org_id')
        .eq('user_id', user.id)
        .single();
      if (!member) return NextResponse.json({ error: 'Sin organización' }, { status: 403 });

      const { data: postRow, error: postErr } = await supabase
        .from('posts')
        .select('id, org_id')
        .eq('id', postId)
        .eq('org_id', member.org_id)
        .single();
      if (postErr || !postRow) {
        return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 });
      }
      post = postRow;
    }

    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size,
        quality: 'standard',
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('OpenAI image gen error:', res.status, text);
      return NextResponse.json(
        { error: 'Error del proveedor de imágenes', detail: text.slice(0, 200) },
        { status: 502 },
      );
    }
    const data = (await res.json()) as { data?: Array<{ url?: string; revised_prompt?: string }> };
    const image = data.data?.[0];
    if (!image?.url) {
      return NextResponse.json({ error: 'Respuesta sin URL de imagen' }, { status: 502 });
    }

    // If we have a post context, persist the image. DALL-E URLs expire
    // after ~1 hour, so we re-upload to our own storage and return that
    // permanent URL.
    let finalUrl = image.url;
    if (post) {
      try {
        const imgRes = await fetch(image.url);
        if (!imgRes.ok) throw new Error(`No se pudo descargar la imagen (${imgRes.status})`);
        const bytes = new Uint8Array(await imgRes.arrayBuffer());

        const service = await createServiceRoleClient();
        const filePath = `${post.org_id}/${post.id}/${Date.now()}-ai.png`;
        const { error: upErr } = await service.storage
          .from('post-assets')
          .upload(filePath, bytes, {
            contentType: 'image/png',
            cacheControl: '3600',
            upsert: true,
          });
        if (upErr) throw upErr;

        const { data: urlData } = service.storage.from('post-assets').getPublicUrl(filePath);
        finalUrl = urlData.publicUrl;

        // Attach to the post in the same request so the UI doesn't need
        // a second round-trip.
        await service.from('posts').update({ image_url: finalUrl }).eq('id', post.id);
      } catch (persistErr) {
        // Persistence is best-effort: if we fail, fall back to the DALL-E
        // URL and tell the client — they can still show the image short-term.
        console.error('AI image persist failed:', persistErr);
        return NextResponse.json({
          success: true,
          url: image.url,
          revised_prompt: image.revised_prompt ?? null,
          size,
          warning:
            'Imagen generada pero no se pudo persistir; la URL expira en ~1h. Sube manualmente para guardarla.',
        });
      }
    }

    return NextResponse.json({
      success: true,
      url: finalUrl,
      persisted: Boolean(post),
      revised_prompt: image.revised_prompt ?? null,
      size,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    console.error('AI image gen error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
