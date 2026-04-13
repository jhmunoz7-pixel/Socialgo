/**
 * Login form component
 * Client-side form for user authentication with email/password
 */

"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const message = searchParams.get("message");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        setError(signInError.message || "Error al iniciar sesión");
        setIsLoading(false);
        return;
      }

      router.push("/dashboard");
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
      {message === "check_email" && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-md p-md">
          <p className="text-body-sm text-green-600" style={{ fontWeight: 500 }}>
            ✉️ ¡Cuenta creada! Revisa tu correo electrónico y haz clic en el enlace de confirmación para activar tu cuenta.
          </p>
        </div>
      )}

      {message === "email_confirmed" && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-md p-md">
          <p className="text-body-sm text-green-600" style={{ fontWeight: 500 }}>
            ✅ ¡Email confirmado! Ya puedes iniciar sesión.
          </p>
        </div>
      )}

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

      <Input
        type="password"
        label="Contraseña"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        disabled={isLoading}
        autoComplete="current-password"
      />

      <Button
        type="submit"
        variant="primary"
        size="md"
        className="w-full"
        isLoading={isLoading}
        disabled={isLoading || !email || !password}
      >
        Iniciar sesión
      </Button>

      <p className="text-body-xs text-aurometal text-center">
        <a href="#" className="text-inchworm hover:underline">
          ¿Olvidaste tu contraseña?
        </a>
      </p>
    </form>
  );
}
