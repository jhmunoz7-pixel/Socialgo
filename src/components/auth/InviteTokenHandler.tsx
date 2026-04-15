'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Detects Supabase invite/recovery hash fragments in the URL and
 * establishes a session from them. Works on any page — drop it into
 * login, set-password, or any auth page.
 *
 * When an access_token is found in the hash:
 *  1. Calls supabase.auth.setSession() to establish the session
 *  2. Redirects to /auth/set-password so the invited user can set a password
 *
 * If no hash tokens are found, renders nothing.
 */
export function InviteTokenHandler() {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes('access_token=')) return;

    // Parse hash fragments
    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken) return;

    setProcessing(true);

    const supabase = createClient();

    supabase.auth
      .setSession({
        access_token: accessToken,
        refresh_token: refreshToken || '',
      })
      .then(({ error }) => {
        if (error) {
          console.error('Failed to set session from invite token:', error);
          setProcessing(false);
          return;
        }

        // Clean the hash from the URL and redirect to set-password
        window.location.replace('/auth/set-password');
      })
      .catch((err) => {
        console.error('Invite token handler error:', err);
        setProcessing(false);
      });
  }, [router]);

  if (!processing) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: '#FFF8F3' }}>
      <div className="text-center">
        <div className="text-3xl mb-3 animate-pulse">🔐</div>
        <p className="text-sm font-medium" style={{ color: '#2A1F1A' }}>
          Configurando tu cuenta...
        </p>
      </div>
    </div>
  );
}
