'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
// Icon replacements (no external dependency)
const Check = ({ className }: { className?: string }) => <span className={`text-green-600 font-bold ${className || ''}`}>✓</span>;
const X = ({ className }: { className?: string }) => <span className={`text-red-400 font-bold ${className || ''}`}>✕</span>;
const ChevronDown = ({ className }: { className?: string }) => (
  <span className={className} style={{ display: 'inline-block', fontSize: '14px' }}>▼</span>
);

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: '#FFF8F3' }} />}>
      <PricingPageInner />
    </Suspense>
  );
}

function PricingPageInner() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<'pro' | 'full_access' | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const autoTriggered = useRef(false);

  const handleSelectPlan = async (plan: 'pro' | 'full_access') => {
    setCheckoutError(null);
    setCheckoutLoading(plan);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      // Not logged in → send to signup with plan+cycle preserved
      if (!user) {
        window.location.href = `/auth/signup?plan=${plan}&cycle=${billingCycle}`;
        return;
      }

      // Logged in → start Stripe checkout directly
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, cycle: billingCycle }),
        credentials: 'include',
      });

      // If server says unauthorized, session is stale → force re-login
      if (res.status === 401) {
        window.location.href = `/auth/login?plan=${plan}&cycle=${billingCycle}`;
        return;
      }

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'No se pudo iniciar el checkout');
      }
      window.location.href = data.url;
    } catch (err) {
      console.error('Checkout error:', err);
      setCheckoutError(err instanceof Error ? err.message : 'Error desconocido');
      setCheckoutLoading(null);
    }
  };

  // Auto-trigger checkout if returning from login with ?auto=1&plan=...&cycle=...
  useEffect(() => {
    if (autoTriggered.current) return;
    const auto = searchParams?.get('auto');
    const plan = searchParams?.get('plan');
    const cycle = searchParams?.get('cycle') as 'monthly' | 'quarterly' | 'annual' | null;
    if (auto === '1' && (plan === 'pro' || plan === 'full_access') && cycle) {
      autoTriggered.current = true;
      setBillingCycle(cycle);
      handleSelectPlan(plan);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const prices = {
    monthly: {
      pro: 1100,
      fullAccess: 2300,
    },
    quarterly: {
      pro: 900,
      fullAccess: 1900,
    },
    annual: {
      pro: 750,
      fullAccess: 1500,
    },
  };

  const currentPrices = prices[billingCycle];

  const formatPrice = (price: number) => {
    return `MXN ${price.toLocaleString('es-MX')}`;
  };

  // Prices in the `prices` object are already monthly equivalents,
  // so just return as-is regardless of billing cycle.
  const getMonthlyPrice = (price: number) => price;

  const billingLabels = {
    monthly: '/mes',
    quarterly: '/mes (facturado c/3 meses)',
    annual: '/mes (facturado anualmente)',
  };

  const features = {
    free: [
      '1 cliente',
      'Parrilla de contenido',
      'AI Score básico (3/mes)',
      'Calendario',
      '100MB assets',
      'No',
      'Email (respuesta en 48h)',
      'No',
    ],
    pro: [
      'Hasta 5 clientes',
      'Parrilla ilimitada',
      'AI Score ilimitado',
      'Calendario + Assets 5GB',
      '5GB assets',
      'Reportes por cliente',
      'Email',
      'API REST básica',
    ],
    fullAccess: [
      'Hasta 20 clientes',
      'Todo en Pro',
      'AI Score ilimitado',
      'Calendario + Assets 25GB',
      '25GB assets',
      'Reportes avanzados',
      'Soporte prioritario',
      'API REST + Webhooks',
    ],
  };

  const featureLabels = [
    'Clientes',
    'Parrilla de contenido',
    'AI Score',
    'Calendario & Assets',
    'Almacenamiento',
    'Reportes',
    'Soporte',
    'API Access',
  ];

  const faqItems = [
    {
      question: '¿Cómo funciona la prueba gratis?',
      answer: 'Obtén acceso completo a tu plan elegido durante 14 días sin necesidad de tarjeta de crédito. Después de los 14 días, tu plan se activará con el método de pago que registres.',
    },
    {
      question: '¿Puedo cambiar de plan en cualquier momento?',
      answer: 'Sí, puedes actualizar o cambiar de plan en cualquier momento. Si cambias durante tu período de facturación, ajustaremos el costo de forma proporcional.',
    },
    {
      question: '¿Aceptan tarjetas mexicanas?',
      answer: 'Sí, aceptamos todas las tarjetas de crédito y débito mexicanas, así como Oxxo Pay y otros métodos de pago locales a través de Stripe.',
    },
    {
      question: '¿Qué pasa si necesito más de 20 clientes?',
      answer: 'Contáctanos para planes personalizados. Ofrecemos soluciones a medida para agencias grandes con requerimientos específicos.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F3] to-white relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#FFB5C8]/20 to-[#E8D5FF]/20 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-[#FFD4B8]/20 to-[#FFB5C8]/20 rounded-full blur-3xl -z-10" />

      {/* Navbar */}
      <nav className="border-b border-white/20 backdrop-blur-md bg-white/30 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-serif text-xl font-bold text-[#2A1F1A]">socialgo</span>
            <div className="w-2 h-2 bg-gradient-to-r from-[#FF8FAD] to-[#FFBA8A] rounded-full" />
          </Link>

          <div className="hidden md:flex gap-8">
            <Link href="/" className="text-sm text-[#5A4A45] hover:text-[#2A1F1A] transition">
              Inicio
            </Link>
            <Link href="/#features" className="text-sm text-[#5A4A45] hover:text-[#2A1F1A] transition">
              Funcionalidades
            </Link>
            <Link href="/#faq" className="text-sm text-[#5A4A45] hover:text-[#2A1F1A] transition">
              FAQ
            </Link>
          </div>

          <div className="flex gap-3">
            <Link
              href="/auth/login"
              className="px-4 py-2 text-sm text-[#2A1F1A] hover:bg-white/30 rounded-lg transition"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/auth/signup"
              className="px-4 py-2 text-sm text-white bg-gradient-to-r from-[#FF8FAD] to-[#FFBA8A] rounded-lg hover:shadow-lg transition"
            >
              Empezar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-16 md:py-24 text-center">
        <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-[#2A1F1A] mb-4">
          Planes simples, resultados potentes
        </h1>
        <p className="text-lg text-[#5A4A45] max-w-2xl mx-auto">
          Elige el plan perfecto para tu agencia. Todos incluyen 14 días de prueba gratis.
        </p>
      </section>

      {/* Billing Cycle Toggle */}
      <section className="max-w-3xl mx-auto px-6 mb-16">
        <div className="flex justify-center gap-4 p-2 bg-white/40 rounded-2xl backdrop-blur-sm border border-white/60 w-fit mx-auto">
          {(['monthly', 'quarterly', 'annual'] as const).map((cycle) => (
            <button
              key={cycle}
              onClick={() => setBillingCycle(cycle)}
              className={`px-6 py-3 rounded-xl transition font-sans text-sm font-medium ${
                billingCycle === cycle
                  ? 'bg-gradient-to-r from-[#FF8FAD] to-[#FFBA8A] text-white'
                  : 'text-[#5A4A45] hover:text-[#2A1F1A]'
              }`}
            >
              {cycle === 'monthly' && 'Mensual'}
              {cycle === 'quarterly' && 'Trimestral'}
              {cycle === 'annual' && 'Anual'}
            </button>
          ))}
        </div>
        {billingCycle === 'annual' && (
          <div className="flex justify-center mt-4">
            <span className="inline-block bg-gradient-to-r from-[#FF8FAD] to-[#FFBA8A] text-white px-4 py-1 rounded-full text-xs font-semibold">
              Ahorra 32%
            </span>
          </div>
        )}
      </section>

      {/* Checkout error banner */}
      {checkoutError && (
        <section className="max-w-3xl mx-auto px-6 mb-8">
          <div className="rounded-xl p-4 bg-red-50 border border-red-200 text-sm text-red-700">
            {checkoutError}
          </div>
        </section>
      )}

      {/* Pricing Cards */}
      <section className="max-w-7xl mx-auto px-6 mb-20">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Free Plan */}
          <div className="rounded-2xl p-8 bg-white/60 backdrop-blur-md border border-white/80">
            <h3 className="font-serif text-2xl font-bold text-[#2A1F1A] mb-2">Free</h3>
            <p className="text-[#5A4A45] text-sm mb-6">1 cliente</p>
            <div className="mb-6">
              <div className="text-3xl font-bold text-[#2A1F1A]">
                MXN <span className="text-4xl">0</span>
              </div>
              <p className="text-[#5A4A45] text-sm mt-2">siempre</p>
            </div>

            <Link
              href="/auth/signup"
              className="w-full block text-center px-6 py-3 rounded-lg bg-white text-[#FF8FAD] font-semibold hover:bg-gray-50 transition mb-8 border border-[#FFB5C8]"
            >
              Empezar gratis
            </Link>

            <div className="space-y-4">
              {features.free.map((feature, idx) => (
                <div key={idx} className="flex gap-3 items-start">
                  {feature === 'No' || !feature ? (
                    <X className="w-5 h-5 text-[#7A6560] flex-shrink-0 mt-0.5" />
                  ) : (
                    <Check className="w-5 h-5 text-[#FF8FAD] flex-shrink-0 mt-0.5" />
                  )}
                  <span className="text-[#5A4A45] text-sm">{feature === 'No' ? featureLabels[features.free.indexOf(feature)] : feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pro Plan (Popular) */}
          <div className="rounded-3xl p-8 bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-md border-2 border-[#FF8FAD] relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <span className="inline-block bg-gradient-to-r from-[#FF8FAD] to-[#FFBA8A] text-white px-4 py-1 rounded-full text-xs font-semibold">
                Popular
              </span>
            </div>

            <h3 className="font-serif text-2xl font-bold text-[#2A1F1A] mb-2 mt-4">Pro</h3>
            <p className="text-[#5A4A45] text-sm mb-6">2-5 clientes</p>
            <div className="mb-6">
              <div className="text-3xl font-bold text-[#2A1F1A]">
                {formatPrice(getMonthlyPrice(currentPrices.pro))}
              </div>
              <p className="text-[#5A4A45] text-sm mt-2">
                {billingCycle !== 'monthly' && (
                  <span className="line-through inline-block mr-2">
                    MXN {prices.monthly.pro}
                  </span>
                )}
                <span>{billingLabels[billingCycle]}</span>
              </p>
            </div>

            <button
              onClick={() => handleSelectPlan('pro')}
              disabled={checkoutLoading !== null}
              className="w-full block text-center px-6 py-3 rounded-lg bg-gradient-to-r from-[#FF8FAD] to-[#FFBA8A] text-white font-semibold hover:shadow-lg transition mb-8 disabled:opacity-60"
            >
              {checkoutLoading === 'pro' ? 'Cargando...' : 'Iniciar prueba gratis'}
            </button>

            <div className="space-y-4">
              {features.pro.map((feature, idx) => (
                <div key={idx} className="flex gap-3 items-start">
                  <Check className="w-5 h-5 text-[#FF8FAD] flex-shrink-0 mt-0.5" />
                  <span className="text-[#5A4A45] text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Full Access Plan */}
          <div className="rounded-2xl p-8 bg-white/60 backdrop-blur-md border border-white/80">
            <h3 className="font-serif text-2xl font-bold text-[#2A1F1A] mb-2">Full Access</h3>
            <p className="text-[#5A4A45] text-sm mb-6">6-20 clientes</p>
            <div className="mb-6">
              <div className="text-3xl font-bold text-[#2A1F1A]">
                {formatPrice(getMonthlyPrice(currentPrices.fullAccess))}
              </div>
              <p className="text-[#5A4A45] text-sm mt-2">
                {billingCycle !== 'monthly' && (
                  <span className="line-through inline-block mr-2">
                    MXN {prices.monthly.fullAccess}
                  </span>
                )}
                <span>{billingLabels[billingCycle]}</span>
              </p>
            </div>

            <button
              onClick={() => handleSelectPlan('full_access')}
              disabled={checkoutLoading !== null}
              className="w-full block text-center px-6 py-3 rounded-lg bg-white text-[#FF8FAD] font-semibold hover:bg-gray-50 transition mb-8 border border-[#FFB5C8] disabled:opacity-60"
            >
              {checkoutLoading === 'full_access' ? 'Cargando...' : 'Iniciar prueba gratis'}
            </button>

            <div className="space-y-4">
              {features.fullAccess.map((feature, idx) => (
                <div key={idx} className="flex gap-3 items-start">
                  <Check className="w-5 h-5 text-[#FF8FAD] flex-shrink-0 mt-0.5" />
                  <span className="text-[#5A4A45] text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="max-w-6xl mx-auto px-6 mb-20">
        <div className="rounded-3xl p-8 bg-white/60 backdrop-blur-md border border-white/80 overflow-x-auto">
          <h2 className="font-serif text-3xl font-bold text-[#2A1F1A] mb-8">Comparativa de planes</h2>
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/40">
                <th className="text-left py-4 px-4 text-[#2A1F1A] font-semibold">Funcionalidad</th>
                <th className="text-center py-4 px-4 text-[#2A1F1A] font-semibold">Free</th>
                <th className="text-center py-4 px-4 text-[#2A1F1A] font-semibold">Pro</th>
                <th className="text-center py-4 px-4 text-[#2A1F1A] font-semibold">Full Access</th>
              </tr>
            </thead>
            <tbody>
              {featureLabels.map((label, idx) => (
                <tr key={idx} className="border-b border-white/20 hover:bg-white/30 transition">
                  <td className="py-4 px-4 text-[#5A4A45] font-medium">{label}</td>
                  <td className="text-center py-4 px-4">
                    {features.free[idx] === 'No' ? (
                      <X className="w-5 h-5 text-[#7A6560] mx-auto" />
                    ) : features.free[idx] === '1 cliente' ? (
                      <span className="text-[#5A4A45] text-sm">1</span>
                    ) : (
                      <Check className="w-5 h-5 text-[#FF8FAD] mx-auto" />
                    )}
                  </td>
                  <td className="text-center py-4 px-4">
                    {features.pro[idx] === 'No' ? (
                      <X className="w-5 h-5 text-[#7A6560] mx-auto" />
                    ) : features.pro[idx].startsWith('Hasta') ? (
                      <span className="text-[#5A4A45] text-sm">5</span>
                    ) : (
                      <Check className="w-5 h-5 text-[#FF8FAD] mx-auto" />
                    )}
                  </td>
                  <td className="text-center py-4 px-4">
                    {features.fullAccess[idx] === 'No' ? (
                      <X className="w-5 h-5 text-[#7A6560] mx-auto" />
                    ) : features.fullAccess[idx].startsWith('Hasta') ? (
                      <span className="text-[#5A4A45] text-sm">20</span>
                    ) : (
                      <Check className="w-5 h-5 text-[#FF8FAD] mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 mb-20" id="faq">
        <h2 className="font-serif text-3xl font-bold text-[#2A1F1A] mb-12 text-center">
          Preguntas frecuentes
        </h2>
        <div className="space-y-4">
          {faqItems.map((item, idx) => (
            <div
              key={idx}
              className="rounded-2xl bg-white/60 backdrop-blur-md border border-white/80 overflow-hidden"
            >
              <button
                onClick={() => setOpenFAQ(openFAQ === idx ? null : idx)}
                className="w-full px-8 py-6 flex justify-between items-center hover:bg-white/40 transition text-left"
              >
                <span className="font-semibold text-[#2A1F1A]">{item.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-[#FF8FAD] transition-transform ${
                    openFAQ === idx ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFAQ === idx && (
                <div className="px-8 pb-6 text-[#5A4A45] border-t border-white/40 pt-4">
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/20 bg-white/30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="font-serif text-lg font-bold text-[#2A1F1A]">socialgo</span>
                <div className="w-2 h-2 bg-gradient-to-r from-[#FF8FAD] to-[#FFBA8A] rounded-full" />
              </div>
              <p className="text-[#7A6560] text-sm">By Loonshot Labs</p>
            </div>

            <div>
              <h4 className="font-semibold text-[#2A1F1A] mb-4 text-sm">Producto</h4>
              <ul className="space-y-2 text-[#5A4A45] text-sm">
                <li>
                  <Link href="/" className="hover:text-[#2A1F1A] transition">
                    Inicio
                  </Link>
                </li>
                <li>
                  <Link href="/#features" className="hover:text-[#2A1F1A] transition">
                    Funcionalidades
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-[#2A1F1A] transition">
                    Precios
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-[#2A1F1A] mb-4 text-sm">Empresa</h4>
              <ul className="space-y-2 text-[#5A4A45] text-sm">
                <li>
                  <Link href="#" className="hover:text-[#2A1F1A] transition">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-[#2A1F1A] transition">
                    Contáctanos
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-[#2A1F1A] mb-4 text-sm">Legal</h4>
              <ul className="space-y-2 text-[#5A4A45] text-sm">
                <li>
                  <Link href="#" className="hover:text-[#2A1F1A] transition">
                    Privacidad
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-[#2A1F1A] transition">
                    Términos
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/40 pt-8 flex justify-between items-center text-[#7A6560] text-sm">
            <p>© 2026 Loonshot Labs. Todos los derechos reservados.</p>
            <div className="flex gap-6">
              <Link href="#" className="hover:text-[#2A1F1A] transition">
                Twitter
              </Link>
              <Link href="#" className="hover:text-[#2A1F1A] transition">
                Instagram
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
