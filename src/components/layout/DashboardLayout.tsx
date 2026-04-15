'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCurrentUser, useOrganization, useClients } from '@/lib/hooks';
import type { MemberRole } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { AuthProvider } from '@/lib/auth-context';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { ThemeSelector } from '@/components/theme/ThemeSelector';
import { OnboardingPopup } from '@/components/layout/OnboardingPopup';

interface NavItem {
  label: string;
  icon: string;
  href: string;
  section: 'principal' | 'workspace' | 'config';
  /** Roles that can see this item. If omitted, visible to all. */
  roles?: MemberRole[];
}

// Admins = owner, admin, member (all equivalent)
const ADMIN_ROLES: MemberRole[] = ['owner', 'admin', 'member'];
const NON_CLIENT: MemberRole[] = ['owner', 'admin', 'member', 'creative'];

const navItems: NavItem[] = [
  { label: 'Paquetes', icon: '📦', href: '/dashboard/packages', section: 'principal', roles: ADMIN_ROLES },
  { label: 'Clientes', icon: '👥', href: '/dashboard', section: 'principal', roles: NON_CLIENT },
  { label: 'Reportes', icon: '📊', href: '/dashboard/reports', section: 'principal', roles: NON_CLIENT },
  { label: 'Planificación', icon: '📋', href: '/dashboard/planning', section: 'workspace' },
  { label: 'Contenido', icon: '🎨', href: '/dashboard/contenido', section: 'workspace' },
  { label: 'Assets', icon: '📁', href: '/dashboard/assets', section: 'workspace', roles: NON_CLIENT },
  { label: 'AI Studio', icon: '⚡', href: '/dashboard/ai-studio', section: 'workspace', roles: NON_CLIENT },
  { label: 'Agencia', icon: '⚙️', href: '/dashboard/settings', section: 'config', roles: ADMIN_ROLES },
];

const sectionLabels = {
  principal: 'Principal',
  workspace: 'Workspace',
  config: 'Config',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useCurrentUser();
  const org = useOrganization();
  const { data: clients } = useClients();

  // Sidebar state: collapsed (icons only) and mobile open/close
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Platform admin status (Jorge's god-mode sidebar entry)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  // Impersonation state — read from cookie synchronously
  const [impersonatingOrg, setImpersonatingOrg] = useState<string | null>(null);
  useEffect(() => {
    const cookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('x-impersonate-org='));
    setImpersonatingOrg(cookie?.split('=')[1] || null);
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/me/is-platform-admin', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { isAdmin: false }))
      .then((d) => {
        if (!cancelled) setIsPlatformAdmin(Boolean(d?.isAdmin));
      })
      .catch(() => {
        /* non-admin → silently ignore */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleExitImpersonation = async () => {
    await fetch('/api/platform/impersonate', { method: 'DELETE' });
    document.cookie = 'x-impersonate-org=; path=/; max-age=0';
    setImpersonatingOrg(null);
    router.push('/platform');
    router.refresh();
  };

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close mobile sidebar on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.push('/auth/login');
      }
      if (event === 'TOKEN_REFRESHED') {
        router.refresh();
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const currentRole: MemberRole | null = user?.data?.member?.role ?? null;
  const isAdmin = currentRole ? ADMIN_ROLES.includes(currentRole) : false;

  const visibleNavItems = navItems.filter(
    (item) => !item.roles || (currentRole && item.roles.includes(currentRole))
  );

  const groupedNavItems = {
    principal: visibleNavItems.filter((item) => item.section === 'principal'),
    workspace: visibleNavItems.filter((item) => item.section === 'workspace'),
    config: visibleNavItems.filter((item) => item.section === 'config'),
  };

  const isActiveLink = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const sidebarWidth = collapsed ? 'w-[68px]' : 'w-[220px]';

  // Shared sidebar content
  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => {
    const showLabels = isMobile ? true : !collapsed;

    return (
      <>
        {/* Logo + Collapse Toggle */}
        <div className="px-4 pt-5 pb-2 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
            {showLabels ? (
              <img src="/socialgo-wordmark-light-cropped.svg" alt="SocialGo" style={{ height: 26 }} />
            ) : (
              <img src="/socialgo-isotipo-cropped.svg" alt="SocialGo" style={{ height: 26 }} />
            )}
          </Link>
          {!isMobile && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-all hover:scale-110"
              style={{ color: 'var(--text-mid)' }}
              title={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                <path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>

        {/* Agency Name + Role */}
        {showLabels && (
          <div className="px-5 pb-3">
            <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-dark)' }}>
              {org.data?.name || 'Mi Agencia'}
            </p>
            <p className="text-[10px] capitalize truncate" style={{ color: 'var(--text-light)' }}>
              {user.data?.member?.role === 'owner' ? 'Admin' : user.data?.member?.role === 'creative' ? 'Creativo' : user.data?.member?.role || 'Miembro'}
            </p>
          </div>
        )}

        {/* Theme Selector */}
        <ThemeSelector />

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto">
          {Object.entries(groupedNavItems).map(([section, items]) => (
            <div key={section} className="mb-4">
              {showLabels && (
                <div
                  className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-light)' }}
                >
                  {sectionLabels[section as keyof typeof sectionLabels]}
                </div>
              )}
              <div className="space-y-0.5">
                {items.map((item) => {
                  const isActive = isActiveLink(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => isMobile && setMobileOpen(false)}
                      className={`flex items-center gap-3 rounded-lg transition-all duration-200 ${
                        showLabels ? 'px-3 py-2' : 'px-0 py-2 justify-center'
                      } ${isActive ? 'text-white' : 'hover:text-[var(--text-dark)]'}`}
                      style={
                        isActive
                          ? { background: 'var(--gradient)', color: 'white' }
                          : { color: 'var(--text-mid)' }
                      }
                      title={!showLabels ? item.label : undefined}
                    >
                      <span className="text-lg flex-shrink-0">{item.icon}</span>
                      {showLabels && <span className="text-sm font-medium">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Platform Admin link (Jorge's god-mode, only shown to admins) */}
        {isPlatformAdmin && (
          <div className="px-3 pt-3 pb-1">
            <Link
              href="/platform"
              className={`flex items-center gap-3 rounded-lg transition-all duration-200 ${
                showLabels ? 'px-3 py-2' : 'px-0 py-2 justify-center'
              }`}
              style={{
                background: 'rgba(180, 249, 101, 0.12)',
                border: '1px solid rgba(180, 249, 101, 0.4)',
                color: '#0F1D27',
              }}
              title={!showLabels ? 'Platform Admin' : undefined}
            >
              <span className="text-lg flex-shrink-0">🛠️</span>
              {showLabels && (
                <span className="text-xs font-semibold uppercase tracking-wide">
                  Platform Admin
                </span>
              )}
            </Link>
          </div>
        )}

        {/* User Chip + Sign Out */}
        <div className="px-3 py-3 border-t space-y-2" style={{ borderTopColor: 'var(--glass-border)' }}>
          <div className={`flex items-center ${showLabels ? 'gap-3' : 'justify-center'}`}>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
              style={{ background: 'var(--gradient)' }}
            >
              {user.data?.member?.full_name ? getInitials(user.data.member.full_name) : 'U'}
            </div>
            {showLabels && (
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold truncate" style={{ color: 'var(--text-dark)' }}>
                  {user.data?.member?.full_name || 'User'}
                </div>
                <div className="text-xs truncate" style={{ color: 'var(--text-light)' }}>
                  {user.data?.member?.role || 'Member'}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={handleSignOut}
            className={`w-full flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80 ${
              showLabels ? 'px-3' : 'px-1'
            }`}
            style={{ background: 'var(--glass-border)', color: 'var(--text-mid)' }}
            title={!showLabels ? 'Cerrar sesión' : undefined}
          >
            {showLabels ? 'Cerrar sesión' : '🚪'}
          </button>
        </div>
      </>
    );
  };

  return (
    <AuthProvider>
    <ThemeProvider>
      <div className="flex h-screen" style={{ backgroundColor: 'var(--bg)' }}>

        {/* Mobile Top Bar */}
        <div
          className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2 border-b"
          style={{ backgroundColor: 'var(--bg)', borderBottomColor: 'var(--glass-border)' }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--surface)', color: 'var(--text-dark)' }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <Link href="/dashboard">
            <img src="/socialgo-wordmark-light-cropped.svg" alt="SocialGo" style={{ height: 40 }} />
          </Link>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
            style={{ background: 'var(--gradient)' }}
          >
            {user.data?.member?.full_name ? getInitials(user.data.member.full_name) : 'U'}
          </div>
        </div>

        {/* Mobile Overlay */}
        {mobileOpen && (
          <div
            className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          >
            <aside
              className="w-[260px] h-full flex flex-col border-r"
              style={{ background: 'var(--sidebar-bg)', borderRightColor: 'var(--glass-border)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <div className="absolute top-4 right-[-44px]">
                <button
                  onClick={() => setMobileOpen(false)}
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-black/30 text-white"
                >
                  ✕
                </button>
              </div>
              <SidebarContent isMobile={true} />
            </aside>
          </div>
        )}

        {/* Desktop Sidebar */}
        <aside
          className={`hidden md:flex ${sidebarWidth} flex-col border-r transition-all duration-200 flex-shrink-0`}
          style={{ background: 'var(--sidebar-bg)', borderRightColor: 'var(--glass-border)' }}
        >
          <SidebarContent />
        </aside>

        {/* Main Content Area */}
        <main
          className="flex-1 overflow-y-auto"
          style={{
            paddingTop: '0px',
            paddingLeft: '16px',
            paddingRight: '16px',
            paddingBottom: '28px',
            position: 'relative',
            zIndex: 1,
            color: 'var(--text-dark)',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @media (min-width: 768px) {
              main {
                padding-left: 32px !important;
                padding-right: 32px !important;
              }
            }
          `}</style>

          {/* Impersonation banner */}
          {impersonatingOrg && isPlatformAdmin && (
            <div
              className="mx-4 mt-4 p-3 rounded-xl border flex items-center justify-between gap-4"
              style={{
                background: 'rgba(180, 249, 101, 0.1)',
                borderColor: 'rgba(180, 249, 101, 0.4)',
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">👁️</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#B4F965' }}>
                    Modo impersonar — {org.data?.name || 'Agencia'}
                  </p>
                  <p className="text-[11px]" style={{ color: '#6C7A83' }}>
                    Estás viendo y operando como esta agencia. Los cambios son reales.
                  </p>
                </div>
              </div>
              <button
                onClick={handleExitImpersonation}
                className="px-4 py-2 rounded-lg text-xs font-bold transition-opacity hover:opacity-80 flex-shrink-0"
                style={{
                  background: '#B4F965',
                  color: '#0F1D27',
                }}
              >
                ← Salir a Platform
              </button>
            </div>
          )}

          {/* Plan status banner */}
          {org.data?.plan_status === 'canceled' && (
            <div className="mx-4 mt-4 p-4 rounded-xl border flex items-center justify-between gap-4" style={{ background: 'rgba(255,100,100,0.08)', borderColor: 'rgba(255,100,100,0.3)' }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#8A1F35' }}>Tu suscripción ha sido cancelada</p>
                <p className="text-xs mt-0.5" style={{ color: '#7A6560' }}>Tus datos siguen disponibles, pero no puedes crear nuevo contenido. Reactiva tu plan para continuar.</p>
              </div>
              <Link href="/pricing" className="px-4 py-2 rounded-lg text-sm font-semibold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, #FF8FAD 0%, #FFBA8A 100%)' }}>
                Reactivar plan
              </Link>
            </div>
          )}
          {org.data?.plan_status === 'past_due' && (
            <div className="mx-4 mt-4 p-4 rounded-xl border flex items-center justify-between gap-4" style={{ background: 'rgba(255,180,50,0.08)', borderColor: 'rgba(255,180,50,0.3)' }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#8A5A00' }}>Tienes un pago pendiente</p>
                <p className="text-xs mt-0.5" style={{ color: '#7A6560' }}>Actualiza tu método de pago para evitar la suspensión de tu cuenta.</p>
              </div>
              <button onClick={async () => { const res = await fetch('/api/stripe/portal', { method: 'POST' }); const data = await res.json(); if (data.url) window.location.href = data.url; }} className="px-4 py-2 rounded-lg text-sm font-semibold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, #FF8FAD 0%, #FFBA8A 100%)' }}>
                Actualizar pago
              </button>
            </div>
          )}

          {isAdmin && <OnboardingPopup hasClients={clients.length > 0} />}
          {children}
        </main>
      </div>
    </ThemeProvider>
    </AuthProvider>
  );
}
