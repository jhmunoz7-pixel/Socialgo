/**
 * SetPasswordForm — used on /auth/set-password after an invited user
 * clicks the invitation email link.
 *
 * Supabase inviteUserByEmail sends a link that lands on this page with
 * hash fragments (#access_token=...&type=invite). We need to let the
 * Supabase client process those tokens to establish a session before
 * the user can set their password.
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function SetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // On mount, wait for Supabase to process the hash tokens from the invite link
  useEffect(() => {
    const supabase = createClient();

    // Listen for the auth state change that happens when Supabase
    // processes the #access_token hash fragment from the invite email
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setSessionReady(true);
        setCheckingSession(false);
      }
    });

    // Also check if there's already a valid session (e.g. page refresh)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setSessionReady(true);
      }
      setCheckingSession(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError(
          "Tu sesión de invitación expiró. Pide a tu admin que te reenvíe la invitación."
        );
        setIsLoading(false);
        return;
      }

      const { error: updateErr } = await supabase.auth.updateUser({ password });

      if (updateErr) {
        setError(updateErr.message || "No se pudo guardar la contraseña.");
        setIsLoading(false);
        return;
      }

      router.push("/dashboard/home");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setIsLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="py-8 text-center" style={{ color: "#94A3B8" }}>
        Verificando invitación...
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-body-sm" style={{ color: "#E74C3C" }}>
          Tu sesión de invitación expiró o el enlace es inválido.
        </p>
        <p className="text-body-xs" style={{ color: "#64748B" }}>
          Pide a tu administrador que te reenvíe la invitación desde el panel de equipo.
        </p>
      </div>
    );
  }

  return (
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
      />

      <Input
        type="password"
        label="Confirmar contraseña"
        placeholder="••••••••"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
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
        disabled={isLoading || !password || !confirm}
      >
        Guardar contraseña y entrar
      </Button>
    </form>
  );
}
