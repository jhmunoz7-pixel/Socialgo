/**
 * /auth/set-password — destination for Supabase "invite user by email" links.
 *
 * When a freshly-invited user clicks the link in their email, Supabase
 * finishes the PKCE/recovery flow on the auth callback route and lands them
 * here. Their session is valid but they have no password yet (or the one
 * they have is the temporary one Supabase generated). This page lets them
 * set a real password and continue into the dashboard.
 */

import { Suspense } from "react";
import Link from "next/link";
import { SetPasswordForm } from "@/components/auth/SetPasswordForm";
import { InviteTokenHandler } from "@/components/auth/InviteTokenHandler";

export default function SetPasswordPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: "#F8FAFC" }}
    >
      {/* Process invite hash tokens if arriving directly from Supabase */}
      <InviteTokenHandler />
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div
          className="absolute top-0 right-1/4 w-96 h-96 rounded-full opacity-30 blur-3xl"
          style={{ background: "#818CF8" }}
        />
        <div
          className="absolute bottom-1/4 left-0 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: "#C4B5FD" }}
        />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <span
              className="font-serif text-2xl font-bold"
              style={{ color: "#0F172A" }}
            >
              socialgo
            </span>
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: "#6366F1" }}
            />
          </Link>
        </div>

        <div
          className="rounded-3xl p-8 border"
          style={{
            background: "rgba(255,255,255,0.6)",
            backdropFilter: "blur(16px)",
            borderColor: "rgba(255,255,255,0.5)",
          }}
        >
          <h1
            className="text-2xl font-serif font-bold text-center mb-1"
            style={{ color: "#0F172A" }}
          >
            Crea tu contraseña
          </h1>
          <p
            className="text-sm text-center mb-6"
            style={{ color: "#64748B" }}
          >
            Tu invitación fue aceptada. Define una contraseña para entrar a tu
            equipo.
          </p>

          <Suspense
            fallback={
              <div className="py-8 text-center" style={{ color: "#94A3B8" }}>
                Cargando...
              </div>
            }
          >
            <SetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
