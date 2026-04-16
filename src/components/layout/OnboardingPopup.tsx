'use client';

import { useState, useEffect } from 'react';

interface OnboardingPopupProps {
  hasClients: boolean;
}

const STORAGE_KEY = 'socialgo_onboarding_dismissed';

export function OnboardingPopup({ hasClients }: OnboardingPopupProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (hasClients) return;
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed === 'true') return;
    // Small delay so it doesn't flash on load
    const timer = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(timer);
  }, [hasClients]);

  if (!visible) return null;

  const dismiss = (permanent: boolean) => {
    if (permanent) localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  };

  const steps = [
    {
      number: '1',
      title: 'Crea tus paquetes',
      desc: 'Define los servicios y precios que ofreces a tus clientes.',
      icon: '📦',
    },
    {
      number: '2',
      title: 'Agrega a tus clientes',
      desc: 'Registra las marcas que manejas con su info y paquete.',
      icon: '👥',
    },
    {
      number: '3',
      title: 'Invita a tu equipo',
      desc: 'Agrega creativos desde Agencia → Equipo.',
      icon: '⚙️',
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60]"
        onClick={() => dismiss(false)}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          style={{ border: '1px solid rgba(148,163,184,0.25)' }}
        >
          {/* Header */}
          <div
            className="px-6 pt-6 pb-4 text-center"
            style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(255,186,138,0.1))' }}
          >
            <div className="text-3xl mb-2">🚀</div>
            <h2
              className="font-serif text-xl font-bold"
              style={{ color: '#0F172A' }}
            >
              ¡Bienvenido a SocialGo!
            </h2>
            <p className="text-sm mt-1" style={{ color: '#334155' }}>
              Configura tu agencia en 3 pasos
            </p>
          </div>

          {/* Steps */}
          <div className="px-6 py-5 space-y-4">
            {steps.map((step) => (
              <div key={step.number} className="flex items-start gap-3">
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #6366F1, #A78BFA)' }}
                >
                  {step.number}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold flex items-center gap-1.5" style={{ color: '#0F172A' }}>
                    <span>{step.icon}</span> {step.title}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 flex flex-col gap-2">
            <button
              onClick={() => dismiss(false)}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-white transition hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg, #6366F1, #A78BFA)' }}
            >
              ¡Entendido, empezar!
            </button>
            <button
              onClick={() => dismiss(true)}
              className="w-full py-2 text-xs transition hover:opacity-70"
              style={{ color: '#64748B' }}
            >
              No volver a mostrar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
