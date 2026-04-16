/**
 * Sign up page — SocialGo glassmorphism design
 */

import Link from "next/link";
import { Suspense } from "react";
import { SignUpForm } from "@/components/auth/SignUpForm";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: '#F8FAFC' }}>
      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-0 w-96 h-96 rounded-full opacity-30 blur-3xl" style={{ background: '#C4B5FD' }} />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: '#C4B5FD' }} />
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="font-serif text-2xl font-bold" style={{ color: '#0F172A' }}>socialgo</span>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#6366F1' }} />
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
          <h1 className="text-2xl font-serif font-bold text-center mb-1" style={{ color: '#0F172A' }}>
            Crear cuenta
          </h1>
          <p className="text-sm text-center mb-6" style={{ color: '#64748B' }}>
            Empieza a gestionar tu agencia con SocialGo
          </p>

          <Suspense fallback={<div className="py-8 text-center" style={{ color: '#94A3B8' }}>Cargando...</div>}>
            <SignUpForm />
          </Suspense>

          <div className="mt-6">
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full" style={{ borderTop: '1px solid rgba(148,163,184,0.25)' }} />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3" style={{ background: 'rgba(255,255,255,0.6)', color: '#94A3B8' }}>o</span>
              </div>
            </div>

            <p className="text-sm text-center" style={{ color: '#64748B' }}>
              ¿Ya tienes cuenta?{" "}
              <Link href="/auth/login" className="font-semibold hover:opacity-70 transition-opacity" style={{ color: '#6366F1' }}>
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center text-xs" style={{ color: '#94A3B8' }}>
          <p>
            Al registrarte, aceptas nuestros{" "}
            <a href="#" className="underline hover:opacity-70">Términos de Servicio</a>
            {" "}y{" "}
            <a href="#" className="underline hover:opacity-70">Política de Privacidad</a>
          </p>
        </div>
      </div>
    </div>
  );
}
