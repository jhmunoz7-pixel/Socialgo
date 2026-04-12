'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';

// ScrollProgressBar Component
function ScrollProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = (window.scrollY / windowHeight) * 100;
      setProgress(scrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className="fixed top-0 left-0 h-1 z-50 transition-all duration-300"
      style={{
        width: `${progress}%`,
        background: 'linear-gradient(135deg, #FF8FAD 0%, #FFBA8A 100%)',
      }}
    />
  );
}

// FadeUp Component
function FadeUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay * 100);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0px)' : 'translateY(30px)',
        transition: `all 0.6s ease-out`,
      }}
    >
      {children}
    </div>
  );
}

// MorphText Component
function MorphText() {
  const words = ['intuitive', 'potente', 'confiable', 'rápida'];
  const [currentWord, setCurrentWord] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentWord((prev) => (prev + 1) % words.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="inline-block relative">
      <span
        style={{
          display: 'inline-block',
          minWidth: '150px',
          opacity: 1,
          transition: 'all 0.5s ease-in-out',
        }}
      >
        {words[currentWord]}
      </span>
    </span>
  );
}

// CountUp Component
function CountUp({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let current = 0;
          const increment = target / 30;
          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, 30);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}

// TiltCard Component
function TiltCard({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('');

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (e.clientY - rect.top - centerY) / 10;
    const rotateY = -(e.clientX - rect.left - centerX) / 10;

    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`);
  };

  const handleMouseLeave = () => {
    setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)');
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: transform,
        transition: 'transform 0.3s ease-out',
      }}
    >
      {children}
    </div>
  );
}

// Dashboard Mockup Component
function DashboardMockup() {
  return (
    <div
      className="mx-auto rounded-2xl overflow-hidden shadow-2xl"
      style={{
        maxWidth: '100%',
        width: '100%',
        aspectRatio: '16/10',
        background: 'linear-gradient(135deg, #f0f0f0 0%, #fafafa 100%)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
      }}
    >
      {/* Browser frame */}
      <div className="h-full w-full flex flex-col">
        {/* Browser header */}
        <div
          className="px-4 py-3 flex items-center gap-3"
          style={{
            background: '#e8e8e8',
            borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
          }}
        >
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f56' }} />
            <div className="w-3 h-3 rounded-full" style={{ background: '#ffbd2e' }} />
            <div className="w-3 h-3 rounded-full" style={{ background: '#27c93f' }} />
          </div>
          <div
            className="flex-1 px-3 py-1 rounded text-xs mx-2 text-center"
            style={{
              background: '#fff',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              color: '#666',
            }}
          >
            socialgo.app/dashboard
          </div>
        </div>

        {/* Dashboard content */}
        <div className="flex-1 overflow-hidden p-6" style={{ background: '#fafafa' }}>
          <div className="grid grid-cols-12 gap-4 h-full">
            {/* Left sidebar */}
            <div className="col-span-2 space-y-2">
              <div
                className="h-8 rounded"
                style={{
                  background: 'linear-gradient(135deg, #FF8FAD 0%, #FFBA8A 100%)',
                  width: '60%',
                }}
              />
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-6 rounded"
                    style={{
                      background: i === 0 ? '#FFE5F0' : '#f0f0f0',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Main content area */}
            <div className="col-span-10 flex flex-col gap-4">
              {/* Top stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Clientes activos', value: '8' },
                  { label: 'Posts este mes', value: '47' },
                  { label: 'Engagement avg', value: '8.3%' },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg border"
                    style={{
                      background: '#fff',
                      borderColor: 'rgba(0, 0, 0, 0.05)',
                    }}
                  >
                    <div className="text-xs text-gray-500">{stat.label}</div>
                    <div className="text-lg font-bold text-[#2A1F1A]">{stat.value}</div>
                  </div>
                ))}
              </div>

              {/* Content grid */}
              <div className="flex-1 grid grid-cols-4 gap-3 overflow-hidden">
                {[
                  { client: 'Glow Studio', type: 'Reel', color: '#FF8FAD' },
                  { client: 'Beautify Co', type: 'Carousel', color: '#FFBA8A' },
                  { client: 'Glow Studio', type: 'Post', color: '#E8D5FF' },
                  { client: 'Aura Design', type: 'Reel', color: '#FFD4B8' },
                  { client: 'Beautify Co', type: 'Story', color: '#FFB5C8' },
                  { client: 'Aura Design', type: 'Post', color: '#FFBA8A' },
                  { client: 'Glow Studio', type: 'Carousel', color: '#E8D5FF' },
                  { client: 'Beautify Co', type: 'Reel', color: '#FF8FAD' },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="rounded-lg p-3 flex flex-col justify-between text-xs"
                    style={{
                      background: item.color,
                      opacity: 0.8,
                    }}
                  >
                    <div>
                      <div className="font-bold text-[#2A1F1A]">{item.client}</div>
                      <div className="text-[#5A4A45]">{item.type}</div>
                    </div>
                    <div className="text-[#5A4A45]">↗</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// MagneticButton Component
function MagneticButton({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const mouseX = e.clientX - rect.left - centerX;
    const mouseY = e.clientY - rect.top - centerY;
    const distance = Math.sqrt(mouseX ** 2 + mouseY ** 2);

    if (distance < 100) {
      setPosition({
        x: (mouseX / distance) * 10,
        y: (mouseY / distance) * 10,
      });
    }
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <button
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        transition: 'transform 0.2s ease-out',
      }}
    >
      {children}
    </button>
  );
}

// StaggeredReveal Component
function StaggeredReveal({ children }: { children: React.ReactNode }) {
  return (
    <>
      {Array.isArray(children)
        ? children.map((child, i) => (
            <FadeUp key={i} delay={i}>
              {child}
            </FadeUp>
          ))
        : children}
    </>
  );
}

// FAQ Accordion Component
function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      q: '¿Necesito tarjeta de crédito?',
      a: 'No, el plan free no requiere tarjeta de crédito. Puedes empezar inmediatamente sin proporcionar datos de pago.',
    },
    {
      q: '¿Puedo cambiar de plan?',
      a: 'Sí, puedes hacer upgrades y downgrades al instante sin penalidades. Los cambios se reflejan en tu próximo ciclo de facturación.',
    },
    {
      q: '¿Qué es el AI Score?',
      a: 'Es un análisis con inteligencia artificial que evalúa cada post en una escala de 0-100. Te proporciona recomendaciones específicas para mejorar el engagement y performance de tu contenido.',
    },
    {
      q: '¿Mis datos están seguros?',
      a: 'Sí, usamos cifrado de grado bancario (AES-256) y cumplimos con estándares de seguridad internacionales. Tus datos de clientes están completamente protegidos.',
    },
    {
      q: '¿Puedo cancelar cuando quiera?',
      a: 'Sí, puedes cancelar tu suscripción en cualquier momento sin contratos ni penalizaciones. Tu acceso continuará hasta el final del ciclo de facturación actual.',
    },
  ];

  return (
    <div className="space-y-4">
      {faqs.map((faq, i) => (
        <FadeUp key={i} delay={i}>
          <div
            className="rounded-2xl border overflow-hidden cursor-pointer transition"
            style={{
              background: openIndex === i ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.6)',
              backdropFilter: 'blur(16px)',
              borderColor: 'rgba(255, 255, 255, 0.5)',
            }}
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
          >
            <div className="p-6 flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-[#2A1F1A]">{faq.q}</h3>
              <span
                className="text-2xl transition-transform"
                style={{
                  transform: openIndex === i ? 'rotate(45deg)' : 'rotate(0deg)',
                }}
              >
                +
              </span>
            </div>
            {openIndex === i && (
              <div
                className="px-6 pb-6 text-[#5A4A45] border-t"
                style={{ borderColor: 'rgba(255, 255, 255, 0.3)' }}
              >
                {faq.a}
              </div>
            )}
          </div>
        </FadeUp>
      ))}
    </div>
  );
}

// SignupForm Component
function SignupForm() {
  const [formData, setFormData] = useState({
    nombre: '',
    negocio: '',
    whatsapp: '',
    email: '',
    contrasena: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Submit to /auth/signup or handle as needed
    console.log('Form submitted:', formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
      <input
        type="text"
        name="nombre"
        placeholder="Renata Gómez"
        value={formData.nombre}
        onChange={handleChange}
        className="w-full px-4 py-3 rounded-lg border transition"
        style={{
          background: 'rgba(255, 255, 255, 0.8)',
          borderColor: 'rgba(255, 255, 255, 0.5)',
          color: '#2A1F1A',
        }}
        required
      />
      <input
        type="text"
        name="negocio"
        placeholder="Glow Studio"
        value={formData.negocio}
        onChange={handleChange}
        className="w-full px-4 py-3 rounded-lg border transition"
        style={{
          background: 'rgba(255, 255, 255, 0.8)',
          borderColor: 'rgba(255, 255, 255, 0.5)',
          color: '#2A1F1A',
        }}
        required
      />
      <input
        type="tel"
        name="whatsapp"
        placeholder="+52 55 1234 5678"
        value={formData.whatsapp}
        onChange={handleChange}
        className="w-full px-4 py-3 rounded-lg border transition"
        style={{
          background: 'rgba(255, 255, 255, 0.8)',
          borderColor: 'rgba(255, 255, 255, 0.5)',
          color: '#2A1F1A',
        }}
        required
      />
      <input
        type="email"
        name="email"
        placeholder="renata@glowstudio.mx"
        value={formData.email}
        onChange={handleChange}
        className="w-full px-4 py-3 rounded-lg border transition"
        style={{
          background: 'rgba(255, 255, 255, 0.8)',
          borderColor: 'rgba(255, 255, 255, 0.5)',
          color: '#2A1F1A',
        }}
        required
      />
      <input
        type="password"
        name="contrasena"
        placeholder="••••••••"
        value={formData.contrasena}
        onChange={handleChange}
        className="w-full px-4 py-3 rounded-lg border transition"
        style={{
          background: 'rgba(255, 255, 255, 0.8)',
          borderColor: 'rgba(255, 255, 255, 0.5)',
          color: '#2A1F1A',
        }}
        required
      />
      <MagneticButton
        className="w-full px-6 py-3 rounded-full font-bold text-white transition hover:shadow-lg"
        style={{
          background: 'linear-gradient(135deg, #FF8FAD 0%, #FFBA8A 100%)',
        }}
      >
        Crear mi cuenta gratis
      </MagneticButton>
      <p className="text-center text-xs text-[#7A6560]">
        Al registrarte aceptas nuestros <Link href="/terms" className="underline hover:text-[#2A1F1A]">términos</Link>
      </p>
    </form>
  );
}

// Main Home Component
export default function Home() {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF8F3] via-[#FFFBF7] to-[#FFF8F3] overflow-hidden">
      <ScrollProgressBar />

      {/* Decorative gradient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute rounded-full opacity-20"
          style={{
            width: '600px',
            height: '600px',
            background: 'linear-gradient(135deg, #FF8FAD, #FFB5C8)',
            top: '-200px',
            right: '-100px',
            filter: 'blur(80px)',
          }}
        />
        <div
          className="absolute rounded-full opacity-15"
          style={{
            width: '500px',
            height: '500px',
            background: 'linear-gradient(135deg, #E8D5FF, #FFB5C8)',
            bottom: '100px',
            left: '-150px',
            filter: 'blur(80px)',
          }}
        />
        <div
          className="absolute rounded-full opacity-15"
          style={{
            width: '400px',
            height: '400px',
            background: 'linear-gradient(135deg, #FFD4B8, #FFBA8A)',
            bottom: '-100px',
            right: '200px',
            filter: 'blur(80px)',
          }}
        />
      </div>

      {/* Sticky Navbar */}
      <nav
        className="sticky top-0 z-50 border-b"
        style={{
          background: 'rgba(255, 248, 243, 0.7)',
          borderColor: 'rgba(255, 255, 255, 0.5)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-serif text-2xl font-bold text-[#2A1F1A]">socialgo</span>
            <span className="w-2 h-2 rounded-full bg-[#FF8FAD]" />
          </div>

          <div className="hidden md:flex gap-8">
            <a href="#features" className="text-[#5A4A45] hover:text-[#2A1F1A] transition">
              Funcionalidades
            </a>
            <a href="#casos" className="text-[#5A4A45] hover:text-[#2A1F1A] transition">
              Casos de éxito
            </a>
            <a href="#faq" className="text-[#5A4A45] hover:text-[#2A1F1A] transition">
              FAQ
            </a>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/auth/login"
              className="px-6 py-2 text-[#5A4A45] hover:text-[#2A1F1A] transition font-medium hidden sm:inline-block"
            >
              Iniciar sesión
            </Link>
            <MagneticButton
              className="px-6 py-2.5 rounded-full font-medium text-white transition hover:shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #FF8FAD 0%, #FFBA8A 100%)',
              }}
            >
              Empezar gratis
            </MagneticButton>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-16 px-6 sm:py-20">
        <div className="max-w-4xl mx-auto text-center">
          <FadeUp>
            <h1
              className="font-serif font-bold text-[#2A1F1A] mb-6 leading-tight"
              style={{
                fontSize: 'clamp(2rem, 8vw, 4rem)',
              }}
            >
              Deja de malabarear 10 apps. Tu agencia merece <MorphText />
            </h1>
          </FadeUp>

          <FadeUp delay={1}>
            <p
              className="text-[#5A4A45] mb-12 leading-relaxed"
              style={{
                fontSize: 'clamp(1rem, 2vw, 1.25rem)',
              }}
            >
              Gestiona clientes, planifica contenido, mide resultados y potencia tu creatividad con AI — todo desde un solo lugar. Hecho para agencias como la tuya.
            </p>
          </FadeUp>

          <FadeUp delay={2}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <MagneticButton
                className="px-8 py-4 rounded-full font-bold text-white transition hover:shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #FF8FAD 0%, #FFBA8A 100%)',
                }}
              >
                Empezar gratis
              </MagneticButton>
              <Link
                href="#demo"
                className="px-8 py-4 rounded-full font-bold transition"
                style={{
                  background: 'rgba(255, 255, 255, 0.6)',
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  border: '1px solid',
                  color: '#2A1F1A',
                }}
              >
                Ver demo
              </Link>
            </div>
          </FadeUp>

          <FadeUp delay={3}>
            <div className="flex flex-col sm:flex-row gap-6 justify-center text-sm text-[#7A6560]">
              <div className="flex items-center gap-2 justify-center">
                <span>✓</span>
                <span>Sin tarjeta de crédito</span>
              </div>
              <div className="flex items-center gap-2 justify-center">
                <span>✓</span>
                <span>14 días gratis</span>
              </div>
              <div className="flex items-center gap-2 justify-center">
                <span>✓</span>
                <span>Cancela cuando quieras</span>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section id="demo" className="relative py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeUp>
            <DashboardMockup />
          </FadeUp>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="relative py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-3 gap-8 text-center">
            <FadeUp delay={0}>
              <div>
                <div
                  className="font-serif font-bold text-[#2A1F1A] mb-2"
                  style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)' }}
                >
                  <CountUp target={500} suffix="+" />
                </div>
                <div className="text-[#5A4A45]">agencias confían en nosotros</div>
              </div>
            </FadeUp>
            <FadeUp delay={1}>
              <div>
                <div
                  className="font-serif font-bold text-[#2A1F1A] mb-2"
                  style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)' }}
                >
                  <CountUp target={98} suffix="%" />
                </div>
                <div className="text-[#5A4A45]">satisfacción cliente</div>
              </div>
            </FadeUp>
            <FadeUp delay={2}>
              <div>
                <div
                  className="font-serif font-bold text-[#2A1F1A] mb-2"
                  style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)' }}
                >
                  <CountUp target={2} suffix="M+" />
                </div>
                <div className="text-[#5A4A45]">posts gestionados</div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeUp>
            <h2
              className="font-serif font-bold text-[#2A1F1A] text-center mb-12"
              style={{ fontSize: 'clamp(2rem, 5vw, 2.5rem)' }}
            >
              Todo lo que necesitas en un lugar
            </h2>
          </FadeUp>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StaggeredReveal>
              {[
                {
                  icon: '👥',
                  title: 'Gestión de Clientes',
                  desc: 'Organiza todos tus clientes en un solo lugar. Contratos, contactos, estatus de pago y paquetes.',
                },
                {
                  icon: '📅',
                  title: 'Parrilla de Contenido',
                  desc: 'Visualiza y planifica el contenido mensual de cada cliente con nuestra grilla intuitiva.',
                },
                {
                  icon: '⚡',
                  title: 'AI Score',
                  desc: 'Analiza cada post con inteligencia artificial. Recibe un score y recomendaciones para mejorar.',
                },
                {
                  icon: '📊',
                  title: 'Reportes',
                  desc: 'Dashboards con métricas clave por cliente. Demuestra el valor de tu trabajo a cada marca.',
                },
                {
                  icon: '🗓️',
                  title: 'Calendario',
                  desc: 'Vista mensual de todo el contenido programado. Nunca pierdas un deadline.',
                },
                {
                  icon: '🎨',
                  title: 'Banco de Assets',
                  desc: 'Centraliza fotos, videos, templates y kits de marca de todos tus clientes.',
                },
              ].map((feature, i) => (
                <TiltCard key={i}>
                  <div
                    className="p-8 rounded-2xl border transition hover:shadow-lg h-full"
                    style={{
                      background: 'rgba(255, 255, 255, 0.6)',
                      backdropFilter: 'blur(16px)',
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                    }}
                  >
                    <div className="text-4xl mb-4">{feature.icon}</div>
                    <h3 className="font-serif text-xl font-bold text-[#2A1F1A] mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-[#5A4A45]">{feature.desc}</p>
                  </div>
                </TiltCard>
              ))}
            </StaggeredReveal>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeUp>
            <h2
              className="font-serif font-bold text-[#2A1F1A] text-center mb-12"
              style={{ fontSize: 'clamp(2rem, 5vw, 2.5rem)' }}
            >
              Cómo funciona
            </h2>
          </FadeUp>

          <div className="grid md:grid-cols-3 gap-6">
            <StaggeredReveal>
              {[
                {
                  step: '1',
                  title: 'Crea tu agencia',
                  desc: 'Regístrate y configura tu espacio en minutos',
                },
                {
                  step: '2',
                  title: 'Agrega tus clientes',
                  desc: 'Importa tu cartera de clientes y asigna paquetes',
                },
                {
                  step: '3',
                  title: 'Gestiona todo desde un lugar',
                  desc: 'Parrilla, calendario, reportes y AI en un dashboard',
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="p-8 rounded-2xl border text-center"
                  style={{
                    background: 'rgba(255, 255, 255, 0.6)',
                    backdropFilter: 'blur(16px)',
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center text-white font-bold"
                    style={{
                      background: 'linear-gradient(135deg, #FF8FAD 0%, #FFBA8A 100%)',
                    }}
                  >
                    {item.step}
                  </div>
                  <h3 className="font-serif text-lg font-bold text-[#2A1F1A] mb-3">
                    {item.title}
                  </h3>
                  <p className="text-[#5A4A45]">{item.desc}</p>
                </div>
              ))}
            </StaggeredReveal>
          </div>
        </div>
      </section>

      {/* Success Stories */}
      <section id="casos" className="relative py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeUp>
            <h2
              className="font-serif font-bold text-[#2A1F1A] text-center mb-12"
              style={{ fontSize: 'clamp(2rem, 5vw, 2.5rem)' }}
            >
              Casos de éxito
            </h2>
          </FadeUp>

          <div className="grid md:grid-cols-3 gap-6">
            <StaggeredReveal>
              {[
                {
                  name: 'Renata Gómez',
                  agency: 'Glow Studio',
                  quote:
                    'Reducimos 5 horas semanales en gestión. Ahora tengo más tiempo para estrategia y creatividad.',
                  stats: 'De 3 a 8 clientes en 6 meses',
                },
                {
                  name: 'Sofía Martínez',
                  agency: 'Creative Social',
                  quote:
                    'Con SocialGo, mis clientes ven exactamente el progreso de sus campañas. Se siente profesional.',
                  stats: '+250% en retención de clientes',
                },
                {
                  name: 'Carolina López',
                  agency: 'Aura Design',
                  quote:
                    'El AI Score cambió mi forma de crear contenido. Es como tener un coach de contenido 24/7.',
                  stats: '+45% engagement promedio',
                },
              ].map((story, i) => (
                <FadeUp key={i} delay={i}>
                  <div
                    className="p-8 rounded-2xl border"
                    style={{
                      background: 'rgba(255, 255, 255, 0.6)',
                      backdropFilter: 'blur(16px)',
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                    }}
                  >
                    <div className="mb-4">
                      <p className="text-[#5A4A45] italic mb-4">"{story.quote}"</p>
                      <div className="border-t pt-4" style={{ borderColor: 'rgba(255, 255, 255, 0.3)' }}>
                        <p className="font-bold text-[#2A1F1A]">{story.name}</p>
                        <p className="text-sm text-[#7A6560]">{story.agency}</p>
                      </div>
                    </div>
                    <div
                      className="px-4 py-2 rounded-lg text-center text-sm font-bold"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255, 143, 173, 0.1), rgba(255, 186, 138, 0.1))',
                        color: '#FF8FAD',
                      }}
                    >
                      {story.stats}
                    </div>
                  </div>
                </FadeUp>
              ))}
            </StaggeredReveal>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="relative py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeUp>
            <h2
              className="font-serif font-bold text-[#2A1F1A] text-center mb-12"
              style={{ fontSize: 'clamp(2rem, 5vw, 2.5rem)' }}
            >
              Planes simples y transparentes
            </h2>
          </FadeUp>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <StaggeredReveal>
              {[
                {
                  name: 'Free',
                  desc: 'Para freelancers',
                  price: '$0',
                  period: '/mes',
                  note: '1 cliente incluido',
                  features: ['1 cliente', 'Parrilla de contenido', 'Calendario básico'],
                  popular: false,
                },
                {
                  name: 'Pro',
                  desc: 'Para agencias en crecimiento',
                  price: 'desde $750',
                  period: '/mes',
                  note: '2-5 clientes',
                  features: [
                    '2-5 clientes',
                    'Parrilla y calendario avanzados',
                    'AI Score básico',
                    'Reportes por cliente',
                  ],
                  popular: true,
                },
                {
                  name: 'Full Access',
                  desc: 'Para agencias establecidas',
                  price: 'desde $1,500',
                  period: '/mes',
                  note: '6-20 clientes',
                  features: [
                    '6-20 clientes',
                    'Todas las funcionalidades',
                    'AI Score ilimitado',
                    'Reportes avanzados',
                    'Soporte prioritario',
                  ],
                  popular: false,
                },
              ].map((plan, i) => (
                <FadeUp key={i} delay={i}>
                  <div
                    className="p-8 rounded-2xl border relative h-full"
                    style={{
                      background: 'rgba(255, 255, 255, 0.6)',
                      backdropFilter: 'blur(16px)',
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                      ...(plan.popular && { transform: 'scale(1.05)' }),
                    }}
                  >
                    {plan.popular && (
                      <div
                        className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-white text-xs font-bold"
                        style={{
                          background: 'linear-gradient(135deg, #FF8FAD 0%, #FFBA8A 100%)',
                        }}
                      >
                        Popular
                      </div>
                    )}
                    <h3 className="font-serif text-2xl font-bold text-[#2A1F1A] mb-2">
                      {plan.name}
                    </h3>
                    <p className="text-[#7A6560] mb-6">{plan.desc}</p>
                    <div className="mb-6">
                      <span className="font-serif text-3xl font-bold text-[#2A1F1A]">{plan.price}</span>
                      <span className="text-[#7A6560]">{plan.period}</span>
                    </div>
                    <p className="text-[#5A4A45] mb-6 text-sm">{plan.note}</p>
                    <div className="space-y-3 text-sm text-[#5A4A45]">
                      {plan.features.map((f, fi) => (
                        <p key={fi}>✓ {f}</p>
                      ))}
                    </div>
                  </div>
                </FadeUp>
              ))}
            </StaggeredReveal>
          </div>

          <FadeUp>
            <div className="text-center">
              <Link
                href="/pricing"
                className="text-[#FF8FAD] hover:text-[#2A1F1A] font-bold transition"
              >
                Ver planes completos →
              </Link>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="relative py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <FadeUp>
            <h2
              className="font-serif font-bold text-[#2A1F1A] text-center mb-12"
              style={{ fontSize: 'clamp(2rem, 5vw, 2.5rem)' }}
            >
              Preguntas frecuentes
            </h2>
          </FadeUp>

          <FAQAccordion />
        </div>
      </section>

      {/* Signup CTA Section */}
      <section className="relative py-16 px-6">
        <div className="max-w-2xl mx-auto">
          <FadeUp>
            <h2
              className="font-serif font-bold text-[#2A1F1A] text-center mb-4"
              style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)' }}
            >
              Empieza hoy, es gratis
            </h2>
          </FadeUp>

          <FadeUp delay={1}>
            <p className="text-center text-[#5A4A45] mb-8">
              14 días de acceso completo. Sin tarjeta de crédito. Sin compromiso.
            </p>
          </FadeUp>

          <FadeUp delay={2}>
            <SignupForm />
          </FadeUp>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="relative border-t px-6 py-12"
        style={{ borderColor: 'rgba(255, 255, 255, 0.5)' }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="font-serif text-2xl font-bold text-[#2A1F1A]">socialgo</span>
                <span className="w-2 h-2 rounded-full bg-[#FF8FAD]" />
              </div>
              <p className="text-[#7A6560] text-sm">By Loonshot Labs</p>
            </div>

            <div>
              <h4 className="font-semibold text-[#2A1F1A] mb-4">Producto</h4>
              <ul className="space-y-2 text-[#5A4A45] text-sm">
                <li>
                  <a href="#features" className="hover:text-[#2A1F1A] transition">
                    Funcionalidades
                  </a>
                </li>
                <li>
                  <a href="#casos" className="hover:text-[#2A1F1A] transition">
                    Casos de éxito
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-[#2A1F1A] transition">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-[#2A1F1A] mb-4">Legal</h4>
              <ul className="space-y-2 text-[#5A4A45] text-sm">
                <li>
                  <Link href="/privacy" className="hover:text-[#2A1F1A] transition">
                    Privacidad
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-[#2A1F1A] transition">
                    Términos
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-[#2A1F1A] mb-4">Contacto</h4>
              <a
                href="mailto:hola@socialgo.app"
                className="text-[#5A4A45] hover:text-[#2A1F1A] transition text-sm"
              >
                hola@socialgo.app
              </a>
            </div>
          </div>

          <div className="border-t pt-8" style={{ borderColor: 'rgba(255, 255, 255, 0.5)' }}>
            <p className="text-center text-[#7A6560] text-sm">
              © 2026 SocialGo by Loonshot Labs. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
