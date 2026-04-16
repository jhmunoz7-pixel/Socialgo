'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePosts, useClients, useCurrentUser, useMembers, usePackages, useCanvaDesigns } from '@/lib/hooks';
import { ONBOARDING_TASKS, getCompletedTasks } from '@/lib/onboarding';
import type { Post, PostStatus, Member } from '@/types';
import {
  ListTodo,
  GanttChart,
  User,
  Calendar,
  Rocket,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from 'lucide-react';

type ViewMode = 'lista' | 'timeline';

// Stage grouping
interface StageGroup {
  key: string;
  label: string;
  dotColor: string;
  bgColor: string;
  statuses: PostStatus[];
}

const STAGE_GROUPS: StageGroup[] = [
  {
    key: 'in_progress',
    label: 'En progreso',
    dotColor: '#94A3B8',
    bgColor: '#F8FAFC',
    statuses: ['draft', 'planned'],
  },
  {
    key: 'to_review',
    label: 'Por revisar',
    dotColor: '#A78BFA',
    bgColor: '#FAFAFE',
    statuses: ['in_production', 'review_1_1'],
  },
  {
    key: 'client_pending',
    label: 'Pendiente de cliente',
    dotColor: '#F59E0B',
    bgColor: '#FFFCF5',
    statuses: ['scheduled', 'approved_with_changes'],
  },
];

const STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador',
  planned: 'Planeado',
  in_production: 'En produccion',
  review_1_1: 'Revision interna',
  scheduled: 'Programado',
  approved: 'Aprobado',
  approved_with_changes: 'Aprobado con cambios',
  published: 'Publicado',
  rejected: 'Rechazado',
  archived: 'Archivado',
};

const PLATFORM_BADGE: Record<string, { bg: string; text: string }> = {
  instagram: { bg: '#F3E8FF', text: '#7C3AED' },
  tiktok: { bg: '#E0F2FE', text: '#0284C7' },
  facebook: { bg: '#DBEAFE', text: '#2563EB' },
  linkedin: { bg: '#E0E7FF', text: '#4338CA' },
  twitter: { bg: '#F0F9FF', text: '#0EA5E9' },
  youtube: { bg: '#FEE2E2', text: '#DC2626' },
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return 'Sin fecha';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

function getPriority(scheduledDate: string | null): { label: string; color: string; bg: string } {
  if (!scheduledDate) return { label: 'Sin fecha', color: '#94A3B8', bg: '#F1F5F9' };
  const now = new Date();
  const scheduled = new Date(scheduledDate + 'T12:00:00');
  const diffDays = Math.ceil((scheduled.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: 'Vencido', color: '#DC2626', bg: '#FEF2F2' };
  if (diffDays < 2) return { label: 'Urgente', color: '#DC2626', bg: '#FEF2F2' };
  if (diffDays < 7) return { label: 'Normal', color: '#F59E0B', bg: '#FFFBEB' };
  return { label: 'Bajo', color: '#10B981', bg: '#F0FDF4' };
}

function getProgressPercent(status: PostStatus): number {
  const map: Record<string, number> = {
    draft: 25,
    planned: 50,
    in_production: 75,
    review_1_1: 80,
    scheduled: 90,
    approved: 95,
    approved_with_changes: 85,
    published: 100,
    rejected: 0,
    archived: 100,
  };
  return map[status] ?? 0;
}

function getProgressColor(percent: number): string {
  if (percent >= 90) return '#10B981';
  if (percent >= 70) return '#6366F1';
  if (percent >= 50) return '#A78BFA';
  return '#94A3B8';
}

function getInitials(name: string | null) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function PendientesPage() {
  const [view, setView] = useState<ViewMode>('lista');
  const { data: posts, loading: postsLoading } = usePosts();
  const { data: clients } = useClients();
  const { data: members } = useMembers();
  const { data: packages } = usePackages();
  const { data: canvaDesigns } = useCanvaDesigns(undefined, 'wip');
  const user = useCurrentUser();

  // Onboarding
  const completedTasks = useMemo(() => getCompletedTasks({
    clientsCount: clients.length,
    packagesCount: packages.length,
    membersCount: members.length,
    postsCount: posts.length,
    canvaDesignsCount: canvaDesigns.length,
    reviewPostsCount: posts.filter(p => p.status === 'in_production' || p.status === 'review_1_1').length,
    approvedPostsCount: posts.filter(p => p.approval_status === 'approved').length,
    publishedPostsCount: posts.filter(p => p.status === 'published').length,
  }), [clients, packages, members, posts, canvaDesigns]);

  const [dismissedTasks] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set<string>();
    try {
      const stored = localStorage.getItem('sg_onboarding_dismissed');
      return stored ? new Set<string>(JSON.parse(stored)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  const [onboardingOpen, setOnboardingOpen] = useState(true);
  const [hideCompletedOnboarding, setHideCompletedOnboarding] = useState(false);


  const incompleteTasks = ONBOARDING_TASKS.filter(t => !completedTasks.has(t.id) && !dismissedTasks.has(t.id));

  // Client lookup map
  const clientMap = useMemo(() => {
    const map: Record<string, { name: string; emoji: string; color: string }> = {};
    clients.forEach((c) => {
      map[c.id] = { name: c.name, emoji: c.emoji || '🏢', color: c.color || '#6366F1' };
    });
    return map;
  }, [clients]);

  // Member lookup map
  const memberMap = useMemo(() => {
    const map: Record<string, Member> = {};
    members.forEach((m) => {
      map[m.id] = m;
    });
    return map;
  }, [members]);

  // Filter: only "actionable" posts (not published, archived, approved)
  const actionablePosts = useMemo(() => {
    return posts.filter(
      (p) => !['published', 'archived', 'approved'].includes(p.status)
    );
  }, [posts]);

  // Group by stage
  const groupedPosts = useMemo(() => {
    return STAGE_GROUPS.map((group) => ({
      ...group,
      posts: actionablePosts.filter((p) => group.statuses.includes(p.status)),
    }));
  }, [actionablePosts]);

  // Timeline data: next 3 weeks grouped by client
  const timelineData = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - start.getDay()); // Start of current week (Sunday)
    const end = new Date(start);
    end.setDate(end.getDate() + 21); // 3 weeks

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    // Generate date columns
    const dates: string[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      dates.push(cursor.toISOString().split('T')[0]);
      cursor.setDate(cursor.getDate() + 1);
    }

    // Group posts by client
    const byClient: Record<string, Post[]> = {};
    actionablePosts.forEach((p) => {
      if (!p.scheduled_date) return;
      if (p.scheduled_date < startStr || p.scheduled_date > endStr) return;
      if (!byClient[p.client_id]) byClient[p.client_id] = [];
      byClient[p.client_id].push(p);
    });

    return { dates, byClient, start, end };
  }, [actionablePosts]);

  const isLoading = postsLoading || user.loading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full" style={{ background: 'linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)' }} />
          <p className="text-sm" style={{ color: 'var(--text-light)' }}>Cargando pendientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-dark)' }}>
            <ListTodo className="w-5 h-5" style={{ color: '#6366F1' }} />
            Pendientes
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-light)' }}>
            {actionablePosts.length} tarea{actionablePosts.length !== 1 ? 's' : ''} en proceso
          </p>
        </div>

        {/* View Toggle */}
        <div
          className="flex rounded-lg p-0.5"
          style={{ background: '#F1F5F9', border: '1px solid rgba(148,163,184,0.2)' }}
        >
          <button
            onClick={() => setView('lista')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            style={{
              background: view === 'lista' ? 'linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)' : 'transparent',
              color: view === 'lista' ? 'white' : '#64748B',
            }}
            title="Vista lista"
          >
            <ListTodo className="w-3.5 h-3.5" />
            Lista
          </button>
          <button
            onClick={() => setView('timeline')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            style={{
              background: view === 'timeline' ? 'linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)' : 'transparent',
              color: view === 'timeline' ? 'white' : '#64748B',
            }}
            title="Vista timeline"
          >
            <GanttChart className="w-3.5 h-3.5" />
            Timeline
          </button>
        </div>
      </div>

      {/* ── Onboarding: Tareas de configuracion ── */}
      {incompleteTasks.length > 0 && (
        <div
          className="rounded-2xl mb-6 overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 50%, #FDF4FF 100%)',
            border: '1px solid rgba(99,102,241,0.2)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          {/* Collapsible header */}
          <button
            onClick={() => setOnboardingOpen(o => !o)}
            className="w-full flex items-center justify-between px-5 py-4 text-left"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)' }}
              >
                <Rocket className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: '#312E81' }}>
                  Tareas de configuracion
                </h3>
                <p className="text-xs" style={{ color: '#6366F1' }}>
                  {incompleteTasks.length} pendiente{incompleteTasks.length !== 1 ? 's' : ''} de {ONBOARDING_TASKS.length}
                </p>
              </div>
            </div>
            {onboardingOpen ? (
              <ChevronUp className="w-4 h-4" style={{ color: '#6366F1' }} />
            ) : (
              <ChevronDown className="w-4 h-4" style={{ color: '#6366F1' }} />
            )}
          </button>

          {/* Collapsible body */}
          {onboardingOpen && (
            <div className="px-5 pb-4 space-y-2">
              {/* Progress bar */}
              <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: 'rgba(99,102,241,0.15)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    background: 'linear-gradient(90deg, #6366F1, #A78BFA, #C084FC)',
                    width: `${(completedTasks.size / ONBOARDING_TASKS.length) * 100}%`,
                  }}
                />
              </div>

              {ONBOARDING_TASKS.map((task) => {
                const isCompleted = completedTasks.has(task.id);
                const isDismissed = dismissedTasks.has(task.id);
                if (isDismissed) return null;
                if (isCompleted && hideCompletedOnboarding) return null;

                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                    style={{
                      background: isCompleted ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.8)',
                      border: isCompleted
                        ? '1px solid rgba(16,185,129,0.2)'
                        : '1px solid rgba(148,163,184,0.15)',
                    }}
                  >
                    {/* Icon */}
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: '#10B981' }} />
                    ) : (
                      <span className="text-lg flex-shrink-0">{task.icon}</span>
                    )}

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${isCompleted ? 'line-through' : ''}`}
                        style={{ color: isCompleted ? '#94A3B8' : '#312E81' }}
                      >
                        {task.label}
                      </p>
                      {!isCompleted && (
                        <p className="text-xs" style={{ color: '#6366F1' }}>
                          {task.description}
                        </p>
                      )}
                    </div>

                    {/* Action button */}
                    {!isCompleted && (
                      <Link
                        href={task.href}
                        className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                        style={{
                          background: 'linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)',
                          color: 'white',
                        }}
                      >
                        Ir
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                );
              })}

              {/* Toggle completed */}
              {ONBOARDING_TASKS.some(t => completedTasks.has(t.id)) && (
                <button
                  onClick={() => setHideCompletedOnboarding(h => !h)}
                  className="text-xs font-medium mt-2 px-2 py-1 rounded-md hover:bg-white/60 transition-colors"
                  style={{ color: '#6366F1' }}
                >
                  {hideCompletedOnboarding ? 'Mostrar completados' : 'Ocultar completados'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Lista View ── */}
      {view === 'lista' && (
        <div className="space-y-6">
          {groupedPosts.map((group) => (
            <div key={group.key}>
              {/* Stage header */}
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: group.dotColor }}
                />
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text-dark)' }}>
                  {group.label}
                </h2>
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{ background: '#F1F5F9', color: 'var(--text-mid)' }}
                >
                  {group.posts.length}
                </span>
              </div>

              {group.posts.length === 0 ? (
                <div
                  className="rounded-xl p-4 text-center"
                  style={{ background: group.bgColor, border: '1px solid rgba(148,163,184,0.1)' }}
                >
                  <p className="text-xs" style={{ color: 'var(--text-light)' }}>
                    No hay tareas en esta etapa.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {group.posts.map((post) => {
                    const client = clientMap[post.client_id];
                    const priority = getPriority(post.scheduled_date);
                    const progress = getProgressPercent(post.status);
                    const assignedMember = post.assigned_to ? memberMap[post.assigned_to] : null;

                    return (
                      <div
                        key={post.id}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors hover:shadow-sm"
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid rgba(148,163,184,0.15)',
                        }}
                      >
                        {/* Stage dot */}
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: group.dotColor }}
                        />

                        {/* Post name */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-dark)' }}>
                            {post.name || 'Sin nombre'}
                          </p>
                          <p className="text-[11px] truncate" style={{ color: 'var(--text-light)' }}>
                            {STATUS_LABEL[post.status] || post.status}
                          </p>
                        </div>

                        {/* Client */}
                        <div className="flex items-center gap-1.5 flex-shrink-0" title={client?.name}>
                          <span className="text-sm">{client?.emoji || '📝'}</span>
                          <span className="text-xs hidden sm:inline max-w-[80px] truncate" style={{ color: 'var(--text-mid)' }}>
                            {client?.name || 'Cliente'}
                          </span>
                        </div>

                        {/* Platform badge */}
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                          style={{
                            background: PLATFORM_BADGE[post.platform]?.bg || '#F1F5F9',
                            color: PLATFORM_BADGE[post.platform]?.text || '#64748B',
                          }}
                        >
                          {post.platform}
                        </span>

                        {/* Scheduled date */}
                        <span className="text-xs flex-shrink-0 tabular-nums w-[60px] text-right" style={{ color: 'var(--text-mid)' }}>
                          {formatDate(post.scheduled_date)}
                        </span>

                        {/* Assigned member */}
                        <div className="flex-shrink-0 w-7 h-7" title={assignedMember?.full_name || 'Sin asignar'}>
                          {assignedMember ? (
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                              style={{ background: 'linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)' }}
                            >
                              {getInitials(assignedMember.full_name)}
                            </div>
                          ) : (
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center"
                              style={{ background: '#F1F5F9' }}
                            >
                              <User className="w-3.5 h-3.5" style={{ color: '#94A3B8' }} />
                            </div>
                          )}
                        </div>

                        {/* Priority */}
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                          style={{ background: priority.bg, color: priority.color }}
                        >
                          {priority.label}
                        </span>

                        {/* Progress bar */}
                        <div className="flex-shrink-0 w-16">
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#F1F5F9' }}>
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${progress}%`,
                                background: getProgressColor(progress),
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Timeline View ── */}
      {view === 'timeline' && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: '#FFFFFF',
            border: '1px solid rgba(148,163,184,0.2)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div className="overflow-x-auto">
            <div style={{ minWidth: timelineData.dates.length * 44 + 180 }}>
              {/* Date header */}
              <div className="flex border-b" style={{ borderBottomColor: 'rgba(148,163,184,0.15)' }}>
                <div
                  className="w-[180px] flex-shrink-0 px-4 py-3 text-xs font-semibold"
                  style={{ color: 'var(--text-mid)', borderRight: '1px solid rgba(148,163,184,0.15)' }}
                >
                  Cliente
                </div>
                {timelineData.dates.map((dateStr) => {
                  const d = new Date(dateStr + 'T12:00:00');
                  const isToday = dateStr === new Date().toISOString().split('T')[0];
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <div
                      key={dateStr}
                      className="flex-shrink-0 w-[44px] py-2 text-center"
                      style={{
                        background: isToday ? '#EEF2FF' : isWeekend ? '#FAFAFA' : 'transparent',
                        borderRight: '1px solid rgba(148,163,184,0.08)',
                      }}
                    >
                      <p className="text-[9px] uppercase" style={{ color: 'var(--text-light)' }}>
                        {d.toLocaleDateString('es-MX', { weekday: 'narrow' })}
                      </p>
                      <p
                        className="text-[11px] font-medium"
                        style={{ color: isToday ? '#6366F1' : 'var(--text-mid)' }}
                      >
                        {d.getDate()}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Client rows */}
              {Object.entries(timelineData.byClient).length === 0 ? (
                <div className="py-12 text-center">
                  <Calendar className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-light)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-light)' }}>
                    No hay posts programados en las proximas 3 semanas.
                  </p>
                </div>
              ) : (
                Object.entries(timelineData.byClient).map(([clientId, clientPosts]) => {
                  const client = clientMap[clientId];
                  return (
                    <div
                      key={clientId}
                      className="flex border-b last:border-b-0"
                      style={{ borderBottomColor: 'rgba(148,163,184,0.1)' }}
                    >
                      {/* Client label */}
                      <div
                        className="w-[180px] flex-shrink-0 px-4 py-3 flex items-center gap-2"
                        style={{ borderRight: '1px solid rgba(148,163,184,0.15)' }}
                      >
                        <span className="text-sm">{client?.emoji || '📝'}</span>
                        <span className="text-xs font-medium truncate" style={{ color: 'var(--text-dark)' }}>
                          {client?.name || 'Cliente'}
                        </span>
                      </div>

                      {/* Date cells */}
                      {timelineData.dates.map((dateStr) => {
                        const matchingPosts = clientPosts.filter((p) => p.scheduled_date === dateStr);
                        const d = new Date(dateStr + 'T12:00:00');
                        const isToday = dateStr === new Date().toISOString().split('T')[0];
                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;

                        return (
                          <div
                            key={dateStr}
                            className="flex-shrink-0 w-[44px] py-1.5 px-0.5 flex flex-col items-center gap-0.5"
                            style={{
                              background: isToday ? '#EEF2FF' : isWeekend ? '#FAFAFA' : 'transparent',
                              borderRight: '1px solid rgba(148,163,184,0.08)',
                            }}
                          >
                            {matchingPosts.map((post) => {
                              const stageGroup = STAGE_GROUPS.find((g) => g.statuses.includes(post.status));
                              return (
                                <div
                                  key={post.id}
                                  className="w-8 h-5 rounded-md flex items-center justify-center cursor-default"
                                  style={{
                                    background: stageGroup?.dotColor || '#94A3B8',
                                    opacity: 0.85,
                                  }}
                                  title={`${post.name || 'Post'} — ${post.platform} — ${STATUS_LABEL[post.status] || post.status}`}
                                >
                                  <span className="text-[8px] font-bold text-white">
                                    {post.platform.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Legend */}
          <div
            className="flex items-center gap-4 px-4 py-3 border-t"
            style={{ borderTopColor: 'rgba(148,163,184,0.15)' }}
          >
            {STAGE_GROUPS.map((g) => (
              <div key={g.key} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ background: g.dotColor }} />
                <span className="text-[10px]" style={{ color: 'var(--text-mid)' }}>{g.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
