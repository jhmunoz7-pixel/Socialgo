import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getValidCanvaAccessToken } from '@/lib/canva-oauth';

/**
 * POST /api/canva/designs/{id}/sync-pages
 *
 * Refreshes the per-page thumbnails for a cached Canva design by calling
 * Canva's Connect Export API. Steps:
 *
 *   1. Validate the design belongs to the caller's org.
 *   2. POST /rest/v1/exports with { design_id, format: { type: 'png' } }
 *      → returns a job id.
 *   3. Poll GET /rest/v1/exports/{job_id} until status === 'success' (or
 *      give up after ~15s; caller can retry).
 *   4. The success response contains one `urls[]` per page; we store them
 *      in canva_designs.pages as [{ page_number, thumbnail_url }].
 *
 * Auth: reads CANVA_API_TOKEN from env. This is intentionally simple —
 * an org-wide token works for the MVP. Move to per-user OAuth when the
 * team needs multiple Canva accounts.
 *
 * If CANVA_API_TOKEN is not set, returns 503 with a message the UI can
 * render as "Canva not configured yet".
 */

const CANVA_API_BASE = 'https://api.canva.com/rest/v1';
const POLL_INTERVAL_MS = 1500;
const POLL_MAX_MS = 15_000;

type CanvaExportStartResponse = {
  job?: { id?: string; status?: string };
};

type CanvaExportJobResponse = {
  job?: {
    id?: string;
    status?: 'in_progress' | 'success' | 'failed';
    urls?: string[];
    error?: { message?: string };
  };
};

async function startExport(canvaDesignId: string, token: string) {
  const res = await fetch(`${CANVA_API_BASE}/exports`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      design_id: canvaDesignId,
      format: { type: 'png' },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Canva export start failed (${res.status}): ${text}`);
  }
  const data = (await res.json()) as CanvaExportStartResponse;
  if (!data.job?.id) throw new Error('Canva export: missing job id');
  return data.job.id;
}

async function waitForExport(jobId: string, token: string): Promise<string[]> {
  const deadline = Date.now() + POLL_MAX_MS;
  while (Date.now() < deadline) {
    const res = await fetch(`${CANVA_API_BASE}/exports/${jobId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Canva export poll failed (${res.status}): ${text}`);
    }
    const data = (await res.json()) as CanvaExportJobResponse;
    const status = data.job?.status;
    if (status === 'success') return data.job?.urls ?? [];
    if (status === 'failed') {
      throw new Error(data.job?.error?.message || 'Canva export job failed');
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error('Canva export timed out. Retry in a moment.');
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data: member } = await supabase
      .from('members')
      .select('id, org_id, role')
      .eq('user_id', user.id)
      .single();
    if (!member) return NextResponse.json({ error: 'Sin organización' }, { status: 403 });

    // Prefer the member's per-user Canva OAuth token; fall back to the
    // legacy org-wide CANVA_API_TOKEN env var so existing deployments
    // keep working while users migrate to Connect.
    let token = await getValidCanvaAccessToken(member.id);
    if (!token) token = process.env.CANVA_API_TOKEN || null;
    if (!token) {
      return NextResponse.json(
        {
          error:
            'Canva no está conectado. Conecta tu cuenta en Configuración → Integraciones.',
          code: 'CANVA_NOT_CONNECTED',
        },
        { status: 503 },
      );
    }

    const { id } = await params;

    // Load the design and verify ownership
    const { data: design, error: designError } = await supabase
      .from('canva_designs')
      .select('id, org_id, canva_design_id')
      .eq('id', id)
      .eq('org_id', member.org_id)
      .single();
    if (designError || !design) {
      return NextResponse.json({ error: 'Diseño no encontrado' }, { status: 404 });
    }

    // Run Canva export
    const jobId = await startExport(design.canva_design_id, token);
    const urls = await waitForExport(jobId, token);

    // Persist as per-page thumbnails
    const pages = urls.map((url, i) => ({
      page_number: i + 1,
      thumbnail_url: url,
    }));

    const { data: updated, error: updateError } = await supabase
      .from('canva_designs')
      .update({
        pages,
        page_count: pages.length || undefined,
        synced_at: new Date().toISOString(),
      })
      .eq('id', design.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    console.error('Canva sync-pages error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
