'use client';

import { useEffect, useState } from 'react';
import { X, Sparkles, Users, Paintbrush, Eye, UserCheck, Rocket } from 'lucide-react';

const STORAGE_KEY = 'sg_calendar_flow_popup_dismissed';

const STEPS = [
  {
    icon: Sparkles,
    accent: '#94A3B8',
    title: '1. Planifica el mes',
    body: 'Crea propuestas de post (sin diseño aún) con una fecha tentativa y un copy preliminar.',
  },
  {
    icon: Users,
    accent: '#F59E0B',
    title: '2. El cliente aprueba la propuesta',
    body: 'El cliente ve las propuestas en su calendario y confirma temas/fechas antes de que arranque el trabajo creativo.',
  },
  {
    icon: Paintbrush,
    accent: '#6366F1',
    title: '3. Los creativos cargan el diseño',
    body: 'Vinculan cada post a la página específica de un diseño Canva. El thumbnail aparece en el calendario automáticamente.',
  },
  {
    icon: Eye,
    accent: '#A78BFA',
    title: '4. Revisión interna',
    body: 'El dueño de la agencia revisa copy + diseño, deja comentarios y aprueba para que pase al cliente.',
  },
  {
    icon: UserCheck,
    accent: '#F59E0B',
    title: '5. Revisión con el cliente',
    body: 'El cliente ve el post final en vista simple, aprueba o pide ajustes.',
  },
  {
    icon: Rocket,
    accent: '#38BDF8',
    title: '6. Programar y publicar',
    body: 'Una vez aprobado, el admin programa el post y SocialGo lo publica automáticamente el día y hora indicados.',
  },
];

interface FlowOnboardingProps {
  /** When true, forces the popup open (used by the "¿Cómo funciona?" button). */
  forceOpen?: boolean;
  /** Called when the popup closes (either dismiss). Used to reset forceOpen. */
  onClose?: () => void;
}

export function FlowOnboarding({ forceOpen, onClose }: FlowOnboardingProps = {}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) setOpen(true);
  }, []);

  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  const dismiss = (persist: boolean) => {
    if (persist && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, '1');
    }
    setOpen(false);
    onClose?.();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.4)' }}
      onClick={() => dismiss(false)}
    >
      <div
        className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        style={{ background: 'white' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-5 flex items-start justify-between flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 50%, #FDF4FF 100%)' }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)' }}
            >
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold" style={{ color: '#312E81' }}>
                El flujo de contenido, en 6 pasos
              </h2>
              <p className="text-xs mt-1" style={{ color: '#6366F1' }}>
                Así viaja un post desde la propuesta hasta estar publicado en Instagram.
              </p>
            </div>
          </div>
          <button
            onClick={() => dismiss(false)}
            className="w-7 h-7 rounded-md hover:bg-white/60 flex items-center justify-center flex-shrink-0"
            style={{ color: 'var(--text-mid)' }}
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Steps */}
        <div className="p-5 overflow-y-auto space-y-2">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="flex items-start gap-3 p-3 rounded-xl"
                style={{ background: '#F8FAFC', border: '1px solid var(--glass-border)' }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${step.accent}18` }}
                >
                  <Icon className="w-4 h-4" style={{ color: step.accent }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-dark)' }}>
                    {step.title}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-mid)' }}>
                    {step.body}
                  </p>
                </div>
              </div>
            );
          })}

          <div
            className="p-3 rounded-xl mt-2 text-xs"
            style={{ background: '#ECFDF5', border: '1px solid rgba(16,185,129,0.25)', color: '#065F46' }}
          >
            💡 <b>Tip:</b> arrastra un post a otro día para reprogramarlo, o al panel de la izquierda
            para mover manualmente de etapa.
          </div>
        </div>

        {/* Footer */}
        <div
          className="p-4 border-t flex items-center justify-between flex-shrink-0"
          style={{ borderColor: 'var(--glass-border)' }}
        >
          <button
            onClick={() => dismiss(false)}
            className="text-xs font-medium px-3 py-2 rounded-lg hover:bg-slate-50"
            style={{ color: 'var(--text-mid)' }}
          >
            Recordármelo luego
          </button>
          <button
            onClick={() => dismiss(true)}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-sm hover:shadow-md"
            style={{ background: 'linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)' }}
          >
            Entendido, empezar
          </button>
        </div>
      </div>
    </div>
  );
}
