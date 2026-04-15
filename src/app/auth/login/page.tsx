/**
 * Login page — SocialGo glassmorphism design
 */

import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { InviteTokenHandler } from "@/components/auth/InviteTokenHandler";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: '#FFF8F3' }}>
      {/* Intercept invite hash tokens that Supabase appends to this page */}
      <InviteTokenHandler />
      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full opacity-30 blur-3xl" style={{ background: '#FFB5C8' }} />
        <div className="absolute bottom-1/4 left-0 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: '#E8D5FF' }} />
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="font-serif text-2xl font-bold" style={{ color: '#2A1F1A' }}>socialgo</span>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#FF8FAD' }} />
          </Link>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl p-8 border"
          style={{
            background: 'rgba(255,255,255,0.6)',
            backdropFilter: 'blur(16px)',
            borderColor: 'rgba(255,255,255,0.5)',
          }}
        >
          <h1 className="text-2xl font-serif font-bold text-center mb-1" style={{ color: '#2A1F1A' }}>
            Iniciar sesión
          </h1>
          <p className="text-sm text-center mb-6" style={{ color: '#7A6560' }}>
            Bienvenido de vuelta a SocialGo
          </p>

          <Suspense fallback={<div className="py-8 text-center" style={{ color: '#B8A9A4' }}>Cargando...</div>}>
            <LoginForm />
          </Suspense>

          <div className="mt-6">
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full" style={{ borderTop: '1px solid rgba(255,180,150,0.3)' }} />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3" style={{ background: 'rgba(255,255,255,0.6)', color: '#B8A9A4' }}>o</span>
              </div>
            </div>

            <p className="text-sm text-center" style={{ color: '#7A6560' }}>
              ¿No tienes cuenta?{" "}
              <Link href="/auth/signup" className="font-semibold hover:opacity-70 transition-opacity" style={{ color: '#FF8FAD' }}>
                Regístrate gratis
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center text-xs" style={{ color: '#B8A9A4' }}>
          <p>
            Al iniciar sesión, aceptas nuestros{" "}
            <a href="#" className="underline hover:opacity-70">Términos de Servicio</a>
            {" "}y{" "}
            <a href="#" className="underline hover:opacity-70">Política de Privacidad</a>
          </p>
        </div>
      </div>
    </div>
  );
}
