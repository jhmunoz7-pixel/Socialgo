'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  useCurrentUser,
  useStats,
  usePosts,
  useClients,
  useCanvaDesigns,
} from '@/lib/hooks';
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
} from 'lucide-react';

// Platform badge colors
const PLATFORM_BADGE: Record<string, { bg: string; text: string }> = {
  instagram: { bg: '#F3E8FF', text: '#7C3AED' },
  tiktok: { bg: '#E0F2FE', text: '#0284C7' },
  facebook: { bg: '#DBEAFE', text: '#2563EB' },
  linkedin: { bg: '#E0E7FF', text: '#4338CA' },
  twitter: { bg: '#F0F9FF', text: '#0EA5E9' },
  youtube: { bg: '#FEE2E2', text: '#DC2626' },
};

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
