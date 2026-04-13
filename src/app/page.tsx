'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';

// ── Utility Components ──────────────────────────────────────

function ScrollProgressBar() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const h = () => {
      const d = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(d > 0 ? (window.scrollY / d) * 100 : 0);
    };
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);
  return (
    <div className="fixed top-0 left-0 h-1 z-[60] transition-all duration-300" style={{ width: `${progress}%`, background: 'linear-gradient(135deg, #FF8FAD 0%, #FFBA8A 100%)' }} />
  );
}

function FadeUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setTimeout(() => setVis(true), delay * 100); obs.unobserve(e.target); } }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);
  return <div ref={ref} style={{ opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(30px)', transition: 'all 0.6s ease-out' }}>{children}</div>;
}

function MorphText() {
  const words = ['intuitiva', 'potente', 'confiable', 'rápida'];
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);
  useEffect(() => {
    const timer = setInterval(() => {
      setFade(false);
      setTimeout(() => { setIdx(p => (p + 1) % words.length); setFade(true); }, 250);
    }, 600);
    return () => clearInterval(timer);
  }, []);
  return (
    <span style={{ display: 'inline-block', minWidth: '140px', opacity: fade ? 1 : 0, transform: fade ? 'translateY(0)' : 'translateY(8px)', transition: 'all 0.3s ease-in-out' }}>
      {words[idx]}
    </span>
  );
}

function CountUp({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        let c = 0; const inc = target / 30;
        const t = setInterval(() => { c += inc; if (c >= target) { setCount(target); clearInterval(t); } else setCount(Math.floor(c)); }, 30);
        obs.unobserve(e.target);
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target]);
  return <span ref={ref}>{count}{suffix}</span>;
}

function TiltCard({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState('');
  return (
    <div ref={ref}
      onMouseMove={e => { if (!ref.current) return; const r = ref.current.getBoundingClientRect(); setT(`perspective(1000px) rotateX(${(e.clientY - r.top - r.height / 2) / 12}deg) rotateY(${-(e.clientX - r.left - r.width / 2) / 12}deg) scale(1.02)`); }}
      onMouseLeave={() => setT('')}
      style={{ transform: t, transition: 'transform 0.3s ease-out' }}>{children}</div>
  );
}

function CursorGlow() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const m = (e: MouseEvent) => { setPos({ x: e.clientX, y: e.clientY }); setVis(true); };
    const l = () => setVis(false);
    window.addEventListener('mousemove', m); window.addEventListener('mouseleave', l);
    return () => { window.removeEventListener('mousemove', m); window.removeEventListener('mouseleave', l); };
  }, []);
  return <div style={{ position: 'fixed', left: pos.x, top: pos.y, width: 400, height: 400, marginLeft: -200, marginTop: -200, pointerEvents: 'none', zIndex: 1, opacity: vis ? 0.5 : 0, transition: 'opacity 0.3s', background: 'radial-gradient(circle, rgba(255,143,173,0.25) 0%, transparent 70%)', filter: 'blur(40px)' }} />;
}

function MagneticButton({ children, className = '', style = {}, onClick }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; onClick?: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [p, setP] = useState({ x: 0, y: 0 });
  return (
    <button ref={ref} className={className} onClick={onClick}
      onMouseMove={e => { if (!ref.current) return; const r = ref.current.getBoundingClientRect(); const mx = e.clientX - r.left - r.width / 2, my = e.clientY - r.top - r.height / 2; const d = Math.sqrt(mx ** 2 + my ** 2); if (d < 100) setP({ x: (mx / d) * 8, y: (my / d) * 8 }); }}
      onMouseLeave={() => setP({ x: 0, y: 0 })}
      style={{ ...style, transform: `translate(${p.x}px, ${p.y}px)`, transition: 'transform 0.2s ease-out' }}>{children}</button>
  );
}

// ── Tablet Mockup ───────────────────────────────────────────

const TOTAL_SCREENS = 7;

function ScreenShell({ active, icon, title, subtitle, children }: { active: string; icon: string; title: string; subtitle?: string; children: React.ReactNode }) {
  const navItems = ['Clientes', 'Paquetes', 'Reportes', 'Planificación', 'Contenido', 'Assets', 'AI Studio'];
  return (
    <div style={{ display: 'flex', gap: 10, height: '100%' }}>
      <div style={{ width: '26%', display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
          <img src="/socialgo-wordmark-light-cropped.svg" alt="SocialGo" style={{ height: 12 }} />
        </div>
        {navItems.map((n) => (
          <div key={n} style={{ padding: '4px 7px', borderRadius: 5, fontSize: 8, color: n === active ? '#fff' : '#5A4A45', background: n === active ? 'linear-gradient(135deg, #FF8FAD, #FFBA8A)' : 'transparent', fontWeight: n === active ? 600 : 400 }}>{n}</div>
        ))}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
        <div style={{ fontFamily: 'serif', fontWeight: 'bold', fontSize: 12, color: '#2A1F1A' }}>{icon} {title}</div>
        {subtitle && <div style={{ fontSize: 7, color: '#7A6560', marginTop: -4 }}>{subtitle}</div>}
        {children}
      </div>
    </div>
  );
}

function StatCards({ items }: { items: { l: string; v: string; c?: string }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 5 }}>
      {items.map((s, i) => (
        <div key={i} style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,180,150,0.2)', borderRadius: 7, padding: '5px 7px' }}>
          <div style={{ fontSize: 6, color: '#7A6560', textTransform: 'uppercase', fontWeight: 600 }}>{s.l}</div>
          <div style={{ fontSize: 13, fontWeight: 'bold', color: s.c || '#2A1F1A', fontFamily: 'serif' }}>{s.v}</div>
        </div>
      ))}
    </div>
  );
}

function TabletMockup() {
  const [screen, setScreen] = useState(0);
  useEffect(() => { const t = setInterval(() => setScreen(p => (p + 1) % TOTAL_SCREENS), 930); return () => clearInterval(t); }, []);

  const screens = [
    /* 0: Clientes */
    <ScreenShell key={0} active="Clientes" icon="👥" title="Clientes" subtitle="Gestiona cuentas, contratos y estatus">
      <StatCards items={[{ l: 'MRR Total', v: '$4,800' }, { l: 'Clientes', v: '8' }, { l: 'Posts', v: '47' }, { l: 'Pendientes', v: '1' }]} />
      <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: 8, border: '1px solid rgba(255,180,150,0.15)', overflow: 'hidden', flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '5px 8px', fontSize: 6, fontWeight: 600, color: '#7A6560', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,180,150,0.1)' }}>
          <div>Marca</div><div>Paquete</div><div>Tipo</div><div>Pago</div><div>Status</div>
        </div>
        {[
          { n: 'Glow Studio', e: '💄', pk: 'Pro', t: 'monthly', pr: '$800', st: 'Activo', sc: '#4CAF82' },
          { n: 'Beautify Co', e: '💅', pk: 'Full', t: 'quarterly', pr: '$1,200', st: 'Activo', sc: '#4CAF82' },
          { n: 'Aura Design', e: '🎨', pk: 'Pro', t: 'monthly', pr: '$800', st: 'Activo', sc: '#4CAF82' },
          { n: 'CaféRico', e: '☕', pk: 'Starter', t: 'monthly', pr: '$450', st: 'Onboarding', sc: '#FFB347' },
        ].map((c, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '5px 8px', fontSize: 7, color: '#2A1F1A', borderBottom: '1px solid rgba(255,180,150,0.06)', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600 }}><span style={{ fontSize: 9 }}>{c.e}</span>{c.n}</div>
            <div><span style={{ background: 'rgba(255,143,173,0.15)', padding: '1px 4px', borderRadius: 3, fontSize: 6, fontWeight: 600, color: '#FF8FAD' }}>{c.pk}</span></div>
            <div style={{ color: '#7A6560' }}>{c.t}</div>
            <div style={{ fontWeight: 600 }}>{c.pr}</div>
            <div><span style={{ background: `${c.sc}20`, color: c.sc, padding: '1px 4px', borderRadius: 3, fontSize: 6, fontWeight: 600 }}>{c.st}</span></div>
          </div>
        ))}
      </div>
    </ScreenShell>,

    /* 1: Paquetes */
    <ScreenShell key={1} active="Paquetes" icon="📦" title="Paquetes">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, flex: 1 }}>
        {[
          { name: 'Full Access', tag: 'Destacado', price: '$6,000', badges: ['-10% trim', '-15% sem', '-20% anual'] },
          { name: 'Basic', tag: null, price: '$3,800', badges: ['-10% trim', '-15% sem', '-20% anual'] },
        ].map((p, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.6)', borderRadius: 10, border: '1px solid rgba(255,180,150,0.15)', padding: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <div style={{ fontWeight: 'bold', fontSize: 11, color: '#2A1F1A' }}>{p.name}</div>
              {p.tag && <span style={{ background: '#FF8FAD', color: '#fff', fontSize: 6, padding: '1px 5px', borderRadius: 8, fontWeight: 600 }}>{p.tag}</span>}
            </div>
            <div style={{ fontFamily: 'serif', fontWeight: 'bold', fontSize: 20, color: '#FF8FAD', marginBottom: 6 }}>{p.price} <span style={{ fontSize: 8, color: '#7A6560', fontWeight: 400 }}>MXN</span></div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {p.badges.map((b, j) => <span key={j} style={{ background: 'rgba(76,175,130,0.12)', color: '#4CAF82', fontSize: 6, padding: '2px 5px', borderRadius: 4, fontWeight: 600 }}>{b}</span>)}
            </div>
          </div>
        ))}
      </div>
    </ScreenShell>,

    /* 2: Reportes */
    <ScreenShell key={2} active="Reportes" icon="📊" title="Reportes" subtitle="Análisis de rendimiento y estadísticas">
      <StatCards items={[{ l: 'Clientes Activos', v: '5' }, { l: 'MRR Total', v: '$5,400' }, { l: 'Posts Este Mes', v: '23' }, { l: 'Pagos Pendientes', v: '0' }]} />
      <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: 8, border: '1px solid rgba(255,180,150,0.15)', overflow: 'hidden', flex: 1 }}>
        <div style={{ fontWeight: 'bold', fontSize: 9, color: '#2A1F1A', padding: '6px 8px', borderBottom: '1px solid rgba(255,180,150,0.1)' }}>Rendimiento por Cliente</div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '4px 8px', fontSize: 6, fontWeight: 600, color: '#7A6560', textTransform: 'uppercase' }}>
          <div>Cliente</div><div>Posts</div><div>AI Score</div><div>Pago</div><div>Status</div>
        </div>
        {[
          { n: 'Beautify Co', p: '8', s: '87', pay: 'Pagado', st: 'Activo' },
          { n: 'Glow Studio', p: '6', s: '72', pay: 'Pagado', st: 'Activo' },
          { n: 'CaféRico', p: '4', s: '—', pay: 'Pagado', st: 'Onboarding' },
        ].map((r, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '4px 8px', fontSize: 7, color: '#2A1F1A', borderTop: '1px solid rgba(255,180,150,0.06)' }}>
            <div style={{ fontWeight: 600 }}>{r.n}</div><div>{r.p}</div><div>{r.s}</div>
            <div><span style={{ background: 'rgba(76,175,130,0.12)', color: '#4CAF82', fontSize: 6, padding: '1px 4px', borderRadius: 3 }}>{r.pay}</span></div>
            <div><span style={{ background: r.st === 'Activo' ? 'rgba(76,175,130,0.12)' : 'rgba(255,179,71,0.15)', color: r.st === 'Activo' ? '#4CAF82' : '#FFB347', fontSize: 6, padding: '1px 4px', borderRadius: 3 }}>{r.st}</span></div>
          </div>
        ))}
      </div>
    </ScreenShell>,

    /* 3: Planificación */
    <ScreenShell key={3} active="Planificación" icon="📋" title="Planificación">
      <StatCards items={[{ l: 'Posts del mes', v: '12' }, { l: 'Pendientes', v: '4', c: '#FF8FAD' }, { l: 'Aprobados', v: '8', c: '#4CAF82' }]} />
      <div style={{ display: 'flex', gap: 8, flex: 1 }}>
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.6)', borderRadius: 8, padding: 6, border: '1px solid rgba(255,180,150,0.15)' }}>
          <div style={{ fontSize: 8, fontWeight: 600, color: '#2A1F1A', marginBottom: 4 }}>Nuevo Post</div>
          {['Cliente', 'Nombre', 'Tipo', 'Copy'].map((f, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.5)', borderRadius: 4, padding: '3px 6px', marginBottom: 3, fontSize: 6, color: '#7A6560', border: '1px solid rgba(255,180,150,0.1)' }}>{f}...</div>
          ))}
        </div>
        <div style={{ flex: 1.2, background: 'rgba(255,255,255,0.6)', borderRadius: 8, padding: 6, border: '1px solid rgba(255,180,150,0.15)' }}>
          <div style={{ fontWeight: 'bold', fontSize: 8, color: '#2A1F1A', marginBottom: 4, textAlign: 'center' }}>Abril 2026</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1, textAlign: 'center', fontSize: 6 }}>
            {['L','M','X','J','V','S','D'].map(d => <div key={d} style={{ color: '#FF8FAD', fontWeight: 600, padding: '1px 0' }}>{d}</div>)}
            {Array.from({ length: 30 }, (_, i) => <div key={i} style={{ padding: '2px 0', borderRadius: 3, color: '#2A1F1A', fontSize: 6, background: [6,8,14,20,22].includes(i) ? 'rgba(255,143,173,0.2)' : 'transparent', fontWeight: [6,8,14,20,22].includes(i) ? 700 : 400 }}>{i + 1}</div>)}
          </div>
        </div>
      </div>
    </ScreenShell>,

    /* 4: Contenido */
    <ScreenShell key={4} active="Contenido" icon="🎨" title="Contenido" subtitle="Revisa, aprueba y comenta los posts de la semana">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
        <span style={{ fontSize: 9, color: '#2A1F1A', fontWeight: 600 }}>◀ 6 abr – 12 abr 2026 ▶</span>
      </div>
      <StatCards items={[{ l: 'Total', v: '6' }, { l: 'Pendientes', v: '2', c: '#FF8FAD' }, { l: 'Aprobados', v: '3', c: '#4CAF82' }, { l: 'Rechazados', v: '1', c: '#E53935' }]} />
      <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: 8, border: '1px solid rgba(255,180,150,0.15)', flex: 1, display: 'flex', flexDirection: 'column', gap: 4, padding: 8 }}>
        {[
          { client: 'Glow Studio', title: 'Promo Mayo', status: 'Aprobado', sc: '#4CAF82' },
          { client: 'Beautify Co', title: 'Tip #12', status: 'Pendiente', sc: '#FF8FAD' },
          { client: 'CaféRico', title: 'Nuevo menú', status: 'Rechazado', sc: '#E53935' },
        ].map((p, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 6px', background: 'rgba(255,255,255,0.5)', borderRadius: 6, border: '1px solid rgba(255,180,150,0.08)' }}>
            <div><div style={{ fontSize: 8, fontWeight: 600, color: '#2A1F1A' }}>{p.title}</div><div style={{ fontSize: 6, color: '#7A6560' }}>{p.client}</div></div>
            <span style={{ background: `${p.sc}18`, color: p.sc, fontSize: 6, padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}>{p.status}</span>
          </div>
        ))}
      </div>
    </ScreenShell>,

    /* 5: Assets */
    <ScreenShell key={5} active="Assets" icon="📁" title="Assets" subtitle="Gestiona fotos, videos y plantillas">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, flex: 1 }}>
        {[
          { type: '📸 Foto', name: 'Campaign Banner', size: '2.4MB' },
          { type: '🎬 Video', name: 'Product Demo', size: '148MB' },
          { type: '🎨 Kit', name: 'Social Template Kit', size: '42.9MB' },
          { type: '📄 Plantilla', name: 'IG Post Template', size: '8.1MB' },
          { type: '📸 Foto', name: 'Brand Guidelines', size: '5.2MB' },
          { type: '🎬 Video', name: 'BTS Reel', size: '89MB' },
        ].map((a, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.6)', borderRadius: 8, border: '1px solid rgba(255,180,150,0.15)', padding: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ background: 'rgba(255,200,180,0.12)', borderRadius: 5, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{a.type.split(' ')[0]}</div>
            <span style={{ fontSize: 6, color: '#FF8FAD', fontWeight: 600 }}>{a.type}</span>
            <div style={{ fontSize: 7, fontWeight: 600, color: '#2A1F1A' }}>{a.name}</div>
            <div style={{ fontSize: 6, color: '#7A6560' }}>{a.size}</div>
          </div>
        ))}
      </div>
    </ScreenShell>,

    /* 6: AI Studio */
    <ScreenShell key={6} active="AI Studio" icon="⚡" title="AI Studio" subtitle="Analiza, genera y optimiza con IA">
      <div style={{ display: 'flex', gap: 8, flex: 1 }}>
        <div style={{ flex: 1.3, background: 'rgba(255,255,255,0.6)', borderRadius: 8, border: '1px solid rgba(255,180,150,0.15)', padding: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', gap: 8, fontSize: 7 }}>
            <span style={{ color: '#FF8FAD', fontWeight: 700, borderBottom: '2px solid #FF8FAD', paddingBottom: 2 }}>⚡ ANALIZAR</span>
            <span style={{ color: '#7A6560' }}>✨ GENERAR</span>
            <span style={{ color: '#7A6560' }}># HASHTAGS</span>
          </div>
          {[{ l: 'CLIENTE', v: 'Seleccionar...' }, { l: 'PLATAFORMA', v: '📷 Instagram' }, { l: 'COPY DEL POST', v: 'Escribe el copy...' }].map((f, i) => (
            <div key={i}>
              <div style={{ fontSize: 6, color: '#7A6560', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>{f.l}</div>
              <div style={{ background: 'rgba(255,255,255,0.5)', borderRadius: 5, padding: '4px 6px', fontSize: 7, color: '#999', border: '1px solid rgba(255,180,150,0.1)' }}>{f.v}</div>
            </div>
          ))}
          <div style={{ background: 'linear-gradient(135deg, #FF8FAD, #FFBA8A)', borderRadius: 6, padding: '5px 0', textAlign: 'center', fontSize: 8, color: '#fff', fontWeight: 700, marginTop: 'auto' }}>⚡ Analizar contenido</div>
        </div>
        <div style={{ flex: 0.8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: 8, border: '1px solid rgba(255,180,150,0.15)', padding: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 8, color: '#2A1F1A', marginBottom: 4 }}>Top AI Scores</div>
            {[{ n: 'Promo Mayo', s: 92 }, { n: 'Tip #12', s: 85 }, { n: 'Reel BTS', s: 78 }].map((t, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 7, marginBottom: 2 }}>
                <span style={{ color: '#5A4A45' }}>{t.n}</span>
                <span style={{ fontWeight: 700, color: t.s >= 85 ? '#4CAF82' : '#FFB347' }}>{t.s}</span>
              </div>
            ))}
          </div>
          <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: 8, border: '1px solid rgba(255,180,150,0.15)', padding: 8, flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 8, color: '#2A1F1A', marginBottom: 4 }}>Tips para mejor score</div>
            {['Objetivo claro', 'CTA fuerte', 'Hook emocional', 'Adapta al canal'].map((tip, i) => (
              <div key={i} style={{ fontSize: 6, color: '#5A4A45', marginBottom: 2 }}>🎯 {tip}</div>
            ))}
          </div>
        </div>
      </div>
    </ScreenShell>,
  ];

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 520, margin: '0 auto' }}>
      <div style={{ background: '#1a1a1a', borderRadius: 28, padding: '16px 12px', boxShadow: '0 40px 80px rgba(0,0,0,0.2)' }}>
        <div style={{ borderRadius: 16, overflow: 'hidden', background: '#FFF8F3', aspectRatio: '4/3', position: 'relative' }}>
          {screens.map((s, i) => (
            <div key={i} style={{ position: 'absolute', inset: 0, opacity: screen === i ? 1 : 0, transition: 'opacity 0.5s ease', padding: 14 }}>
              {s}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 10 }}>
        {Array.from({ length: TOTAL_SCREENS }, (_, i) => (
          <button key={i} onClick={() => setScreen(i)} style={{ width: screen === i ? 16 : 5, height: 5, borderRadius: 3, background: screen === i ? 'linear-gradient(135deg, #FF8FAD, #FFBA8A)' : 'rgba(0,0,0,0.12)', border: 'none', cursor: 'pointer', transition: 'all 0.3s' }} />
        ))}
      </div>
    </div>
  );
}

// ── Logo Carousel ───────────────────────────────────────────

function AgencyLogo({ name, color, shape }: { name: string; color: string; shape: string }) {
  const shapes: Record<string, React.ReactNode> = {
    circle: <circle cx="16" cy="16" r="12" fill={color} />,
    diamond: <rect x="6" y="6" width="20" height="20" rx="3" fill={color} transform="rotate(45 16 16)" />,
    triangle: <polygon points="16,4 28,28 4,28" fill={color} />,
    hexagon: <polygon points="16,2 28,9 28,23 16,30 4,23 4,9" fill={color} />,
    square: <rect x="4" y="4" width="24" height="24" rx="5" fill={color} />,
    star: <polygon points="16,2 20,12 30,12 22,19 25,30 16,23 7,30 10,19 2,12 12,12" fill={color} />,
    pill: <rect x="2" y="8" width="28" height="16" rx="8" fill={color} />,
    shield: <path d="M16 2 L28 8 L28 18 C28 24 22 29 16 30 C10 29 4 24 4 18 L4 8 Z" fill={color} />,
    drop: <path d="M16 2 C16 2 28 14 28 20 C28 26 22 30 16 30 C10 30 4 26 4 20 C4 14 16 2 16 2Z" fill={color} />,
    bolt: <polygon points="18,2 8,18 15,18 14,30 24,14 17,14" fill={color} />,
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 0.4, whiteSpace: 'nowrap', flexShrink: 0 }}>
      <svg width="32" height="32" viewBox="0 0 32 32">
        {shapes[shape]}
        <text x="16" y="18" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold" fontFamily="sans-serif">{name.charAt(0)}</text>
      </svg>
      <span style={{ fontSize: 14, fontWeight: 700, color: '#2A1F1A', letterSpacing: '0.3px' }}>{name}</span>
    </div>
  );
}

function LogoCarousel() {
  const logos = [
    { name: 'Creativa MX', color: '#FF6B6B', shape: 'circle' },
    { name: 'Impulsa Digital', color: '#4ECDC4', shape: 'diamond' },
    { name: 'Nuve Agency', color: '#7C5CFC', shape: 'hexagon' },
    { name: 'Marca Latina', color: '#FF8FAD', shape: 'shield' },
    { name: 'Fuego Social', color: '#FF9234', shape: 'bolt' },
    { name: 'Alma Studio', color: '#2D6A4F', shape: 'drop' },
    { name: 'Onda Media', color: '#457B9D', shape: 'pill' },
    { name: 'Raíz Publicidad', color: '#E76F51', shape: 'triangle' },
    { name: 'Cumbre Ads', color: '#264653', shape: 'square' },
    { name: 'Bravo Marketing', color: '#9B5DE5', shape: 'star' },
    { name: 'Punta Creativa', color: '#00BBF9', shape: 'circle' },
    { name: 'Selva Digital', color: '#06D6A0', shape: 'hexagon' },
  ];
  const doubled = [...logos, ...logos];
  return (
    <div style={{ overflow: 'hidden', width: '100%', position: 'relative' }}>
      <div style={{ display: 'flex', gap: 52, animation: 'scrollLogos 30s linear infinite', width: 'max-content' }}>
        {doubled.map((l, i) => (
          <AgencyLogo key={i} name={l.name} color={l.color} shape={l.shape} />
        ))}
      </div>
      <style>{`@keyframes scrollLogos { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>
    </div>
  );
}

// ── Pricing Section with Billing Toggle ────────────────────

type BillingCycle = 'anual' | 'trimestral' | 'mensual';

function PricingSection() {
  const [cycle, setCycle] = useState<BillingCycle>('anual');

  const plans = [
    {
      name: 'Starter',
      desc: 'Ideal para freelancers y agencias nuevas',
      highlight: '1 cliente',
      prices: { anual: 350, trimestral: 400, mensual: 450 } as Record<BillingCycle, number>,
      features: ['1 cliente incluido', 'Planificación de contenido', 'Calendario visual', 'Aprobaciones básicas', 'Soporte por email'],
      cta: 'Empezar 7 días gratis',
      featured: false,
    },
    {
      name: 'Pro',
      desc: 'Para agencias en crecimiento',
      highlight: '2 – 5 clientes',
      prices: { anual: 750, trimestral: 900, mensual: 1100 } as Record<BillingCycle, number>,
      features: ['2 a 5 clientes', 'Todo de Starter', 'AI Score por post', 'Reportes avanzados', 'Banco de assets', 'Roles de equipo', 'Soporte prioritario'],
      cta: 'Empezar 7 días gratis',
      featured: true,
    },
    {
      name: 'Full Access',
      desc: 'Para agencias consolidadas',
      highlight: '6 – 20 clientes',
      prices: { anual: 1500, trimestral: 1900, mensual: 2300 } as Record<BillingCycle, number>,
      features: ['6 a 20 clientes', 'Todo de Pro', 'White-label (próximamente)', 'API access', 'Onboarding dedicado', 'Soporte VIP'],
      cta: 'Empezar 7 días gratis',
      featured: false,
    },
  ];

  const cycleLabels: { key: BillingCycle; label: string }[] = [
    { key: 'anual', label: 'Anual' },
    { key: 'trimestral', label: 'Trimestral' },
    { key: 'mensual', label: 'Mensual' },
  ];

  const formatPrice = (n: number) => n >= 1000 ? `$${Math.floor(n / 1000)},${String(n % 1000).padStart(3, '0')}` : `$${n}`;

  return (
    <section id="precios" className="relative py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <FadeUp>
          <h2 className="font-serif font-bold text-[#2A1F1A] text-center mb-3" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)' }}>Planes simples, sin sorpresas</h2>
          <p className="text-center text-[#5A4A45] text-sm mb-6">7 días de prueba gratis en cualquier plan. Cancela cuando quieras.</p>
        </FadeUp>

        {/* Billing cycle toggle */}
        <FadeUp delay={1}>
          <div className="flex justify-center mb-4">
            <div className="inline-flex rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,180,150,0.2)', backdropFilter: 'blur(12px)' }}>
              {cycleLabels.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setCycle(key)}
                  className="px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-300"
                  style={{
                    background: cycle === key ? 'linear-gradient(135deg, #FF8FAD, #FFBA8A)' : 'transparent',
                    color: cycle === key ? '#fff' : '#5A4A45',
                    boxShadow: cycle === key ? '0 4px 12px rgba(255,143,173,0.3)' : 'none',
                  }}
                >
                  {label}
                  {key === 'anual' && <span className="ml-1 text-[10px] opacity-80">✨ Mejor precio</span>}
                </button>
              ))}
            </div>
          </div>
          <p className="text-center text-[11px] text-[#7A6560] mb-8">El precio se adapta al plazo de contratación. Mientras más largo, mejor precio.</p>
        </FadeUp>

        <div className="grid md:grid-cols-3 gap-5">
          {plans.map((plan, i) => (
            <FadeUp key={i} delay={i}>
              <div
                className="p-6 rounded-2xl border flex flex-col h-full relative"
                style={{
                  background: plan.featured ? 'linear-gradient(135deg, rgba(255,143,173,0.08), rgba(255,186,138,0.06))' : 'rgba(255,255,255,0.6)',
                  backdropFilter: 'blur(16px)',
                  borderColor: plan.featured ? '#FF8FAD' : 'rgba(255,255,255,0.5)',
                  borderWidth: plan.featured ? 2 : 1,
                }}
              >
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #FF8FAD, #FFBA8A)' }}>
                    Popular
                  </div>
                )}
                <h3 className="font-serif font-bold text-[#2A1F1A] text-lg">{plan.name}</h3>
                <p className="text-[#7A6560] text-xs mb-2">{plan.desc}</p>
                <div className="px-2 py-1 rounded-md text-xs font-bold mb-3 inline-block" style={{ background: 'rgba(255,143,173,0.1)', color: '#FF8FAD' }}>
                  {plan.highlight}
                </div>
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className="text-[#7A6560] text-xs">desde</span>
                  <span className="font-serif font-bold text-[#2A1F1A]" style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)' }}>{formatPrice(plan.prices[cycle])}</span>
                  <span className="text-[#7A6560] text-xs">MXN/mes</span>
                </div>
                <p className="text-[10px] text-[#7A6560] mb-4">Facturación {cycle}</p>
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-xs text-[#5A4A45]">
                      <span style={{ color: '#4CAF82' }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/auth/signup" className="block">
                  <button
                    className="w-full py-3 rounded-xl font-bold text-sm transition hover:shadow-lg"
                    style={{
                      background: plan.featured ? 'linear-gradient(135deg, #FF8FAD, #FFBA8A)' : 'rgba(255,255,255,0.8)',
                      color: plan.featured ? '#fff' : '#2A1F1A',
                      border: plan.featured ? 'none' : '1px solid rgba(255,180,150,0.3)',
                    }}
                  >
                    {plan.cta}
                  </button>
                </Link>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Main Page ───────────────────────────────────────────────

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF8F3] via-[#FFFBF7] to-[#FFF8F3] overflow-hidden">
      <ScrollProgressBar />
      <CursorGlow />

      {/* Decorative blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute rounded-full opacity-20" style={{ width: 600, height: 600, background: 'linear-gradient(135deg, #FF8FAD, #FFB5C8)', top: -200, right: -100, filter: 'blur(80px)' }} />
        <div className="absolute rounded-full opacity-15" style={{ width: 500, height: 500, background: 'linear-gradient(135deg, #E8D5FF, #FFB5C8)', bottom: 100, left: -150, filter: 'blur(80px)' }} />
        <div className="absolute rounded-full opacity-15" style={{ width: 400, height: 400, background: 'linear-gradient(135deg, #FFD4B8, #FFBA8A)', bottom: -100, right: 200, filter: 'blur(80px)' }} />
      </div>

      {/* ─── Sticky Navbar ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b" style={{ background: 'rgba(255,248,243,0.8)', borderColor: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-7xl mx-auto px-6 py-1 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img src="/socialgo-wordmark-light-cropped.svg" alt="SocialGo" style={{ height: 50 }} />
          </Link>
          <div className="hidden md:flex gap-8">
            <a href="#funcionamiento" className="text-sm text-[#5A4A45] hover:text-[#2A1F1A] transition">Funcionamiento</a>
            <a href="#features" className="text-sm text-[#5A4A45] hover:text-[#2A1F1A] transition">Funcionalidades</a>
            <a href="#precios" className="text-sm text-[#5A4A45] hover:text-[#2A1F1A] transition">Precios</a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="px-5 py-2 text-sm text-[#5A4A45] hover:text-[#2A1F1A] transition font-medium hidden sm:inline-block">Iniciar sesión</Link>
            <Link href="/auth/signup">
              <MagneticButton className="px-5 py-2 rounded-full font-medium text-white text-sm transition hover:shadow-lg" style={{ background: 'linear-gradient(135deg, #FF8FAD 0%, #FFBA8A 100%)' }}>
                Empezar gratis
              </MagneticButton>
            </Link>
          </div>
        </div>
      </nav>

      {/* Spacer for fixed nav */}
      <div style={{ height: 60 }} />

      {/* ─── Hero Section ─── */}
      <section id="demo" className="relative py-10 px-6 md:py-14">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div>
            <FadeUp>
              <h1 className="font-serif font-bold text-[#2A1F1A] mb-5 leading-tight" style={{ fontSize: 'clamp(1.8rem, 4.5vw, 3.2rem)' }}>
                Gestiona los clientes de tu agencia con una plataforma{' '}
                <span style={{ color: '#FF8FAD' }}><MorphText /></span>
              </h1>
            </FadeUp>
            <FadeUp delay={1}>
              <p className="text-[#5A4A45] mb-6 max-w-md" style={{ fontSize: 'clamp(0.9rem, 1.8vw, 1.05rem)', lineHeight: 1.7 }}>
                Clientes, contenido, aprobaciones y reportes en un dashboard hermoso. 7 días de prueba gratis.
              </p>
            </FadeUp>
            <FadeUp delay={2}>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/auth/signup">
                  <MagneticButton className="px-7 py-3.5 rounded-full font-bold text-white transition hover:shadow-lg text-sm" style={{ background: 'linear-gradient(135deg, #FF8FAD 0%, #FFBA8A 100%)' }}>
                    Prueba 7 días gratis
                  </MagneticButton>
                </Link>
                <a href="#funcionamiento" className="px-7 py-3.5 rounded-full font-bold transition hover:shadow-md text-sm" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.5)', color: '#2A1F1A' }}>
                  Ver cómo funciona
                </a>
              </div>
            </FadeUp>
          </div>
          <FadeUp delay={1}>
            <TabletMockup />
          </FadeUp>
        </div>
      </section>

      {/* ─── Logo Carousel ─── */}
      <section className="relative py-8 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeUp>
            <p className="text-center text-xs font-semibold text-[#7A6560] uppercase tracking-widest mb-6">Agencias que ya confían en nosotros</p>
            <LogoCarousel />
          </FadeUp>
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section className="relative py-10 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {[
            { target: 500, suffix: '+', label: 'agencias confían' },
            { target: 98, suffix: '%', label: 'satisfacción' },
            { target: 2, suffix: 'M+', label: 'posts gestionados' },
          ].map((s, i) => (
            <FadeUp key={i} delay={i}>
              <div>
                <div className="font-serif font-bold text-[#2A1F1A] mb-1" style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)' }}><CountUp target={s.target} suffix={s.suffix} /></div>
                <div className="text-[#5A4A45] text-sm">{s.label}</div>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ─── Funcionamiento Section ─── */}
      <section id="funcionamiento" className="relative py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeUp>
            <h2 className="font-serif font-bold text-[#2A1F1A] text-center mb-3" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)' }}>Cómo funciona SocialGo</h2>
            <p className="text-[#5A4A45] text-center text-sm mb-10 max-w-xl mx-auto">Tres perspectivas, una plataforma. Cada rol tiene exactamente lo que necesita.</p>
          </FadeUp>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: '🎯',
                role: 'Para el Admin de la Agencia',
                color: '#FF8FAD',
                items: [
                  'Dashboard con MRR, clientes activos y pagos',
                  'Gestión de paquetes y contratos por cliente',
                  'Reportes de performance por marca',
                  'Control total de equipo y permisos',
                ],
              },
              {
                icon: '🎨',
                role: 'Para los Creativos',
                color: '#FFBA8A',
                items: [
                  'Parrilla de contenido semanal por cliente',
                  'Calendario visual con todos los posts',
                  'Banco de assets centralizado',
                  'AI Score para optimizar cada post',
                ],
              },
              {
                icon: '✅',
                role: 'Para los Clientes',
                color: '#E8D5FF',
                items: [
                  'Vista de aprobación limpia y simple',
                  'Aprobar, rechazar o pedir cambios en 1 clic',
                  'Comentarios directos en cada post',
                  'Historial completo de contenido',
                ],
              },
            ].map((card, i) => (
              <FadeUp key={i} delay={i}>
                <TiltCard>
                  <div className="p-6 rounded-2xl border h-full" style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)', borderColor: 'rgba(255,255,255,0.5)' }}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: `${card.color}25` }}>{card.icon}</div>
                      <h3 className="font-serif font-bold text-[#2A1F1A] text-sm">{card.role}</h3>
                    </div>
                    <ul className="space-y-2.5">
                      {card.items.map((item, j) => (
                        <li key={j} className="flex items-start gap-2 text-[#5A4A45] text-xs leading-relaxed">
                          <span style={{ color: card.color, fontWeight: 'bold', flexShrink: 0, marginTop: 1 }}>→</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </TiltCard>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features Section ─── */}
      <section id="features" className="relative py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeUp>
            <h2 className="font-serif font-bold text-[#2A1F1A] text-center mb-8" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)' }}>Funcionalidades potentes</h2>
          </FadeUp>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: '👥', title: 'Gestión de Clientes', desc: 'Paquetes, pagos, contratos y estatus — todo visible' },
              { icon: '📅', title: 'Parrilla de Contenido', desc: 'Visualiza y planifica posts por semana y cliente' },
              { icon: '⚡', title: 'AI Score', desc: 'Análisis inteligente de cada post antes de publicar' },
              { icon: '📊', title: 'Reportes', desc: 'Métricas clave por cliente con impacto real' },
              { icon: '🎨', title: 'Banco de Assets', desc: 'Fotos, videos y templates centralizados por marca' },
              { icon: '✅', title: 'Aprobaciones', desc: 'Tu cliente aprueba, comenta y revisa en un clic' },
            ].map((f, i) => (
              <FadeUp key={i} delay={i}>
                <TiltCard>
                  <div className="p-6 rounded-2xl border transition hover:shadow-lg h-full" style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)', borderColor: 'rgba(255,255,255,0.5)' }}>
                    <div className="text-3xl mb-3">{f.icon}</div>
                    <h3 className="font-serif text-base font-bold text-[#2A1F1A] mb-1.5">{f.title}</h3>
                    <p className="text-[#5A4A45] text-xs leading-relaxed">{f.desc}</p>
                  </div>
                </TiltCard>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 4 Steps Section ─── */}
      <section className="relative py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeUp>
            <h2 className="font-serif font-bold text-[#2A1F1A] text-center mb-3" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)' }}>Empieza en 4 pasos</h2>
            <p className="text-center text-[#5A4A45] text-sm mb-10">De cero a gestionar toda tu agencia en menos de 10 minutos</p>
          </FadeUp>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { step: '01', title: 'Crea tu cuenta', desc: 'Regístrate en 30 segundos. Sin tarjeta.', icon: '🚀' },
              { step: '02', title: 'Agrega tus clientes', desc: 'Importa tu cartera, asigna paquetes y precios.', icon: '👥' },
              { step: '03', title: 'Planifica contenido', desc: 'Crea posts, asigna fechas y conecta con tu equipo.', icon: '📅' },
              { step: '04', title: 'Aprueba y publica', desc: 'Tus clientes aprueban. Tú publicas. Así de fácil.', icon: '✅' },
            ].map((item, i) => (
              <FadeUp key={i} delay={i}>
                <div className="p-6 rounded-2xl border text-center relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)', borderColor: 'rgba(255,255,255,0.5)' }}>
                  <div className="absolute top-3 right-4 font-serif font-bold text-[#FF8FAD] opacity-15" style={{ fontSize: 48 }}>{item.step}</div>
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <h3 className="font-serif text-base font-bold text-[#2A1F1A] mb-1.5">{item.title}</h3>
                  <p className="text-[#5A4A45] text-xs leading-relaxed">{item.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing Section ─── */}
      <PricingSection />

      {/* ─── Testimonials ─── */}
      <section className="relative py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeUp>
            <h2 className="font-serif font-bold text-[#2A1F1A] text-center mb-8" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)' }}>Casos reales</h2>
          </FadeUp>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { name: 'Renata Gómez', agency: 'Glow Studio', quote: 'Reducimos 5 horas semanales. Puro impacto.', stats: 'De 3 a 8 clientes' },
              { name: 'Sofía Martínez', agency: 'Creative Social', quote: 'Mis clientes ven el progreso. Se siente profesional.', stats: '+250% retención' },
              { name: 'Carolina López', agency: 'Aura Design', quote: 'AI Score es como tener un coach 24/7.', stats: '+45% engagement' },
            ].map((s, i) => (
              <FadeUp key={i} delay={i}>
                <div className="p-6 rounded-2xl border" style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)', borderColor: 'rgba(255,255,255,0.5)' }}>
                  <p className="text-[#5A4A45] italic mb-4 text-sm">&ldquo;{s.quote}&rdquo;</p>
                  <div className="border-t pt-3 mb-3" style={{ borderColor: 'rgba(255,255,255,0.3)' }}>
                    <p className="font-bold text-[#2A1F1A] text-sm">{s.name}</p>
                    <p className="text-xs text-[#7A6560]">{s.agency}</p>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg text-center text-xs font-bold" style={{ background: 'linear-gradient(135deg, rgba(255,143,173,0.1), rgba(255,186,138,0.1))', color: '#FF8FAD' }}>
                    {s.stats}
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="relative py-14 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <FadeUp>
            <div className="p-10 rounded-3xl border" style={{ background: 'linear-gradient(135deg, rgba(255,143,173,0.15), rgba(255,186,138,0.1))', backdropFilter: 'blur(16px)', borderColor: 'rgba(255,255,255,0.5)' }}>
              <h2 className="font-serif font-bold text-[#2A1F1A] mb-3" style={{ fontSize: 'clamp(1.3rem, 3.5vw, 1.8rem)' }}>
                Prueba ahora. 7 días gratis. Sin tarjeta.
              </h2>
              <p className="text-[#5A4A45] mb-6 text-sm">
                Acceso completo a todas las funcionalidades. Cancela cuando quieras.
              </p>
              <Link href="/auth/signup">
                <MagneticButton className="px-8 py-3.5 rounded-full font-bold text-white transition hover:shadow-lg mx-auto text-sm" style={{ background: 'linear-gradient(135deg, #FF8FAD 0%, #FFBA8A 100%)', display: 'inline-block' }}>
                  Comienza tu prueba gratis
                </MagneticButton>
              </Link>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="relative border-t px-6 py-10" style={{ borderColor: 'rgba(255,255,255,0.5)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center mb-3">
                <img src="/socialgo-wordmark-light-cropped.svg" alt="SocialGo" style={{ height: 28 }} />
              </div>
              <p className="text-[#7A6560] text-xs">By Loonshot Labs</p>
            </div>
            <div>
              <h4 className="font-semibold text-[#2A1F1A] mb-3 text-sm">Producto</h4>
              <ul className="space-y-2 text-[#5A4A45] text-xs">
                <li><a href="#features" className="hover:text-[#2A1F1A] transition">Funcionalidades</a></li>
                <li><a href="#precios" className="hover:text-[#2A1F1A] transition">Precios</a></li>
                <li><a href="#funcionamiento" className="hover:text-[#2A1F1A] transition">Funcionamiento</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-[#2A1F1A] mb-3 text-sm">Legal</h4>
              <ul className="space-y-2 text-[#5A4A45] text-xs">
                <li><Link href="/privacy" className="hover:text-[#2A1F1A] transition">Privacidad</Link></li>
                <li><Link href="/terms" className="hover:text-[#2A1F1A] transition">Términos</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-[#2A1F1A] mb-3 text-sm">Contacto</h4>
              <a href="mailto:hola@socialgo.app" className="text-[#5A4A45] hover:text-[#2A1F1A] transition text-xs">hola@socialgo.app</a>
            </div>
          </div>
          <div className="border-t pt-6" style={{ borderColor: 'rgba(255,255,255,0.5)' }}>
            <p className="text-center text-[#7A6560] text-xs">© 2026 SocialGo by Loonshot Labs. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
