/**
 * Platform Admin layout.
 *
 * Gated by PLATFORM_ADMIN_EMAILS env var. Any request from a user NOT in that
 * list (including anonymous visitors) sees the standard Next.js 404, hiding
 * the existence of this surface entirely.
 *
 * This is Jorge's god-mode view — NOT a per-agency dashboard.
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { checkPlatformAdmin } from "@/lib/platform-admin";

export const metadata = {
  title: "SocialGo · Platform Admin",
  robots: { index: false, follow: false },
};

// Always render fresh — platform metrics should never cache across requests.
export const dynamic = "force-dynamic";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAdmin, email } = await checkPlatformAdmin();

  if (!isAdmin) {
    notFound();
  }

  const initials = (email ?? "")
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0F1D27",
        color: "#E5E5E3",
        fontFamily: "'Mont', 'Nunito', sans-serif",
        fontSize: 14,
        lineHeight: 1.5,
      }}
    >
      <header
        style={{
          background: "rgba(53, 70, 84, 0.4)",
          borderBottom: "1px solid rgba(108, 122, 131, 0.3)",
          padding: "14px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backdropFilter: "blur(10px)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Link
          href="/platform"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#B4F965",
              boxShadow: "0 0 12px rgba(180, 249, 101, 0.6)",
            }}
          />
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.3px" }}>
            SocialGo
            <small
              style={{
                display: "block",
                fontSize: 10,
                fontWeight: 600,
                color: "#6C7A83",
                letterSpacing: 1.5,
                marginTop: 2,
              }}
            >
              LOONSHOT LABS
            </small>
          </span>
          <span
            style={{
              background: "#B4F965",
              color: "#0F1D27",
              padding: "4px 10px",
              borderRadius: 6,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 1,
              marginLeft: 8,
            }}
          >
            PLATFORM ADMIN
          </span>
        </Link>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 13,
            color: "#6C7A83",
          }}
        >
          <Link
            href="/dashboard"
            style={{
              color: "#6C7A83",
              textDecoration: "none",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            ← Volver a mi agencia
          </Link>
          <span className="pa-email">{email}</span>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #B4F965, #8FD44C)",
              color: "#0F1D27",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
            }}
          >
            {initials}
          </div>
        </div>
      </header>

      <main>{children}</main>

      <style>{`
        @media (max-width: 700px) {
          .pa-email { display: none; }
        }
      `}</style>
    </div>
  );
}
