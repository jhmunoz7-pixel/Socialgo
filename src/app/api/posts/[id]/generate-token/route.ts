import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: postId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    // Verify membership
    const { data: member } = await supabase.from('members').select('org_id, role').eq('user_id', user.id).single();
    if (!member) return NextResponse.json({ error: 'Sin organización' }, { status: 403 });

    // Only admin-level roles can generate tokens
    if (!['owner', 'admin', 'member'].includes(member.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    // Verify post belongs to org
    const { data: post } = await supabase.from('posts').select('id, approval_token, org_id').eq('id', postId).single();
    if (!post || post.org_id !== member.org_id) {
      return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 });
    }

    // If token already exists, return it
    if (post.approval_token) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://socialgo-one.vercel.app';
      return NextResponse.json({
        success: true,
        token: post.approval_token,
        share_url: `${baseUrl}/share/${post.approval_token}`,
        existing: true,
      });
    }

    // Generate a new token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30-day expiry

    const { error: updateErr } = await supabase.from('posts').update({
      approval_token: token,
      approval_token_created_at: new Date().toISOString(),
      approval_token_expires_at: expiresAt.toISOString(),
    }).eq('id', postId);

    if (updateErr) throw updateErr;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://socialgo-one.vercel.app';
    return NextResponse.json({
      success: true,
      token,
      share_url: `${baseUrl}/share/${token}`,
      existing: false,
    });
  } catch (err: unknown) {
    console.error('Generate token error:', err);
    return NextResponse.json({ error: 'Error generando token' }, { status: 500 });
  }
}
