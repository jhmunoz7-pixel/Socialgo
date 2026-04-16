import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function Navbar() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <nav
      style={{
        background: "rgba(241,245,249,0.85)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(148,163,184,0.15)",
      }}
      className="sticky top-0 z-50"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="font-serif text-xl font-bold" style={{ color: "#0F172A" }}>
            socialgo
          </span>
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: "#6366F1" }}
          />
        </Link>

        {/* Center links */}
        <div className="hidden md:flex items-center gap-8">
          <Link
            href="/#features"
            className="text-sm hover:opacity-70 transition-opacity"
            style={{ color: "#334155" }}
          >
            Funcionalidades
          </Link>
          <Link
            href="/pricing"
            className="text-sm hover:opacity-70 transition-opacity"
            style={{ color: "#334155" }}
          >
            Precios
          </Link>
          <Link
            href="/#faq"
            className="text-sm hover:opacity-70 transition-opacity"
            style={{ color: "#334155" }}
          >
            FAQ
          </Link>
        </div>

        {/* Auth */}
        <div className="flex items-center gap-3">
          {user ? (
            <Link
              href="/dashboard"
              className="text-sm font-medium px-4 py-2 rounded-xl text-white"
              style={{
                background: "linear-gradient(135deg, #6366F1, #A78BFA)",
              }}
            >
              Mi dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-sm font-medium px-4 py-2 rounded-xl transition-colors hover:bg-white/50"
                style={{ color: "#334155" }}
              >
                Iniciar sesión
              </Link>
              <Link
                href="/pricing"
                className="text-sm font-medium px-4 py-2 rounded-xl text-white"
                style={{
                  background: "linear-gradient(135deg, #6366F1, #A78BFA)",
                }}
              >
                Empezar gratis
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
