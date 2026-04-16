'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  useCurrentUser,
  useStats,
  usePosts,
  useClients,
  useCanvaDesigns,
  useMembers,
  usePackages,
} from '@/lib/hooks';
import { ONBOARDING_TASKS, getCompletedTasks } from '@/lib/onboarding';
// Post type used implicitly via usePosts() return
import {
  Home,
  DollarSign,
  Users,
  FileText,
  Clock,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Layers,
  ArrowRight,
  Calendar,
  AlertCircle,
  Rocket,
  Circle,
  X as XIcon,
  Eye,
  EyeOff,
  Flame,
  ClipboardCheck,
  UserCheck,
  Target,
} from 'lucide-react';
import type { PostStatus } from '@/types';

// Platform badge colors
const PLATFORM_BADGE: Record<string, { bg: string; text: string }> = {
  instagram: { bg: '#F3E8FF', text: '#7C3AED' },
  tiktok: { bg: '#E0F2FE', text: '#0284C7' },
  facebook: { bg: '#DBEAFE', text: '#2563EB' },
  linkedin: { bg: '#E0E7FF', text: '#4338CA' },
  twitter: { bg: '#F0F9FF', text: '#0EA5E9' },
  youtube: { bg: '#FEE2E2', text: '#DC2626' },
};

// Stage groups (mirrors Pendientes page)
interface StageGroup {
  key: string;
  label: string;
  icon: typeof Flame;
  accent: string;
  bg: string;
  bgSoft: string;
  statuses: PostStatus[];
}

const STAGE_GROUPS: StageGroup[] = [
  {
    key: 'in_progress',
    label: 'En progreso',
    icon: Flame,
    accent: '#6366F1',
    bg: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
    bgSoft: '#EEF2FF',
    statuses: ['draft', 'planned'],
  },
  {
    key: 'to_review',
    label: 'Por revisar',
    icon: ClipboardCheck,
    accent: '#A78BFA',
    bg: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
    bgSoft: '#F5F3FF',
    statuses: ['in_production', 'review_1_1'],
  },
  {
    key: 'client_pending',
    label: 'Pendiente cliente',
    icon: UserCheck,
    accent: '#F59E0B',
    bg: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
    bgSoft: '#FFFBEB',
    statuses: ['scheduled', 'approved_with_changes'],
  },
];

// Status labels in Spanish
const STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador',
  planned: 'Planeado',
  in_production: 'En produccion',
  review_1_1: 'Revision interna',
  scheduled: 'Programado',
  approved: 'Aprobado',
  published: 'Publicado',
  rejected: 'Rechazado',
  archived: 'Archivado',
  approved_with_changes: 'Aprobado con cambios',
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return 'Sin fecha';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

function formatFullDate(date: Date) {
  return date.toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function HomePage() {
  const user = useCurrentUser();
  const stats = useStats();
  const { data: posts, loading: postsLoading } = usePosts();
  const { data: clients } = useClients();
  const { data: designs } = useCanvaDesigns(undefined, 'wip');
  const { data: members } = useMembers();
  const { data: packages } = usePackages();

  // Onboarding state
  const completedTasks = useMemo(() => getCompletedTasks({
    clientsCount: clients.length,
    packagesCount: packages.length,
    membersCount: members.length,
    postsCount: posts.length,
    canvaDesignsCount: designs.length,
    reviewPostsCount: posts.filter(p => p.status === 'in_production' || p.status === 'review_1_1').length,
    approvedPostsCount: posts.filter(p => p.approval_status === 'approved').length,
    publishedPostsCount: posts.filter(p => p.status === 'published').length,
  }), [clients, packages, members, posts, designs]);

  const [dismissedTasks, setDismissedTasks] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set<string>();
    try {
      const stored = localStorage.getItem('sg_onboarding_dismissed');
      return stored ? new Set<string>(JSON.parse(stored)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  const [hideCompleted, setHideCompleted] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('sg_onboarding_dismissed', JSON.stringify([...dismissedTasks]));
    } catch { /* ignore */ }
  }, [dismissedTasks]);

  const dismissTask = (taskId: string) => {
    setDismissedTasks(prev => {
      const next = new Set(prev);
      next.add(taskId);
      return next;
    });
  };

  const completedCount = ONBOARDING_TASKS.filter(t => completedTasks.has(t.id) || dismissedTasks.has(t.id)).length;
  const showOnboarding = completedCount < ONBOARDING_TASKS.length;

  const userName = user.data?.member?.full_name?.split(' ')[0] || 'Usuario';
  const today = new Date();
  const greeting = today.getHours() < 12 ? 'Buenos dias' : today.getHours() < 18 ? 'Buenas tardes' : 'Buenas noches';

  // Client lookup map
  const clientMap = useMemo(() => {
    const map: Record<string, { name: string; emoji: string }> = {};
    clients.forEach((c) => {
      map[c.id] = { name: c.name, emoji: c.emoji || '🏢' };
    });
    return map;
  }, [clients]);

  // Upcoming posts (scheduled in the future, sorted ascending)
  const upcomingPosts = useMemo(() => {
    const todayStr = today.toISOString().split('T')[0];
    return posts
      .filter((p) => p.scheduled_date && p.scheduled_date >= todayStr && p.status !== 'published' && p.status !== 'archived')
      .sort((a, b) => (a.scheduled_date || '').localeCompare(b.scheduled_date || ''))
      .slice(0, 5);
  }, [posts, today]);

  // Posts pending approval (review_1_1 or approval_status === 'pending')
  const pendingApprovals = useMemo(() => {
    return posts
      .filter((p) => p.status === 'review_1_1' || (p.approval_status === 'pending' && p.status !== 'draft'))
      .slice(0, 3);
  }, [posts]);

  // Actionable posts grouped by stage (for Retos section)
  const stageCounts = useMemo(() => {
    const actionable = posts.filter(
      (p) => !['published', 'archived', 'approved'].includes(p.status)
    );
    const totalActionable = actionable.length;
    return {
      total: totalActionable,
      groups: STAGE_GROUPS.map((g) => {
        const groupPosts = actionable.filter((p) => g.statuses.includes(p.status));
        const preview = groupPosts.slice(0, 3);
        return {
          ...g,
          count: groupPosts.length,
          percent: totalActionable > 0 ? Math.round((groupPosts.length / totalActionable) * 100) : 0,
          preview,
        };
      }),
    };
  }, [posts]);

  // Recent activity (last 10 posts created/updated, descending)
  const recentActivity = useMemo(() => {
    return [...posts]
      .sort((a, b) => (b.updated_at || b.created_at).localeCompare(a.updated_at || a.created_at))
      .slice(0, 6);
  }, [posts]);

  // AI insights
  const avgAiScore = useMemo(() => {
    const scored = posts.filter((p) => p.ai_score !== null && p.ai_score !== undefined);
    if (scored.length === 0) return null;
    return Math.round(scored.reduce((sum, p) => sum + (p.ai_score || 0), 0) / scored.length);
  }, [posts]);

  // Posts this month count
  const postsThisMonth = useMemo(() => {
    const monthStr = today.toISOString().slice(0, 7);
    return posts.filter((p) => p.scheduled_date?.startsWith(monthStr)).length;
  }, [posts, today]);

  // Latest WIP designs
  const latestDesigns = designs.slice(0, 3);

  const isLoading = user.loading || postsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full" style={{ background: 'linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)' }} />
          <p className="text-sm" style={{ color: 'var(--text-light)' }}>Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 max-w-[1400px] mx-auto">
      {/* CSS Grid Layout */}
      <div
        className="grid gap-5"
        style={{
          gridTemplateColumns: 'repeat(12, 1fr)',
          gridTemplateRows: 'auto',
        }}
      >
        {/* ── Welcome Banner ── */}
        <div
          className="rounded-2xl p-6 relative overflow-hidden"
          style={{
            gridColumn: 'span 8',
            background: 'linear-gradient(135deg, #6366F1 0%, #A78BFA 50%, #38BDF8 100%)',
            minHeight: 140,
          }}
        >
          {/* Decorative circles */}
          <div
            className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-20"
            style={{ background: 'white' }}
          />
          <div
            className="absolute -bottom-12 -left-6 w-32 h-32 rounded-full opacity-10"
            style={{ background: 'white' }}
          />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">{greeting}, </p>
              <h1 className="text-2xl font-bold text-white mt-1">{userName}</h1>
              <p className="text-white/70 text-sm mt-2 capitalize">{formatFullDate(today)}</p>
            </div>
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold"
              style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}
            >
              {userName.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="relative z-10 flex gap-6 mt-5">
            <div className="flex items-center gap-2 text-white/90 text-sm">
              <Calendar className="w-4 h-4" />
              <span>{postsThisMonth} posts este mes</span>
            </div>
            <div className="flex items-center gap-2 text-white/90 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>{pendingApprovals.length} por aprobar</span>
            </div>
          </div>
        </div>

        {/* ── MRR Quick Stat ── */}
        <div
          className="rounded-2xl p-5 flex flex-col justify-between"
          style={{
            gridColumn: 'span 4',
            background: '#FFFFFF',
            border: '1px solid rgba(148,163,184,0.2)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div className="flex items-center justify-between">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: '#EEF2FF' }}
            >
              <DollarSign className="w-5 h-5" style={{ color: '#6366F1' }} />
            </div>
            <div className="flex items-center gap-1 text-xs font-medium" style={{ color: '#10B981' }}>
              <TrendingUp className="w-3.5 h-3.5" />
              MRR
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold" style={{ color: 'var(--text-dark)' }}>
              ${stats.data?.totalMRR?.toLocaleString('es-MX') || '0'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-light)' }}>
              Ingreso mensual recurrente
            </p>
          </div>
        </div>

        {/* ── Stat: Clients ── */}
        <div
          className="rounded-2xl p-5"
          style={{
            gridColumn: 'span 3',
            background: '#FFFFFF',
            borderLeft: '4px solid #6366F1',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: '#EEF2FF' }}
            >
              <Users className="w-4.5 h-4.5" style={{ color: '#6366F1' }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-dark)' }}>
                {stats.data?.activeClientsCount || 0}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-light)' }}>Clientes activos</p>
            </div>
          </div>
        </div>

        {/* ── Stat: Posts ── */}
        <div
          className="rounded-2xl p-5"
          style={{
            gridColumn: 'span 3',
            background: '#FFFFFF',
            borderLeft: '4px solid #A78BFA',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: '#F5F3FF' }}
            >
              <FileText className="w-4.5 h-4.5" style={{ color: '#A78BFA' }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-dark)' }}>
                {postsThisMonth}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-light)' }}>Posts este mes</p>
            </div>
          </div>
          {/* Mini progress bar */}
          <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: '#F1F5F9' }}>
            <div
              className="h-full rounded-full"
              style={{
                background: 'linear-gradient(90deg, #A78BFA, #6366F1)',
                width: `${Math.min((postsThisMonth / Math.max(clients.length * 8, 1)) * 100, 100)}%`,
              }}
            />
          </div>
        </div>

        {/* ── Onboarding: Primeros pasos ── */}
        {showOnboarding && (
          <div
            className="rounded-2xl p-5"
            style={{
              gridColumn: 'span 12',
              background: 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 50%, #FDF4FF 100%)',
              border: '1px solid rgba(99,102,241,0.2)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)' }}
                >
                  <Rocket className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: '#312E81' }}>
                    Primeros pasos
                  </h3>
                  <p className="text-xs" style={{ color: '#6366F1' }}>
                    {completedTasks.size} de {ONBOARDING_TASKS.length} completados
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHideCompleted(h => !h)}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-white/60"
                style={{ color: '#6366F1' }}
              >
                {hideCompleted ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {hideCompleted ? 'Mostrar completados' : 'Ocultar completados'}
              </button>
            </div>

            {/* Progress bar */}
            <div className="h-2 rounded-full overflow-hidden mb-4" style={{ background: 'rgba(99,102,241,0.15)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  background: 'linear-gradient(90deg, #6366F1, #A78BFA, #C084FC)',
                  width: `${(completedTasks.size / ONBOARDING_TASKS.length) * 100}%`,
                }}
              />
            </div>

            {/* Task list */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {ONBOARDING_TASKS.map((task) => {
                const isCompleted = completedTasks.has(task.id);
                const isDismissed = dismissedTasks.has(task.id);
                if ((isCompleted || isDismissed) && hideCompleted) return null;
                if (isDismissed && !isCompleted) return null;

                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group"
                    style={{
                      background: isCompleted ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.7)',
                      border: isCompleted
                        ? '1px solid rgba(16,185,129,0.2)'
                        : '1px solid rgba(148,163,184,0.15)',
                    }}
                  >
                    {/* Check icon */}
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: '#10B981' }} />
                    ) : (
                      <Link href={task.href}>
                        <Circle className="w-5 h-5 flex-shrink-0 cursor-pointer hover:opacity-70 transition-opacity" style={{ color: '#A78BFA' }} />
                      </Link>
                    )}

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      {isCompleted ? (
                        <p className="text-sm line-through" style={{ color: '#94A3B8' }}>
                          {task.label}
                        </p>
                      ) : (
                        <Link href={task.href} className="block">
                          <p className="text-sm font-medium hover:underline" style={{ color: '#312E81' }}>
                            {task.label}
                          </p>
                          <p className="text-xs" style={{ color: '#6366F1' }}>
                            {task.description}
                          </p>
                        </Link>
                      )}
                    </div>

                    {/* Dismiss button (only for incomplete tasks) */}
                    {!isCompleted && (
                      <button
                        onClick={() => dismissTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-white/80"
                        title="Descartar"
                      >
                        <XIcon className="w-3.5 h-3.5" style={{ color: '#94A3B8' }} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Retos pendientes (dynamic stage board) ── */}
        <div
          className="rounded-2xl p-5"
          style={{
            gridColumn: 'span 12',
            background: '#FFFFFF',
            border: '1px solid rgba(148,163,184,0.2)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)' }}
              >
                <Target className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-dark)' }}>
                  Retos pendientes
                </h3>
                <p className="text-[11px]" style={{ color: 'var(--text-light)' }}>
                  {stageCounts.total} {stageCounts.total === 1 ? 'tarea en curso' : 'tareas en curso'}
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/pendientes"
              className="text-xs font-medium flex items-center gap-1 hover:opacity-80 transition-opacity"
              style={{ color: '#6366F1' }}
            >
              Ver tablero <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {stageCounts.total === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <CheckCircle2 className="w-10 h-10 mb-2" style={{ color: '#10B981' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--text-dark)' }}>
                ¡Al día!
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-light)' }}>
                No hay retos pendientes en este momento.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {stageCounts.groups.map((group) => {
                const Icon = group.icon;
                return (
                  <Link
                    key={group.key}
                    href="/dashboard/pendientes"
                    className="rounded-xl p-4 transition-all hover:shadow-md hover:-translate-y-0.5 duration-200 group"
                    style={{
                      background: group.bg,
                      border: `1px solid ${group.accent}30`,
                    }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ background: 'white' }}
                        >
                          <Icon className="w-4 h-4" style={{ color: group.accent }} />
                        </div>
                        <span className="text-xs font-semibold" style={{ color: group.accent }}>
                          {group.label}
                        </span>
                      </div>
                      <span
                        className="text-2xl font-bold tabular-nums"
                        style={{ color: group.accent }}
                      >
                        {group.count}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div
                      className="h-1.5 rounded-full overflow-hidden mb-3"
                      style={{ background: 'rgba(255,255,255,0.7)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${group.percent}%`,
                          background: group.accent,
                        }}
                      />
                    </div>

                    {/* Preview posts */}
                    {group.preview.length === 0 ? (
                      <p className="text-[11px] italic" style={{ color: 'var(--text-light)' }}>
                        Sin tareas en esta etapa.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {group.preview.map((post) => {
                          const client = clientMap[post.client_id];
                          return (
                            <div
                              key={post.id}
                              className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                              style={{ background: 'rgba(255,255,255,0.7)' }}
                            >
                              <span className="text-sm flex-shrink-0">{client?.emoji || '📝'}</span>
                              <span
                                className="text-[11px] font-medium truncate flex-1"
                                style={{ color: 'var(--text-dark)' }}
                              >
                                {post.name || 'Sin nombre'}
                              </span>
                              <span
                                className="text-[10px] flex-shrink-0 tabular-nums"
                                style={{ color: 'var(--text-light)' }}
                              >
                                {formatDate(post.scheduled_date)}
                              </span>
                            </div>
                          );
                        })}
                        {group.count > group.preview.length && (
                          <p className="text-[10px] text-center pt-1" style={{ color: group.accent }}>
                            +{group.count - group.preview.length} más
                          </p>
                        )}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Pending Approvals ── */}
        <div
          className="rounded-2xl p-5"
          style={{
            gridColumn: 'span 6',
            gridRow: 'span 1',
            background: '#FFFFFF',
            border: '1px solid rgba(148,163,184,0.2)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-dark)' }}>
              <AlertCircle className="w-4 h-4" style={{ color: '#F59E0B' }} />
              Pendientes de aprobacion
            </h3>
            <Link
              href="/dashboard/pendientes"
              className="text-xs font-medium flex items-center gap-1 hover:opacity-80 transition-opacity"
              style={{ color: '#6366F1' }}
            >
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {pendingApprovals.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <CheckCircle2 className="w-8 h-8 mb-2" style={{ color: '#10B981' }} />
              <p className="text-sm" style={{ color: 'var(--text-light)' }}>Todo al dia. No hay posts pendientes.</p>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {pendingApprovals.map((post) => {
                const client = clientMap[post.client_id];
                return (
                  <div
                    key={post.id}
                    className="flex-shrink-0 rounded-xl p-3 w-[200px]"
                    style={{
                      background: '#FEFCE8',
                      border: '1px solid rgba(245,158,11,0.2)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">{client?.emoji || '📝'}</span>
                      <span className="text-xs font-medium truncate" style={{ color: 'var(--text-dark)' }}>
                        {client?.name || 'Cliente'}
                      </span>
                    </div>
                    <p className="text-xs truncate mb-1" style={{ color: 'var(--text-mid)' }}>
                      {post.name || 'Sin nombre'}
                    </p>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: PLATFORM_BADGE[post.platform]?.bg || '#F1F5F9',
                          color: PLATFORM_BADGE[post.platform]?.text || '#64748B',
                        }}
                      >
                        {post.platform}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--text-light)' }}>
                        {formatDate(post.scheduled_date)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Upcoming Posts ── */}
        <div
          className="rounded-2xl p-5"
          style={{
            gridColumn: 'span 7',
            background: '#FFFFFF',
            border: '1px solid rgba(148,163,184,0.2)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-dark)' }}>
              <Clock className="w-4 h-4" style={{ color: '#6366F1' }} />
              Proximos posts
            </h3>
            <Link
              href="/dashboard/planning"
              className="text-xs font-medium flex items-center gap-1 hover:opacity-80 transition-opacity"
              style={{ color: '#6366F1' }}
            >
              Planificacion <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {upcomingPosts.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <Calendar className="w-8 h-8 mb-2" style={{ color: 'var(--text-light)' }} />
              <p className="text-sm" style={{ color: 'var(--text-light)' }}>No hay posts programados proximamente.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingPosts.map((post) => {
                const client = clientMap[post.client_id];
                return (
                  <div
                    key={post.id}
                    className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-lg flex-shrink-0">{client?.emoji || '📝'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-dark)' }}>
                        {post.name || 'Sin nombre'}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-light)' }}>
                        {client?.name || 'Cliente'}
                      </p>
                    </div>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                      style={{
                        background: PLATFORM_BADGE[post.platform]?.bg || '#F1F5F9',
                        color: PLATFORM_BADGE[post.platform]?.text || '#64748B',
                      }}
                    >
                      {post.platform}
                    </span>
                    <span className="text-xs flex-shrink-0 tabular-nums" style={{ color: 'var(--text-mid)' }}>
                      {formatDate(post.scheduled_date)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── AI Insights ── */}
        <div
          className="rounded-2xl p-5"
          style={{
            gridColumn: 'span 5',
            background: 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)',
            border: '1px solid rgba(99,102,241,0.15)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4" style={{ color: '#6366F1' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-dark)' }}>AI Insights</h3>
          </div>
          {avgAiScore !== null ? (
            <div className="flex items-center gap-5">
              {/* Score gauge */}
              <div className="relative w-20 h-20 flex-shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#E2E8F0" strokeWidth="8" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#6366F1"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(avgAiScore / 100) * 251} 251`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold" style={{ color: '#6366F1' }}>{avgAiScore}</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-dark)' }}>
                  Score promedio
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-mid)' }}>
                  {avgAiScore >= 80
                    ? 'Excelente calidad de contenido. Sigue asi.'
                    : avgAiScore >= 60
                    ? 'Buen nivel. Revisa las sugerencias de AI para mejorar.'
                    : 'Hay oportunidad de mejora. Usa AI Studio para optimizar.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-4 text-center">
              <Sparkles className="w-8 h-8 mb-2" style={{ color: 'var(--text-light)' }} />
              <p className="text-sm" style={{ color: 'var(--text-light)' }}>
                Usa AI Studio para analizar tus posts y obtener insights.
              </p>
            </div>
          )}
        </div>

        {/* ── Recent Activity ── */}
        <div
          className="rounded-2xl p-5"
          style={{
            gridColumn: 'span 7',
            background: '#FFFFFF',
            border: '1px solid rgba(148,163,184,0.2)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-dark)' }}>
              <Home className="w-4 h-4" style={{ color: '#6366F1' }} />
              Actividad reciente
            </h3>
          </div>
          {recentActivity.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: 'var(--text-light)' }}>
              No hay actividad reciente.
            </p>
          ) : (
            <div className="space-y-0">
              {recentActivity.map((post, i) => {
                const client = clientMap[post.client_id];
                const isLast = i === recentActivity.length - 1;
                return (
                  <div key={post.id} className="flex gap-3">
                    {/* Timeline dot + line */}
                    <div className="flex flex-col items-center">
                      <div
                        className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
                        style={{
                          background:
                            post.status === 'published'
                              ? '#10B981'
                              : post.status === 'approved'
                              ? '#6366F1'
                              : '#A78BFA',
                        }}
                      />
                      {!isLast && (
                        <div className="w-px flex-1 my-1" style={{ background: '#E2E8F0' }} />
                      )}
                    </div>
                    <div className="pb-3 min-w-0">
                      <p className="text-sm" style={{ color: 'var(--text-dark)' }}>
                        <span className="font-medium">{post.name || 'Post'}</span>
                        {' — '}
                        <span style={{ color: 'var(--text-mid)' }}>
                          {STATUS_LABEL[post.status] || post.status}
                        </span>
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-light)' }}>
                        {client?.emoji} {client?.name || 'Cliente'} · {formatDate(post.updated_at?.split('T')[0] || post.created_at?.split('T')[0])}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── WIP Designs ── */}
        <div
          className="rounded-2xl p-5"
          style={{
            gridColumn: 'span 5',
            background: '#FFFFFF',
            border: '1px solid rgba(148,163,184,0.2)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-dark)' }}>
              <Layers className="w-4 h-4" style={{ color: '#A78BFA' }} />
              WIP Designs
            </h3>
            <Link
              href="/dashboard/wip"
              className="text-xs font-medium flex items-center gap-1 hover:opacity-80 transition-opacity"
              style={{ color: '#6366F1' }}
            >
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {latestDesigns.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <Layers className="w-8 h-8 mb-2" style={{ color: 'var(--text-light)' }} />
              <p className="text-sm" style={{ color: 'var(--text-light)' }}>
                No hay disenos WIP. Conecta Canva para sincronizar.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {latestDesigns.map((design) => (
                <div key={design.id} className="group">
                  <div
                    className="aspect-square rounded-xl overflow-hidden mb-2"
                    style={{ background: '#F1F5F9', border: '1px solid rgba(148,163,184,0.15)' }}
                  >
                    {design.thumbnail_url ? (
                      <img
                        src={design.thumbnail_url}
                        alt={design.title || 'Design'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Layers className="w-6 h-6" style={{ color: 'var(--text-light)' }} />
                      </div>
                    )}
                  </div>
                  <p className="text-xs truncate" style={{ color: 'var(--text-mid)' }}>
                    {design.title || 'Sin titulo'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
