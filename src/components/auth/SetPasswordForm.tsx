/**
 * SetPasswordForm — used on /auth/set-password after an invited user
 * clicks the invitation email link. Their Supabase session is already
 * valid (PKCE exchange happened on the callback), they just need to
 * define a real password.
 */

"use client";

import { useState } from "react";
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

      // Require an active session — invite callback should have established it.
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

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
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
