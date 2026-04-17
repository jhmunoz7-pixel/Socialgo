'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        setIsLoading(false);
        return;
      }

      router.push('/dashboard/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
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
            Nueva contraseña
          </h1>
          <p className="text-sm text-center mb-6" style={{ color: '#64748B' }}>
            Ingresa tu nueva contraseña
          </p>

          <form onSubmit={handleSubmit} className="space-y-lg">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-md p-md">
                <p className="text-body-sm text-red-500">{error}</p>
              </div>
            )}

            <Input
              type="password"
              label="Nueva contraseña"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              autoComplete="new-password"
              helperText="Mínimo 8 caracteres"
            />

            <Input
              type="password"
              label="Confirmar contraseña"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
              autoComplete="new-password"
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              isLoading={isLoading}
              disabled={isLoading || !password || !confirmPassword}
            >
              Actualizar contraseña
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
