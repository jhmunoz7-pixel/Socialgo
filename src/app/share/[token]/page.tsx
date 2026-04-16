import { createClient } from '@supabase/supabase-js';
import { ClientApprovalView } from './ClientApprovalView';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function SharePage({ params }: PageProps) {
  const { token } = await params;

  // Use service role to fetch the post (anon RLS works but service role is more reliable for server components)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: post } = await supabase
    .from('posts')
    .select('*, client:clients(name, emoji, color)')
    .eq('approval_token', token)
    .single();

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8FAFC' }}>
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
            <svg className="w-8 h-8" style={{ color: '#6366F1' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold mb-2" style={{ color: '#0F172A', fontFamily: 'Fraunces, Georgia, serif' }}>
            Enlace no válido
          </h1>
          <p className="text-sm" style={{ color: '#64748B' }}>
            Este enlace de aprobación no existe o ha expirado.
          </p>
        </div>
      </div>
    );
  }

  // Check expiry
  if (post.approval_token_expires_at && new Date(post.approval_token_expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8FAFC' }}>
        <div className="text-center p-8">
          <h1 className="text-xl font-bold mb-2" style={{ color: '#0F172A', fontFamily: 'Fraunces, Georgia, serif' }}>
            Enlace expirado
          </h1>
          <p className="text-sm" style={{ color: '#64748B' }}>
            Este enlace de aprobación ha expirado. Solicita uno nuevo a tu agencia.
          </p>
        </div>
      </div>
    );
  }

  return <ClientApprovalView post={post} token={token} />;
}
