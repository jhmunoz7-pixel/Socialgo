import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendSlackNotification } from '@/lib/slack';

/**
 * POST /api/notifications/slack/test
 * Tests a Slack webhook URL by sending a sample message.
 * Auth required — admin/owner only.
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

    // Check user is admin or owner
    const { data: member } = await supabase
      .from('members')
      .select('org_id, role')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'Sin organizacion' }, { status: 403 });
    }

    if (!['owner', 'admin'].includes(member.role)) {
      return NextResponse.json(
        { error: 'Solo administradores pueden probar webhooks' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { webhook_url } = body;

    if (!webhook_url || typeof webhook_url !== 'string') {
      return NextResponse.json(
        { error: 'Se requiere webhook_url' },
        { status: 400 }
      );
    }

    // Basic URL validation
    try {
      const url = new URL(webhook_url);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return NextResponse.json(
          { error: 'URL debe ser HTTP o HTTPS' },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'URL invalida' },
        { status: 400 }
      );
    }

    const success = await sendSlackNotification(webhook_url, {
      text: ':white_check_mark: SocialGo conectado exitosamente! Las notificaciones de tu agencia llegaran a este canal.',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: ':white_check_mark: *SocialGo conectado exitosamente!*\n\nLas notificaciones de posts (creacion, aprobacion, publicacion) llegaran a este canal.',
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: 'Mensaje de prueba enviado desde SocialGo',
            },
          ],
        },
      ],
    });

    if (!success) {
      return NextResponse.json(
        { error: 'No se pudo enviar el mensaje. Verifica que la URL del webhook sea correcta.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: 'Mensaje de prueba enviado' });
  } catch (err: unknown) {
    console.error('Slack test error:', err);
    return NextResponse.json(
      { error: 'Error al probar webhook' },
      { status: 500 }
    );
  }
}
