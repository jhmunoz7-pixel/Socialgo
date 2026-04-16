'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: `${window.location.origin}/auth/update-password` }
      );

      if (resetError) {
        setError(resetError.message);
        setIsLoading(false);
        return;
      }

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: '#F8FAFC' }}>
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full opacity-30 blur-3xl" style={{ background: '#818CF8' }} />
        <div className="absolute bottom-1/4 left-0 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: '#C4B5FD' }} />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="font-serif text-2xl font-bold" style={{ color: '#0F172A' }}>socialgo</span>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#6366F1' }} />
          </Link>
        </div>

        <div
          className="rounded-3xl p-8 border"
          style={{
            background: 'rgba(255,255,255,0.6)',
            backdropFilter: 'blur(16px)',
            borderColor: 'rgba(255,255,255,0.5)',
          }}
        >
          <h1 className="text-2xl font-serif font-bold text-center mb-1" style={{ color: '#0F172A' }}>
            Recuperar contraseña
          </h1>
          <p className="text-sm text-center mb-6" style={{ color: '#64748B' }}>
            Te enviaremos un enlace para restablecer tu contraseña
          </p>

          {sent ? (
            <div className="bg-green-500/10 border border-green-500/30 rounded-md p-md text-center">
              <p className="text-body-sm text-green-600" style={{ fontWeight: 500 }}>
                ✉️ ¡Listo! Revisa tu correo electrónico y haz clic en el enlace para restablecer tu contraseña.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-lg">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-md p-md">
                  <p className="text-body-sm text-red-500">{error}</p>
                </div>
              )}

              <Input
                type="email"
                label="Correo electrónico"
                placeholder="tu@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="email"
              />

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full"
                isLoading={isLoading}
                disabled={isLoading || !email}
              >
                Enviar enlace
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link href="/auth/login" className="text-sm font-semibold hover:opacity-70 transition-opacity" style={{ color: '#6366F1' }}>
              Volver a iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
