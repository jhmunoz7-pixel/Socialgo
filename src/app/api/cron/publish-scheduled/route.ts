import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { publishPost } from '@/lib/publish';

/**
 * GET /api/cron/publish-scheduled
 *
 * Vercel Cron hits this on a schedule (configured in vercel.json). It
 * finds every post that is:
 *   - status = 'scheduled'
 *   - approval_status = 'approved'
 *   - scheduled_date + scheduled_time is in the past
 *   - published_at IS NULL
 *
 * …and publishes it via Meta Graph. Runs at most 25 posts per invocation
 * to stay inside Vercel's timeout budget; next tick will catch the rest.
 *
 * Security: Vercel automatically sets the `x-vercel-cron` header on
 * scheduled invocations, or we can optionally require a CRON_SECRET
 * query param for manual triggers.
 */

const MAX_PER_TICK = 25;

type ScheduledPost = {
  id: string;
  org_id: string;
  scheduled_date: string;
  scheduled_time: string | null;
};

export async function GET(req: NextRequest) {
  // Manual triggers must provide CRON_SECRET; Vercel scheduled invocations
  // come in via the platform and are implicitly trusted.
  const isVercelCron = req.headers.get('x-vercel-cron');
  if (!isVercelCron) {
    const secret = process.env.CRON_SECRET;
    const provided = req.nextUrl.searchParams.get('secret');
    if (!secret || provided !== secret) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    const service = await createServiceRoleClient();
    const nowIso = new Date().toISOString();
    const today = nowIso.slice(0, 10);

    // Pull posts from today or earlier that look ready; we'll refine by
    // scheduled_time below since Supabase doesn't let us compare a TIME
    // column against "now" in a single filter easily.
    const { data: candidates, error } = await service
      .from('posts')
      .select('id, org_id, scheduled_date, scheduled_time')
      .eq('status', 'scheduled')
      .eq('approval_status', 'approved')
      .is('published_at', null)
      .lte('scheduled_date', today)
      .limit(MAX_PER_TICK * 2);

    if (error) throw error;

    const due = (candidates as ScheduledPost[] | null ?? []).filter((p) => {
      if (!p.scheduled_date) return false;
      // If no time is set, fire as soon as the date is today or earlier.
      if (!p.scheduled_time) return p.scheduled_date <= today;
      const scheduledAt = new Date(`${p.scheduled_date}T${p.scheduled_time}:00`);
      return scheduledAt.getTime() <= Date.now();
    }).slice(0, MAX_PER_TICK);

    const results: Array<{ id: string; ok: boolean; error?: string; errorCode?: string }> = [];
    for (const p of due) {
      const res = await publishPost(service, p.id, p.org_id);
      results.push({ id: p.id, ok: res.ok, error: res.error, errorCode: res.errorCode });
    }

    return NextResponse.json({
      ok: true,
      checked: candidates?.length ?? 0,
      due: due.length,
      published: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
      ran_at: nowIso,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[cron publish-scheduled]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
