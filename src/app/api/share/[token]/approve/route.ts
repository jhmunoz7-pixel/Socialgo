import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

    // Rate limit by IP (no user session for anon)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const rl = rateLimit({ name: 'share-approve', limit: 10, windowSeconds: 60 }, ip);
    if (!rl.success) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });

    const body = await req.json();
    const { status, comments, approved_by } = body;

    if (!status || !['approved', 'approved_with_changes', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
    }

    // Use service role client for the RPC call
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { error } = await supabaseAdmin.rpc('approve_post_by_token', {
      p_token: token,
      p_status: status,
      p_comments: comments || null,
      p_approved_by: approved_by || 'Cliente',
    });

    if (error) {
      if (error.message?.includes('inválido') || error.message?.includes('expirado')) {
        return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Share approve error:', err);
    return NextResponse.json({ error: 'Error procesando aprobación' }, { status: 500 });
  }
}
