'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCurrentUser, useOrganization } from '@/lib/hooks';
import { createClient } from '@/lib/supabase/client';
import { AuthProvider } from '@/lib/auth-context';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { ThemeSelector } from '@/components/theme/ThemeSelector';
// Official logo loaded from /public

interface NavItem {
  label: string;
  icon: string;
  href: string;
  section: 'principal' | 'workspace' | 'config';
}

const navItems: NavItem[] = [
  // Principal
  { label: 'Clientes', icon: '👥', href: '/dashboard', section: 'principal' },
  { label: 'Paquetes', icon: '📦', href: '/dashboard/packages', section: 'principal' },
  { label: 'Reportes', icon: '📊', href: '/dashboard/reports', section: 'principal' },
  // Workspace
  { label: 'Planificación', icon: '📋', href: '/dashboard/planning', section: 'workspace' },
  { label: 'Contenido', icon: '🎨', href: '/dashboard/contenido', section: 'workspace' },
  { label: 'Assets', icon: '📁', href: '/dashboard/assets', section: 'workspace' },
  { label: 'AI Studio', icon: '⚡', href: '/dashboard/ai-studio', section: 'workspace' },
  // Config
  { label: 'Agencia', icon: '⚙️', href: '/dashboard/settings', section: 'config' },
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

  // Listen for auth state changes to handle token refresh and session expiry
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.push('/auth/login');
      }
      if (event === 'TOKEN_REFRESHED') {
        // Force re-render by refreshing router when token refreshes
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

  const groupedNavItems = {
    principal: navItems.filter((item) => item.section === 'principal'),
    workspace: navItems.filter((item) => item.section === 'workspace'),
    config: navItems.filter((item) => item.section === 'config'),
  };

  const isActiveLink = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <AuthProvider>
    <ThemeProvider>
      <div className="flex h-screen" style={{ backgroundColor: 'var(--bg)' }}>
        {/* Sidebar */}
        <aside
          className="w-[220px] flex flex-col border-r"
          style={{
            background: 'var(--sidebar-bg)',
            borderRightColor: 'var(--glass-border)',
          }}
        >
        {/* Logo */}
        <div className="px-5 pt-6 pb-2 flex items-center">
          <Link href="/dashboard">
            <img src="/socialgo-wordmark-light-cropped.svg" alt="SocialGo" style={{ height: 28 }} />
          </Link>
        </div>

        {/* Agency Name + Role */}
        <div className="px-5 pb-4">
          <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-dark)' }}>
            {org.data?.name || 'Mi Agencia'}
          </p>
          <p className="text-[10px] capitalize truncate" style={{ color: 'var(--text-light)' }}>
            {user.data?.member?.role === 'owner' ? 'Admin' : user.data?.member?.role === 'creative' ? 'Creativo' : user.data?.member?.role || 'Miembro'}
          </p>
        </div>

        {/* Theme Selector */}
        <ThemeSelector />

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {Object.entries(groupedNavItems).map(([section, items]) => (
            <div key={section} className="mb-6">
              {/* Section Label */}
              <div
                className="px-3 py-2 text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'var(--text-light)' }}
              >
                {sectionLabels[section as keyof typeof sectionLabels]}
              </div>

              {/* Nav Items */}
              <div className="space-y-1">
                {items.map((item) => {
                  const isActive = isActiveLink(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                        isActive ? 'text-white' : 'hover:text-[var(--text-dark)]'
                      }`}
                      style={
                        isActive
                          ? {
                              background:
                                'var(--gradient)',
                              color: 'white',
                            }
                          : {
                              color: 'var(--text-mid)',
                            }
                      }
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Chip + Sign Out */}
        <div className="px-3 py-4 border-t space-y-2" style={{ borderTopColor: 'var(--glass-border)' }}>
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{
                background: 'var(--gradient)',
              }}
            >
              {user.data?.member?.full_name ? getInitials(user.data.member.full_name) : 'U'}
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div
                className="text-xs font-semibold truncate"
                style={{ color: 'var(--text-dark)' }}
              >
                {user.data?.member?.full_name || 'User'}
              </div>
              <div
                className="text-xs truncate"
                style={{ color: 'var(--text-light)' }}
              >
                {user.data?.member?.role || 'Member'}
              </div>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
            style={{
              background: 'var(--glass-border)',
              color: 'var(--text-mid)',
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main
        className="flex-1 overflow-y-auto px-8 py-7"
        style={{
          paddingLeft: '32px',
          paddingRight: '32px',
          paddingTop: '0px',
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
        `}</style>
        {children}
      </main>
    </div>
    </ThemeProvider>
    </AuthProvider>
  );
}
