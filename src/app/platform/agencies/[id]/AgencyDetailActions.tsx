"use client";

/**
 * Client wrapper for agency admin actions + impersonation button.
 * Keeps the drill-down server component simple.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import AgencyActionsModal, {
  type AgencyForModal,
} from "../../AgencyActionsModal";

export default function AgencyDetailActions({
  agency,
}: {
  agency: AgencyForModal;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [impersonating, setImpersonating] = useState(false);

  const handleImpersonate = async () => {
    setImpersonating(true);
    try {
      const res = await fetch("/api/platform/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: agency.id }),
      });
      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        console.error("Impersonation failed");
        alert("Error al entrar como agencia");
      }
    } finally {
      setImpersonating(false);
    }
  };

  return (
    <section
      style={{
        background: "#354654",
        border: "1px solid rgba(108,122,131,0.2)",
        borderRadius: 14,
        padding: "18px 22px",
        marginBottom: 16,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            color: "#6C7A83",
            marginBottom: 4,
          }}
        >
          Acciones admin
        </div>
        <div style={{ fontSize: 12, color: "#E5E5E3" }}>
          Cambiar plan, estado, extender trial, actualizar notas internas.
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={handleImpersonate}
          disabled={impersonating}
          style={{
            background: "transparent",
            color: "#B4F965",
            border: "1px solid rgba(180, 249, 101, 0.5)",
            borderRadius: 8,
            padding: "10px 18px",
            fontSize: 12,
            fontWeight: 800,
            cursor: impersonating ? "wait" : "pointer",
            opacity: impersonating ? 0.6 : 1,
          }}
        >
          {impersonating ? "Entrando..." : "👁️ Entrar como agencia"}
        </button>
        <button
          onClick={() => setOpen(true)}
          style={{
            background: "#B4F965",
            color: "#0F1D27",
            border: "none",
            borderRadius: 8,
            padding: "10px 18px",
            fontSize: 12,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          ⚙ Gestionar
        </button>
      </div>

      {open && (
        <AgencyActionsModal
          agency={agency}
          onClose={() => setOpen(false)}
        />
      )}
    </section>
  );
}
