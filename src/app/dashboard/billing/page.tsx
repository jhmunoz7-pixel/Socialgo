'use client';

import { useOrganization } from '@/lib/hooks';
import { CreditCard } from 'lucide-react';

/**
 * Billing page — SocialGo glassmorphism
 * Shows current plan info and links to Stripe portal
 */
export default function BillingPage() {
  const { data: org, loading } = useOrganization();

  const planLabels: Record<string, string> = {
    free: 'Free',
    pro: 'Pro',
    full_access: 'Full Access',
  };

  const planColors: Record<string, { bg: string; text: string }> = {
    free: { bg: '#E8D5FF', text: '#5B3D8A' },
    pro: { bg: '#FFD0D8', text: '#8A1F35' },
    full_access: { bg: '#FFD4B8', text: '#8A5A20' },
  };

  const statusLabels: Record<string, string> = {
    trialing: 'Prueba gratuita',
    active: 'Activo',
    past_due: 'Pago pendiente',
    canceled: 'Cancelado',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#FF8FAD', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  const plan = org?.plan || 'free';
  const planStatus = org?.plan_status || 'active';
  const billingCycle = org?.billing_cycle || 'monthly';
  const clientLimit = org?.client_limit || 1;
  const colors = planColors[plan] || planColors.free;

  const handlePortal = async () => {
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Error opening billing portal:', err);
    }
  };

  return (
    <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif font-bold" style={{ color: 'var(--text-dark)' }}>
          <span className="flex items-center gap-2"><CreditCard className="w-5 h-5" style={{ color: 'var(--primary-deep)' }} /> Facturación</span>
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-mid)' }}>
          Gestiona tu suscripción y método de pago
        </p>
      </div>

      {/* Current Plan */}
      <div
        className="rounded-2xl border border-white/40 shadow-sm p-6"
        style={{ background: 'rgba(255,248,243,0.7)', backdropFilter: 'blur(16px)' }}
      >
        <h2 className="text-lg font-serif font-semibold mb-4" style={{ color: '#2A1F1A' }}>
          Plan actual
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#7A6560' }}>Plan</p>
            <span
              className="inline-block text-sm font-semibold px-3 py-1 rounded-full"
              style={{ background: colors.bg, color: colors.text }}
            >
              {planLabels[plan]}
            </span>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#7A6560' }}>Estado</p>
            <p className="text-sm font-medium" style={{ color: '#2A1F1A' }}>
              {statusLabels[planStatus] || planStatus}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#7A6560' }}>Ciclo</p>
            <p className="text-sm font-medium" style={{ color: '#2A1F1A' }}>
              {billingCycle === 'monthly' ? 'Mensual' : billingCycle === 'quarterly' ? 'Trimestral' : 'Anual'}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#7A6560' }}>Límite clientes</p>
            <p className="text-sm font-medium" style={{ color: '#2A1F1A' }}>
              {clientLimit}
            </p>
          </div>
        </div>

        <div className="mt-6 pt-4 flex gap-3" style={{ borderTop: '1px solid rgba(255,180,150,0.2)' }}>
          {plan === 'free' ? (
            <a
              href="/pricing"
              className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:shadow-lg hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #FF8FAD 0%, #FFBA8A 100%)' }}
            >
              Upgrade a Pro
            </a>
          ) : (
            <button
              onClick={handlePortal}
              className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:shadow-lg hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #FF8FAD 0%, #FFBA8A 100%)' }}
            >
              Gestionar suscripción
            </button>
          )}
        </div>
      </div>

      {/* Info */}
      <div
        className="rounded-2xl border border-white/40 shadow-sm p-6"
        style={{ background: 'rgba(232,213,255,0.2)', backdropFilter: 'blur(16px)' }}
      >
        <h3 className="text-base font-serif font-semibold mb-2" style={{ color: '#2A1F1A' }}>
          ¿Necesitas ayuda?
        </h3>
        <p className="text-sm" style={{ color: '#5A4A45' }}>
          Si tienes preguntas sobre tu facturación o necesitas una factura personalizada,
          escríbenos a <a href="mailto:hola@socialgo.app" className="underline" style={{ color: '#FF8FAD' }}>hola@socialgo.app</a>
        </p>
      </div>
    </div>
  );
}
