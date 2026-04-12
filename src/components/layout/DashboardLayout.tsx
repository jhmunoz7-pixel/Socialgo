'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useCurrentUser } from '@/lib/hooks';

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
  { label: 'Calendario', icon: '🗓️', href: '/dashboard/calendar', section: 'workspace' },
  { label: 'Assets', icon: '🎨', href: '/dashboard/assets', section: 'workspace' },
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
  const user = useCurrentUser();

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
    <div className="flex h-screen bg-[#FFF8F3]">
      {/* Sidebar */}
      <aside
        className="w-[220px] flex flex-col border-r"
        style={{
          background: 'rgba(255,248,243,0.85)',
          backdropFilter: 'blur(20px)',
          borderRightColor: 'rgba(255,180,150,0.25)',
        }}
      >
        {/* Logo */}
        <div className="px-5 py-6 flex items-center gap-2">
          <span className="font-serif text-xl font-bold" style={{ color: '#2A1F1A' }}>
            socialgo
          </span>
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: '#FF8FAD' }}
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {Object.entries(groupedNavItems).map(([section, items]) => (
            <div key={section} className="mb-6">
              {/* Section Label */}
              <div
                className="px-3 py-2 text-xs font-semibold uppercase tracking-wide"
                style={{ color: '#B8A9A4' }}
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
                        isActive ? 'text-white' : 'text-[#7A6560] hover:text-[#2A1F1A]'
                      }`}
                      style={
                        isActive
                          ? {
                              background:
                                'linear-gradient(135deg, #FF8FAD 0%, #FFBA8A 100%)',
                            }
                          : {}
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

        {/* User Chip */}
        <div className="px-3 py-4 border-t" style={{ borderTopColor: 'rgba(255,180,150,0.25)' }}>
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{
                background: 'linear-gradient(135deg, #FF8FAD 0%, #FFD4B8 100%)',
              }}
            >
              {user?.name ? getInitials(user.name) : 'U'}
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div
                className="text-xs font-semibold truncate"
                style={{ color: '#2A1F1A' }}
              >
                {user?.name || 'User'}
              </div>
              <div
                className="text-xs truncate"
                style={{ color: '#B8A9A4' }}
              >
                {user?.role || 'Member'}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main
        className="flex-1 overflow-y-auto px-8 py-7"
        style={{
          paddingLeft: '32px',
          paddingRight: '32px',
          paddingTop: '28px',
          paddingBottom: '28px',
          position: 'relative',
          zIndex: 1,
          color: '#2A1F1A',
        }}
      >
        {children}
      </main>
    </div>
  );
}
