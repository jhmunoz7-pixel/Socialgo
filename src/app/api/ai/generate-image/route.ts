import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

/**
 * POST /api/ai/generate-image
 *
 * Body: { prompt: string, size?: '1024x1024' | '1024x1792' | '1792x1024' }
 *
 * Generates a single image via OpenAI's Images API (DALL-E 3) and returns
 * a temporary URL the caller can persist (e.g. upload to Supabase Storage
 * + set on post.image_url).
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
    const size = (['1024x1024', '1024x1792', '1792x1024'] as const).includes(body?.size)
      ? body.size
      : '1024x1024';
    if (!prompt) {
      return NextResponse.json({ error: 'Falta el prompt' }, { status: 400 });
    }
    if (prompt.length > 1000) {
      return NextResponse.json({ error: 'Prompt demasiado largo (max 1000 chars)' }, { status: 400 });
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

    return NextResponse.json({
      success: true,
      url: image.url,
      revised_prompt: image.revised_prompt ?? null,
      size,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    console.error('AI image gen error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
