/**
 * Sign up form component
 * Client-side form for user registration with email/password
 */

"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams?.get("plan") || "";
  const cycleParam = searchParams?.get("cycle") || "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();

      // Build the redirect URL for email confirmation
      const redirectUrl = `${window.location.origin}/auth/callback`;

      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName.trim() || null,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message || "Error al crear la cuenta");
        setIsLoading(false);
        return;
      }

      // Preserve plan selection through email-confirmation step
      const qs = new URLSearchParams({ message: "check_email" });
      if (planParam) qs.set("plan", planParam);
      if (cycleParam) qs.set("cycle", cycleParam);
      router.push(`/auth/login?${qs.toString()}`);
      router.refresh();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Ocurrió un error inesperado";
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-lg">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-md p-md">
          <p className="text-body-sm text-red-500">{error}</p>
        </div>
      )}

      <Input
        type="text"
        label="Nombre completo"
        placeholder="María García"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        disabled={isLoading}
        autoComplete="name"
      />

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

      <Input
        type="password"
        label="Contraseña"
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
        disabled={isLoading || !email || !password || !confirmPassword}
      >
        Crear cuenta
      </Button>

      <p className="text-body-xs text-aurometal text-center">
        Al registrarte inicias un trial de 14 días gratis. Sin tarjeta de crédito.
      </p>

      {/* Divider */}
      <div className="flex items-center gap-3 my-2">
        <div className="flex-1 h-px" style={{ background: 'var(--glass-border)' }} />
        <span className="text-body-xs" style={{ color: 'var(--text-light)' }}>o</span>
        <div className="flex-1 h-px" style={{ background: 'var(--glass-border)' }} />
      </div>

      {/* Google OAuth */}
      <button
        type="button"
        disabled={isLoading}
        onClick={async () => {
          const supabase = createClient();
          await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}/auth/callback` },
          });
        }}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all hover:opacity-80 disabled:opacity-50"
        style={{ borderColor: 'var(--glass-border)', color: 'var(--text-dark)', background: 'var(--surface)' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        Registrarse con Google
      </button>
    </form>
  );
}
