'use client';

import { useState, useEffect, useMemo } from 'react';
import { useClients, usePackages, useMembers, usePosts } from '@/lib/hooks';
import { useOrganization, useCurrentUser } from '@/lib/hooks';
import Link from 'next/link';

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  href: string;
  completed: boolean;
  emoji: string;
}

export function OnboardingChecklist() {
  const { data: org } = useOrganization();
  const { data: currentUser } = useCurrentUser();
  const { data: clients } = useClients();
  const { data: packages } = usePackages();
  const { data: members } = useMembers();
  const { data: posts } = usePosts();
  const [dismissed, setDismissed] = useState(false);

  // Only show for owners
  const isOwner = currentUser?.member?.role === 'owner';

  // Check localStorage for dismissal
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const key = `onboarding_dismissed_${org?.id}`;
      if (localStorage.getItem(key) === 'true') {
        setDismissed(true);
      }
    }
  }, [org?.id]);

  const checklist: ChecklistItem[] = useMemo(() => [
    {
      id: 'org_name',
      label: 'Configura tu agencia',
      description: 'Nombre, email y timezone de tu organización',
      href: '/dashboard/settings',
      completed: !!(org?.name && org.name !== 'Mi Agencia' && org?.email),
      emoji: '⚙️',
    },
    {
      id: 'package',
      label: 'Crea un paquete de servicio',
      description: 'Define los planes que ofreces a tus clientes',
      href: '/dashboard/packages',
      completed: (packages?.length ?? 0) > 0,
      emoji: '📦',
    },
    {
      id: 'client',
      label: 'Agrega tu primer cliente',
      description: 'Crea la ficha de tu primer cliente/marca',
      href: '/dashboard',
      completed: (clients?.length ?? 0) > 0,
      emoji: '👥',
    },
    {
      id: 'post',
      label: 'Crea tu primer post',
      description: 'Planifica contenido para un cliente',
      href: '/dashboard/planning',
      completed: (posts?.length ?? 0) > 0,
      emoji: '📋',
    },
    {
      id: 'team',
      label: 'Invita a tu equipo',
      description: 'Agrega creativos o miembros al equipo',
      href: '/dashboard/settings',
      completed: (members?.length ?? 0) > 1,
      emoji: '🤝',
    },
  ], [org, packages, clients, posts, members]);

  const completedCount = checklist.filter((item) => item.completed).length;
  const totalCount = checklist.length;
  const allDone = completedCount === totalCount;
  const progress = Math.round((completedCount / totalCount) * 100);

  // Don't show if not owner, dismissed, or all complete
  if (!isOwner || dismissed || allDone) return null;

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== 'undefined' && org?.id) {
      localStorage.setItem(`onboarding_dismissed_${org.id}`, 'true');
    }
  };

  return (
    <div
      className="mx-4 mt-4 p-5 rounded-2xl border"
      style={{
        background: 'linear-gradient(135deg, rgba(255,181,200,0.08), rgba(232,213,255,0.08))',
        borderColor: 'rgba(255,181,200,0.3)',
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-serif font-bold" style={{ color: 'var(--text-dark)' }}>
            Configura tu agencia
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-mid)' }}>
            {completedCount} de {totalCount} pasos completados
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-xs px-2 py-1 rounded-lg transition-all hover:opacity-70"
          style={{ color: 'var(--text-light)' }}
        >
          Ocultar
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full mb-4" style={{ background: 'var(--glass-border)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, background: 'var(--gradient)' }}
        />
      </div>

      {/* Checklist */}
      <div className="space-y-2">
        {checklist.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
              item.completed ? 'opacity-60' : 'hover:scale-[1.01]'
            }`}
            style={{
              background: item.completed ? 'transparent' : 'var(--surface)',
              borderColor: 'var(--glass-border)',
            }}
          >
            <span className="text-lg flex-shrink-0">
              {item.completed ? '✅' : item.emoji}
            </span>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-semibold ${item.completed ? 'line-through' : ''}`}
                style={{ color: 'var(--text-dark)' }}
              >
                {item.label}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-mid)' }}>
                {item.description}
              </p>
            </div>
            {!item.completed && (
              <span className="text-xs font-semibold flex-shrink-0" style={{ color: 'var(--primary-deep)' }}>
                Ir →
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
