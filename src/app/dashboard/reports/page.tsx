'use client';

import { useState, useMemo } from 'react';
import { useStats, useClients, usePosts, usePackages, useCurrentUser, useMembers } from '@/lib/hooks';
import type { Post, PostType, Platform } from '@/types';
import { POST_TYPE_CONFIG, calculateMonthlyPayment } from '@/types';
import ExcelJS from 'exceljs';
import { BarChart3, TrendingUp, Award, Clock, Calendar, Building2, UserCircle, PaintBucket } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell,
  LineChart, Line, AreaChart, Area, ResponsiveContainer,
} from 'recharts';

// Hardcoded chart colors (CSS vars don't work in Recharts SVG)
const CHART_COLORS = {
  primary: '#6366F1',
  secondary: '#A78BFA',
  accent: '#38BDF8',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  muted: '#94A3B8',
};
const PIE_COLORS = ['#6366F1', '#A78BFA', '#38BDF8', '#86EFAC', '#93C5FD'];

type CompareMode = 'none' | 'prev_month' | 'same_month_last_year';
type ViewMode = 'agency' | 'client' | 'creative';

export default function ReportsPage() {
  const { data: currentUser } = useCurrentUser();
  const userRole = currentUser?.member?.role;
  const isAdmin = userRole === 'owner' || userRole === 'admin' || userRole === 'member';
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().split('T')[0].slice(0, 7));
  const [compareMode, setCompareMode] = useState<CompareMode>('none');
  const [viewMode, setViewMode] = useState<ViewMode>('agency');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedCreativeId, setSelectedCreativeId] = useState<string>('');
  const { loading: statsLoading } = useStats();
  const { data: clients, loading: clientsLoading } = useClients();
  const { data: posts, loading: postsLoading } = usePosts();
  const { data: packages, loading: packagesLoading } = usePackages();
  const { data: members } = useMembers();

  // Creatives-only (owners/admins can be assigned too, but prioritize creatives)
  const creatives = useMemo(
    () => members.filter((m) => ['creative', 'member', 'admin', 'owner'].includes(m.role)),
    [members]
  );

  // Filter posts by view mode. Computed before stats/charts so everything downstream respects the filter.
  const filteredPosts = useMemo(() => {
    if (viewMode === 'client' && selectedClientId) {
      return posts.filter((p) => p.client_id === selectedClientId);
    }
    if (viewMode === 'creative' && selectedCreativeId) {
      return posts.filter((p) => p.assigned_to === selectedCreativeId);
    }
    return posts;
  }, [posts, viewMode, selectedClientId, selectedCreativeId]);

  // Filter clients for view (when in creative mode, only clients with posts assigned to that creative)
  const filteredClients = useMemo(() => {
    if (viewMode === 'client' && selectedClientId) {
      return clients.filter((c) => c.id === selectedClientId);
    }
    if (viewMode === 'creative' && selectedCreativeId) {
      const clientIds = new Set(filteredPosts.map((p) => p.client_id));
      return clients.filter((c) => clientIds.has(c.id));
    }
    return clients;
  }, [clients, viewMode, selectedClientId, selectedCreativeId, filteredPosts]);

  // MRR only makes sense in agency view (or a single-client view)
  const showMRR = isAdmin && viewMode !== 'creative';

  // Format currency as MXN
  const formatMXN = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Helper: Filter posts by selected month
  const getPostsByMonth = (allPosts: Post[], month: string): Post[] => {
    return allPosts.filter(post => {
      if (!post.scheduled_date) return false;
      return post.scheduled_date.startsWith(month);
    });
  };

  // Compute comparison month string
  const comparisonMonth = useMemo(() => {
    if (compareMode === 'none') return null;
    const [year, month] = selectedMonth.split('-').map(Number);
    if (compareMode === 'prev_month') {
      const d = new Date(year, month - 2, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    // same_month_last_year
    return `${year - 1}-${String(month).padStart(2, '0')}`;
  }, [selectedMonth, compareMode]);

  // Compute stats for a given month
  const computeStatsForMonth = (month: string) => {
    if (!filteredClients || !filteredPosts) return { activeClients: 0, totalMRR: 0, postsThisMonth: 0, pendingPayments: 0 };
    const postsThisMonth = getPostsByMonth(filteredPosts, month);
    const clientsWithPosts = new Set(postsThisMonth.map(p => p.client_id));
    const activeClients = clientsWithPosts.size;

    let totalMRR = 0;
    filteredClients.forEach(client => {
      if (clientsWithPosts.has(client.id)) {
        const pkg = client.package_id
          ? packages?.find(p => p.id === client.package_id) || null
          : null;
        const monthlyPayment = calculateMonthlyPayment(pkg, client.package_type, client.custom_price);
        totalMRR += monthlyPayment;
      }
    });

    const pendingPayments = filteredClients.filter(c =>
      c.pay_status === 'pendiente' || c.pay_status === 'vencido'
    ).length;

    return { activeClients, totalMRR, postsThisMonth: postsThisMonth.length, pendingPayments };
  };

  // Computed stats for selected month
  const computedStats = useMemo(() => computeStatsForMonth(selectedMonth), [filteredClients, filteredPosts, selectedMonth, packages]);

  // Comparison stats
  const comparisonStats = useMemo(() => {
    if (!comparisonMonth) return null;
    return computeStatsForMonth(comparisonMonth);
  }, [comparisonMonth, filteredClients, filteredPosts, packages]);

  // Delta percentage helper
  const getDelta = (current: number, previous: number): { value: number; positive: boolean } | null => {
    if (!comparisonStats) return null;
    if (previous === 0 && current === 0) return { value: 0, positive: true };
    if (previous === 0) return { value: 100, positive: true };
    const delta = ((current - previous) / previous) * 100;
    return { value: Math.abs(Math.round(delta)), positive: delta >= 0 };
  };

  // Client performance data
  const clientPerformance = useMemo(() => {
    if (!filteredClients || !filteredPosts) return [];

    const postsThisMonth = getPostsByMonth(filteredPosts, selectedMonth);

    return filteredClients
      .map(client => {
        const clientPosts = postsThisMonth.filter(p => p.client_id === client.id);
        const aiScores = clientPosts
          .map(p => p.ai_score)
          .filter((score): score is number => score !== null && score !== undefined);

        const avgAiScore = aiScores.length > 0
          ? aiScores.reduce((a, b) => a + b, 0) / aiScores.length
          : 0;

        const approvedCount = clientPosts.filter(p =>
          p.approval_status === 'approved' || p.approval_status === 'approved_with_changes'
        ).length;

        const approvalRate = clientPosts.length > 0
          ? (approvedCount / clientPosts.length) * 100
          : 0;

        return {
          id: client.id,
          name: client.name,
          emoji: client.emoji,
          postsCount: clientPosts.length,
          avgAiScore: Math.round(avgAiScore * 10) / 10,
          approvalRate: Math.round(approvalRate),
          payStatus: client.pay_status,
          accountStatus: client.account_status,
        };
      })
      .sort((a, b) => b.postsCount - a.postsCount);
  }, [filteredClients, filteredPosts, selectedMonth]);

  // Content distribution by post type (for PieChart)
  const postTypeDistribution = useMemo(() => {
    if (!filteredPosts) return [];

    const postsThisMonth = getPostsByMonth(filteredPosts, selectedMonth);
    const typeCounts: Record<PostType, number> = {
      ventas_promo: 0,
      fun_casual: 0,
      educativo: 0,
      formal: 0,
      otro: 0,
    };

    postsThisMonth.forEach(post => {
      const type = (post.post_type || 'otro') as PostType;
      typeCounts[type]++;
    });

    const total = postsThisMonth.length;
    return Object.entries(typeCounts)
      .filter(([, count]) => count > 0)
      .map(([type, count]) => ({
        type: type as PostType,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
        label: POST_TYPE_CONFIG[type as PostType]?.label || type,
        color: POST_TYPE_CONFIG[type as PostType]?.color || '#93C5FD',
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredPosts, selectedMonth]);

  // Platform distribution (for horizontal BarChart)
  const platformDistribution = useMemo(() => {
    if (!filteredPosts) return [];

    const postsThisMonth = getPostsByMonth(filteredPosts, selectedMonth);
    const platformCounts: Record<Platform, number> = {
      instagram: 0,
      tiktok: 0,
      facebook: 0,
      linkedin: 0,
      twitter: 0,
      youtube: 0,
    };

    postsThisMonth.forEach(post => {
      platformCounts[post.platform]++;
    });

    const platformLabels: Record<Platform, string> = {
      instagram: 'Instagram',
      tiktok: 'TikTok',
      facebook: 'Facebook',
      linkedin: 'LinkedIn',
      twitter: 'Twitter/X',
      youtube: 'YouTube',
    };

    return Object.entries(platformCounts)
      .filter(([, count]) => count > 0)
      .map(([platform, count]) => ({
        platform: platform as Platform,
        name: platformLabels[platform as Platform],
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredPosts, selectedMonth]);

  // Approval pipeline (for horizontal BarChart)
  const approvalPipeline = useMemo(() => {
    if (!filteredPosts) return [];

    const postsThisMonth = getPostsByMonth(filteredPosts, selectedMonth);
    const pipeline: Record<string, number> = {
      Borrador: 0,
      Planeado: 0,
      'En Prod.': 0,
      Pendiente: 0,
      Aprobado: 0,
      Publicado: 0,
    };

    postsThisMonth.forEach(post => {
      if (post.status === 'draft') pipeline['Borrador']++;
      else if (post.status === 'planned') pipeline['Planeado']++;
      else if (post.status === 'in_production') pipeline['En Prod.']++;
      else if (post.approval_status === 'pending') pipeline['Pendiente']++;
      else if (post.approval_status === 'approved' || post.approval_status === 'approved_with_changes') pipeline['Aprobado']++;
      else if (post.status === 'published') pipeline['Publicado']++;
    });

    return Object.entries(pipeline).map(([name, count]) => ({ name, count }));
  }, [filteredPosts, selectedMonth]);

  // Monthly trend (last 6 months) — for AreaChart
  const monthlyTrend = useMemo(() => {
    if (!filteredPosts) return [];

    const now = new Date();
    const months = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = date.toISOString().split('T')[0].slice(0, 7);
      const monthLabel = new Intl.DateTimeFormat('es-MX', { month: 'short', year: '2-digit' }).format(date);

      const count = getPostsByMonth(filteredPosts, monthStr).length;
      months.push({ month: monthLabel, count });
    }

    return months;
  }, [filteredPosts]);

  // Posts by day of week
  const postsByDayOfWeek = useMemo(() => {
    if (!filteredPosts) return [];
    const postsThisMonth = getPostsByMonth(filteredPosts, selectedMonth);
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
    const counts = [0, 0, 0, 0, 0, 0, 0];

    postsThisMonth.forEach(post => {
      if (post.scheduled_date) {
        const day = new Date(post.scheduled_date + 'T00:00:00').getDay();
        counts[day]++;
      }
    });

    // Reorder to start from Monday
    const orderedDays = [1, 2, 3, 4, 5, 6, 0];
    return orderedDays.map(i => ({
      day: dayNames[i],
      count: counts[i],
    }));
  }, [filteredPosts, selectedMonth]);

  // AI Score trend (average per month, last 6 months)
  const aiScoreTrend = useMemo(() => {
    if (!filteredPosts) return [];

    const now = new Date();
    const months = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = date.toISOString().split('T')[0].slice(0, 7);
      const monthLabel = new Intl.DateTimeFormat('es-MX', { month: 'short' }).format(date);

      const monthPosts = getPostsByMonth(filteredPosts, monthStr);
      const scores = monthPosts
        .map(p => p.ai_score)
        .filter((s): s is number => s !== null && s !== undefined);

      const avg = scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
        : 0;

      months.push({ month: monthLabel, score: avg });
    }

    return months;
  }, [filteredPosts]);

  // Engagement totals for the selected month (likes + comments + shares + saves)
  const engagementThisMonth = useMemo(() => {
    if (!filteredPosts) return { total: 0, likes: 0, comments: 0, shares: 0, reach: 0, impressions: 0 };
    const postsThisMonth = getPostsByMonth(filteredPosts, selectedMonth);
    return postsThisMonth.reduce(
      (acc, p) => ({
        total: acc.total + (p.likes || 0) + (p.comments_count || 0) + (p.shares || 0) + (p.saves || 0),
        likes: acc.likes + (p.likes || 0),
        comments: acc.comments + (p.comments_count || 0),
        shares: acc.shares + (p.shares || 0),
        reach: acc.reach + (p.reach || 0),
        impressions: acc.impressions + (p.impressions || 0),
      }),
      { total: 0, likes: 0, comments: 0, shares: 0, reach: 0, impressions: 0 },
    );
  }, [filteredPosts, selectedMonth]);

  // Engagement trend (last 6 months, total interactions per month)
  const engagementTrend = useMemo(() => {
    if (!filteredPosts) return [];
    const now = new Date();
    const months: Array<{ month: string; likes: number; comments: number; shares: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = date.toISOString().split('T')[0].slice(0, 7);
      const monthLabel = new Intl.DateTimeFormat('es-MX', { month: 'short' }).format(date);
      const monthPosts = getPostsByMonth(filteredPosts, monthStr);
      months.push({
        month: monthLabel,
        likes: monthPosts.reduce((a, p) => a + (p.likes || 0), 0),
        comments: monthPosts.reduce((a, p) => a + (p.comments_count || 0), 0),
        shares: monthPosts.reduce((a, p) => a + (p.shares || 0), 0),
      });
    }
    return months;
  }, [filteredPosts]);

  // Top 5 performing posts by AI score
  const topPerformingPosts = useMemo(() => {
    if (!filteredPosts || !clients) return [];

    const postsThisMonth = getPostsByMonth(filteredPosts, selectedMonth);
    return postsThisMonth
      .filter(p => p.ai_score !== null && p.ai_score !== undefined)
      .sort((a, b) => (b.ai_score ?? 0) - (a.ai_score ?? 0))
      .slice(0, 5)
      .map(p => {
        const client = clients.find(c => c.id === p.client_id);
        return {
          id: p.id,
          name: p.name || 'Sin nombre',
          clientName: client ? `${client.emoji} ${client.name}` : 'Sin cliente',
          score: p.ai_score ?? 0,
        };
      });
  }, [filteredPosts, clients, selectedMonth]);

  // Approval turnaround (avg days from created_at to approved_at)
  const approvalTurnaround = useMemo(() => {
    if (!filteredPosts) return null;

    const postsThisMonth = getPostsByMonth(filteredPosts, selectedMonth);
    const approvedPosts = postsThisMonth.filter(p => p.approved_at && p.created_at);

    if (approvedPosts.length === 0) return null;

    const totalDays = approvedPosts.reduce((sum, p) => {
      const created = new Date(p.created_at).getTime();
      const approved = new Date(p.approved_at!).getTime();
      const diff = (approved - created) / (1000 * 60 * 60 * 24);
      return sum + Math.max(0, diff);
    }, 0);

    return Math.round((totalDays / approvedPosts.length) * 10) / 10;
  }, [filteredPosts, selectedMonth]);

  // Custom tooltip for Recharts
  const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name?: string }>; label?: string }) => {
    if (!active || !payload || payload.length === 0) return null;
    return (
      <div
        style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '8px 12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <p style={{ color: '#0F172A', fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{label}</p>
        {payload.map((entry, i) => (
          <p key={i} style={{ color: '#64748B', fontSize: 12 }}>
            {entry.name ? `${entry.name}: ` : ''}{entry.value}
          </p>
        ))}
      </div>
    );
  };

  // Delta badge component
  const DeltaBadge = ({ current, previous }: { current: number; previous: number }) => {
    const delta = getDelta(current, previous);
    if (!delta) return null;
    if (delta.value === 0) return null;

    return (
      <span
        style={{ color: delta.positive ? CHART_COLORS.success : '#EF4444' }}
        className="text-xs font-medium flex items-center gap-0.5"
      >
        {delta.positive ? '\u2191' : '\u2193'} {delta.value}%
      </span>
    );
  };

  // Skeleton loader component
  const Skeleton = ({ width = 'w-full', height = 'h-4' }: { width?: string; height?: string }) => (
    <div className={`${width} ${height} rounded animate-pulse`} style={{ backgroundColor: 'var(--text-light)' }} />
  );

  const loading = statsLoading || clientsLoading || postsLoading || packagesLoading;

  return (
    <div className="space-y-8">
      {/* Sticky Header + Stats */}
      <div className="sticky-header sticky top-0 z-50 -mx-8 px-8 pt-7 pb-4" style={{ backgroundColor: 'var(--bg)' }}>

        {/* Header with Month Selector + Compare */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-serif font-bold flex items-center gap-2" style={{ color: 'var(--text-dark)' }}>
              <BarChart3 className="w-5 h-5" style={{ color: 'var(--primary-deep)' }} /> Reportes
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-mid)' }}>
              Analisis de rendimiento y estadisticas
              {viewMode === 'client' && selectedClientId && (() => {
                const c = clients.find((x) => x.id === selectedClientId);
                return c ? ` — ${c.emoji} ${c.name}` : '';
              })()}
              {viewMode === 'creative' && selectedCreativeId && (() => {
                const m = members.find((x) => x.id === selectedCreativeId);
                return m ? ` — ${m.full_name || 'Creativo'}` : '';
              })()}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <label style={{ color: 'var(--text-dark)' }} className="text-sm font-medium">Mes:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--glass-border)',
                color: 'var(--text-dark)',
              }}
              className="px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
            />
            <label style={{ color: 'var(--text-dark)' }} className="text-sm font-medium">Comparar con:</label>
            <select
              value={compareMode}
              onChange={(e) => setCompareMode(e.target.value as CompareMode)}
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--glass-border)',
                color: 'var(--text-dark)',
              }}
              className="px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 text-sm"
            >
              <option value="none">Sin comparar</option>
              <option value="prev_month">Mes anterior</option>
              <option value="same_month_last_year">Mismo mes ano pasado</option>
            </select>
            <button
              onClick={async () => {
                try {
                  const wb = new ExcelJS.Workbook();

                  const ws1 = wb.addWorksheet('Resumen');
                  ws1.addRows([
                    ['Metrica', 'Valor'],
                    ['Mes', selectedMonth],
                    ['Clientes activos', computedStats.activeClients],
                    ['MRR total', computedStats.totalMRR],
                    ['Posts del mes', computedStats.postsThisMonth],
                    ['Pagos pendientes', computedStats.pendingPayments],
                  ]);

                  const ws2 = wb.addWorksheet('Clientes');
                  ws2.addRows([
                    ['Cliente', 'Posts', 'AI Score Prom.', 'Tasa aprobacion %', 'Status pago', 'Status cuenta'],
                    ...clientPerformance.map(c => [
                      `${c.emoji} ${c.name}`, c.postsCount, c.avgAiScore, c.approvalRate, c.payStatus, c.accountStatus,
                    ]),
                  ]);

                  const ws3 = wb.addWorksheet('Tipos');
                  ws3.addRows([
                    ['Tipo', 'Cantidad', 'Porcentaje %'],
                    ...postTypeDistribution.map(t => [t.label, t.count, Math.round(t.percentage)]),
                  ]);

                  const buffer = await wb.xlsx.writeBuffer();
                  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `socialgo-reporte-${selectedMonth}.xlsx`;
                  a.click();
                  URL.revokeObjectURL(url);
                } catch (err) {
                  console.error('Error exportando:', err);
                  alert('Error al exportar el reporte');
                }
              }}
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--text-dark)',
              }}
              className="px-4 py-2 rounded-lg font-medium text-sm transition-opacity hover:opacity-90"
            >
              Exportar
            </button>
          </div>
        </div>

        {/* View Mode Selector */}
        <div className="flex items-center gap-3 flex-wrap mb-4">
          <div
            className="flex rounded-lg p-0.5"
            style={{ background: '#F1F5F9', border: '1px solid rgba(148,163,184,0.2)' }}
          >
            {([
              { key: 'agency', label: 'Agencia', icon: Building2 },
              { key: 'client', label: 'Por cliente', icon: UserCircle },
              { key: 'creative', label: 'Por creativo', icon: PaintBucket },
            ] as const).map((opt) => {
              const active = viewMode === opt.key;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.key}
                  onClick={() => {
                    setViewMode(opt.key);
                    if (opt.key === 'client' && !selectedClientId && clients.length > 0) {
                      setSelectedClientId(clients[0].id);
                    }
                    if (opt.key === 'creative' && !selectedCreativeId && creatives.length > 0) {
                      setSelectedCreativeId(creatives[0].id);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                  style={{
                    background: active ? 'linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)' : 'transparent',
                    color: active ? 'white' : '#64748B',
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {opt.label}
                </button>
              );
            })}
          </div>

          {viewMode === 'client' && (
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--glass-border)',
                color: 'var(--text-dark)',
              }}
              className="px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 text-sm"
            >
              <option value="">Selecciona cliente</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.name}
                </option>
              ))}
            </select>
          )}

          {viewMode === 'creative' && (
            <select
              value={selectedCreativeId}
              onChange={(e) => setSelectedCreativeId(e.target.value)}
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--glass-border)',
                color: 'var(--text-dark)',
              }}
              className="px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 text-sm"
            >
              <option value="">Selecciona creativo</option>
              {creatives.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name || 'Sin nombre'} · {m.role}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Stats Row - 4 Glass Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Active Clients */}
          <div style={{ background: 'white', borderColor: 'var(--glass-border)' }} className="p-5 rounded-2xl border">
            <div className="flex items-center justify-between mb-3">
              <p style={{ color: 'var(--text-mid)' }} className="text-sm">Clientes Activos</p>
              <Calendar className="w-4 h-4" style={{ color: 'var(--text-light)' }} />
            </div>
            {loading ? (
              <Skeleton width="w-24" height="h-8" />
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <p style={{ color: 'var(--text-dark)' }} className="text-3xl font-serif font-bold">
                    {computedStats.activeClients}
                  </p>
                  {comparisonStats && (
                    <DeltaBadge current={computedStats.activeClients} previous={comparisonStats.activeClients} />
                  )}
                </div>
                <p style={{ color: 'var(--text-light)' }} className="text-xs mt-2">Este mes</p>
              </>
            )}
          </div>

          {/* Total MRR -- admin only, hidden in creative view */}
          {showMRR && (
            <div style={{ background: 'white', borderColor: 'var(--glass-border)' }} className="p-5 rounded-2xl border">
              <div className="flex items-center justify-between mb-3">
                <p style={{ color: 'var(--text-mid)' }} className="text-sm">MRR Total</p>
                <TrendingUp className="w-4 h-4" style={{ color: 'var(--text-light)' }} />
              </div>
              {loading ? (
                <Skeleton width="w-32" height="h-8" />
              ) : (
                <>
                  <div className="flex items-baseline gap-2">
                    <p style={{ color: 'var(--text-dark)' }} className="text-2xl font-serif font-bold">
                      {formatMXN(computedStats.totalMRR)}
                    </p>
                    {comparisonStats && (
                      <DeltaBadge current={computedStats.totalMRR} previous={comparisonStats.totalMRR} />
                    )}
                  </div>
                  <p style={{ color: 'var(--text-light)' }} className="text-xs mt-2">Ingresos mensuales</p>
                </>
              )}
            </div>
          )}

          {/* Posts This Month */}
          <div style={{ background: 'white', borderColor: 'var(--glass-border)' }} className="p-5 rounded-2xl border">
            <div className="flex items-center justify-between mb-3">
              <p style={{ color: 'var(--text-mid)' }} className="text-sm">Posts Este Mes</p>
              <BarChart3 className="w-4 h-4" style={{ color: 'var(--text-light)' }} />
            </div>
            {postsLoading ? (
              <Skeleton width="w-24" height="h-8" />
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <p style={{ color: 'var(--text-dark)' }} className="text-3xl font-serif font-bold">
                    {computedStats.postsThisMonth}
                  </p>
                  {comparisonStats && (
                    <DeltaBadge current={computedStats.postsThisMonth} previous={comparisonStats.postsThisMonth} />
                  )}
                </div>
                <p style={{ color: 'var(--text-light)' }} className="text-xs mt-2">Publicaciones</p>
              </>
            )}
          </div>

          {/* Pending Payments -- admin only, hidden in creative view */}
          {showMRR && (
            <div style={{ background: 'white', borderColor: 'var(--glass-border)' }} className="p-5 rounded-2xl border">
              <div className="flex items-center justify-between mb-3">
                <p style={{ color: 'var(--text-mid)' }} className="text-sm">Pagos Pendientes</p>
                <Clock className="w-4 h-4" style={{ color: 'var(--text-light)' }} />
              </div>
              {clientsLoading ? (
                <Skeleton width="w-24" height="h-8" />
              ) : (
                <>
                  <div className="flex items-baseline gap-2">
                    <p style={{ color: 'var(--text-dark)' }} className="text-3xl font-serif font-bold">
                      {computedStats.pendingPayments}
                    </p>
                    {comparisonStats && (
                      <DeltaBadge current={computedStats.pendingPayments} previous={comparisonStats.pendingPayments} />
                    )}
                  </div>
                  <p style={{ color: 'var(--text-light)' }} className="text-xs mt-2">Clientes</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Client Performance Table */}
        <div style={{ background: 'white', borderColor: 'var(--glass-border)' }} className="rounded-2xl border p-5">
          <h2 style={{ color: 'var(--text-dark)' }} className="text-lg font-serif font-bold mb-4">Rendimiento por Cliente</h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderColor: 'var(--glass-border)' }} className="border-b">
                  <th style={{ color: 'var(--text-mid)' }} className="text-left py-3 px-4 text-sm font-semibold">Cliente</th>
                  <th style={{ color: 'var(--text-mid)' }} className="text-center py-3 px-4 text-sm font-semibold">Posts</th>
                  <th style={{ color: 'var(--text-mid)' }} className="text-center py-3 px-4 text-sm font-semibold">Puntuacion IA</th>
                  <th style={{ color: 'var(--text-mid)' }} className="text-center py-3 px-4 text-sm font-semibold">Tasa Aprobacion</th>
                  {isAdmin && <th style={{ color: 'var(--text-mid)' }} className="text-center py-3 px-4 text-sm font-semibold">Pago</th>}
                  {isAdmin && <th style={{ color: 'var(--text-mid)' }} className="text-center py-3 px-4 text-sm font-semibold">Cuenta</th>}
                </tr>
              </thead>
              <tbody>
                {clientsLoading || postsLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 px-4 text-center">
                      <p style={{ color: 'var(--text-light)' }}>Cargando clientes...</p>
                    </td>
                  </tr>
                ) : clientPerformance.length > 0 ? (
                  clientPerformance.map((row) => (
                    <tr
                      key={row.id}
                      style={{ borderColor: 'var(--glass-border)' }}
                      className="border-b transition-colors hover:bg-gray-50/50"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{row.emoji}</span>
                          <p style={{ color: 'var(--text-dark)' }} className="font-medium">{row.name}</p>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-dark)' }} className="py-4 px-4 text-center font-semibold">
                        {row.postsCount}
                      </td>
                      <td style={{ color: 'var(--text-dark)' }} className="py-4 px-4 text-center font-semibold">
                        {row.avgAiScore > 0 ? row.avgAiScore : '\u2014'}
                      </td>
                      <td style={{ color: 'var(--text-dark)' }} className="py-4 px-4 text-center font-semibold">
                        {row.postsCount > 0 ? `${row.approvalRate}%` : '\u2014'}
                      </td>
                      {isAdmin && (
                        <td className="py-4 px-4 text-center">
                          <PayStatusBadge status={row.payStatus} />
                        </td>
                      )}
                      {isAdmin && (
                        <td className="py-4 px-4 text-center">
                          <AccountStatusBadge status={row.accountStatus} />
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 px-4 text-center">
                      <p style={{ color: 'var(--text-light)' }}>No hay clientes con datos en este periodo</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Distribution Charts - 2 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Post Type Distribution -- PieChart */}
          <div style={{ background: 'white', borderColor: 'var(--glass-border)' }} className="rounded-2xl border p-5">
            <h2 style={{ color: 'var(--text-dark)' }} className="text-lg font-serif font-bold mb-4">Distribucion por Tipo</h2>
            {postsLoading ? (
              <Skeleton height="h-[250px]" />
            ) : postTypeDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={postTypeDistribution}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={45}
                    paddingAngle={2}
                    label={({ name, percent }: { name?: string; percent?: number }) =>
                      `${name ?? ''} ${Math.round((percent ?? 0) * 100)}%`
                    }
                    labelLine={false}
                  >
                    {postTypeDistribution.map((entry, index) => (
                      <Cell key={entry.type} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ color: 'var(--text-light)' }} className="py-12 text-center">No hay datos de contenido en este periodo</p>
            )}
          </div>

          {/* Platform Distribution -- Horizontal BarChart */}
          <div style={{ background: 'white', borderColor: 'var(--glass-border)' }} className="rounded-2xl border p-5">
            <h2 style={{ color: 'var(--text-dark)' }} className="text-lg font-serif font-bold mb-4">Distribucion por Plataforma</h2>
            {postsLoading ? (
              <Skeleton height="h-[250px]" />
            ) : platformDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={platformDistribution} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" tick={{ fill: '#64748B', fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#0F172A', fontSize: 12 }} width={80} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="Posts" fill={CHART_COLORS.primary} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ color: 'var(--text-light)' }} className="py-12 text-center">No hay datos de plataforma en este periodo</p>
            )}
          </div>
        </div>

        {/* Pipeline + Trend - 2 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Approval Pipeline -- Horizontal BarChart */}
          <div style={{ background: 'white', borderColor: 'var(--glass-border)' }} className="rounded-2xl border p-5">
            <h2 style={{ color: 'var(--text-dark)' }} className="text-lg font-serif font-bold mb-4">Pipeline de Aprobacion</h2>
            {postsLoading ? (
              <Skeleton height="h-[250px]" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={approvalPipeline} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" tick={{ fill: '#64748B', fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#0F172A', fontSize: 12 }} width={70} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="Posts" fill={CHART_COLORS.secondary} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Monthly Trend -- AreaChart */}
          <div style={{ background: 'white', borderColor: 'var(--glass-border)' }} className="rounded-2xl border p-5">
            <h2 style={{ color: 'var(--text-dark)' }} className="text-lg font-serif font-bold mb-4">Tendencia Ultimos 6 Meses</h2>
            {postsLoading ? (
              <Skeleton height="h-[250px]" />
            ) : monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={monthlyTrend}>
                  <defs>
                    <linearGradient id="colorPosts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748B', fontSize: 12 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Posts"
                    stroke={CHART_COLORS.primary}
                    fill="url(#colorPosts)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ color: 'var(--text-light)' }} className="py-12 text-center">No hay datos en los ultimos 6 meses</p>
            )}
          </div>
        </div>

        {/* New analytics sections - 2 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Posts by Day of Week */}
          <div style={{ background: 'white', borderColor: 'var(--glass-border)' }} className="rounded-2xl border p-5">
            <h2 style={{ color: 'var(--text-dark)' }} className="text-lg font-serif font-bold mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4" style={{ color: CHART_COLORS.primary }} />
              Posts por Dia de la Semana
            </h2>
            {postsLoading ? (
              <Skeleton height="h-[250px]" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={postsByDayOfWeek}>
                  <XAxis dataKey="day" tick={{ fill: '#0F172A', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748B', fontSize: 12 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="Posts" fill={CHART_COLORS.accent} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* AI Score Trend */}
          <div style={{ background: 'white', borderColor: 'var(--glass-border)' }} className="rounded-2xl border p-5">
            <h2 style={{ color: 'var(--text-dark)' }} className="text-lg font-serif font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: CHART_COLORS.info }} />
              Tendencia Puntuacion IA
            </h2>
            {postsLoading ? (
              <Skeleton height="h-[250px]" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={aiScoreTrend}>
                  <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#64748B', fontSize: 12 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    name="AI Score Prom."
                    stroke={CHART_COLORS.info}
                    strokeWidth={2}
                    dot={{ fill: CHART_COLORS.info, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Engagement overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Totals */}
          <div style={{ background: 'white', borderColor: 'var(--glass-border)' }} className="rounded-2xl border p-5">
            <h2 style={{ color: 'var(--text-dark)' }} className="text-lg font-serif font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: CHART_COLORS.success }} />
              Engagement del Mes
            </h2>
            {postsLoading ? (
              <Skeleton height="h-[200px]" />
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-3xl font-bold tabular-nums" style={{ color: CHART_COLORS.primary }}>
                    {engagementThisMonth.total.toLocaleString('es-MX')}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-light)' }}>Interacciones totales</p>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
                  <EngagementStat label="Likes" value={engagementThisMonth.likes} color={CHART_COLORS.primary} />
                  <EngagementStat label="Comentarios" value={engagementThisMonth.comments} color={CHART_COLORS.secondary} />
                  <EngagementStat label="Shares" value={engagementThisMonth.shares} color={CHART_COLORS.accent} />
                </div>
                {engagementThisMonth.reach > 0 && (
                  <div className="grid grid-cols-2 gap-2 pt-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
                    <EngagementStat label="Alcance" value={engagementThisMonth.reach} color={CHART_COLORS.info} />
                    <EngagementStat label="Impresiones" value={engagementThisMonth.impressions} color={CHART_COLORS.muted} />
                  </div>
                )}
                {engagementThisMonth.total === 0 && (
                  <p className="text-xs italic mt-2" style={{ color: 'var(--text-light)' }}>
                    Sin datos de engagement aún. Conecta publicación directa para empezar a medir.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Engagement trend (6 months, stacked) */}
          <div style={{ background: 'white', borderColor: 'var(--glass-border)' }} className="rounded-2xl border p-5 md:col-span-2">
            <h2 style={{ color: 'var(--text-dark)' }} className="text-lg font-serif font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: CHART_COLORS.primary }} />
              Tendencia de Engagement · Últimos 6 meses
            </h2>
            {postsLoading ? (
              <Skeleton height="h-[250px]" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={engagementTrend}>
                  <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748B', fontSize: 12 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="likes" stackId="a" fill={CHART_COLORS.primary} name="Likes" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="comments" stackId="a" fill={CHART_COLORS.secondary} name="Comentarios" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="shares" stackId="a" fill={CHART_COLORS.accent} name="Shares" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Performing Posts + Approval Turnaround */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Top Performing Posts */}
          <div style={{ background: 'white', borderColor: 'var(--glass-border)' }} className="rounded-2xl border p-5 md:col-span-2">
            <h2 style={{ color: 'var(--text-dark)' }} className="text-lg font-serif font-bold mb-4 flex items-center gap-2">
              <Award className="w-4 h-4" style={{ color: CHART_COLORS.warning }} />
              Top 5 Posts por Puntuacion IA
            </h2>
            {postsLoading ? (
              <Skeleton height="h-40" />
            ) : topPerformingPosts.length > 0 ? (
              <div className="space-y-3">
                {topPerformingPosts.map((post, idx) => (
                  <div key={post.id} className="flex items-center gap-3">
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                    >
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p style={{ color: 'var(--text-dark)' }} className="text-sm font-medium truncate">{post.name}</p>
                      <p style={{ color: 'var(--text-mid)' }} className="text-xs">{post.clientName}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-24 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#f3f4f6' }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${post.score}%`, backgroundColor: CHART_COLORS.success }}
                        />
                      </div>
                      <span style={{ color: 'var(--text-dark)' }} className="text-sm font-bold w-10 text-right">{post.score}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-light)' }} className="py-8 text-center">No hay posts con puntuacion IA este mes</p>
            )}
          </div>

          {/* Approval Turnaround */}
          <div style={{ background: 'white', borderColor: 'var(--glass-border)' }} className="rounded-2xl border p-5 flex flex-col items-center justify-center">
            <Clock className="w-8 h-8 mb-3" style={{ color: CHART_COLORS.secondary }} />
            <p style={{ color: 'var(--text-mid)' }} className="text-sm mb-2 text-center">Tiempo Promedio de Aprobacion</p>
            {postsLoading ? (
              <Skeleton width="w-20" height="h-10" />
            ) : approvalTurnaround !== null ? (
              <>
                <p style={{ color: 'var(--text-dark)' }} className="text-4xl font-serif font-bold">
                  {approvalTurnaround}
                </p>
                <p style={{ color: 'var(--text-light)' }} className="text-sm mt-1">dias</p>
              </>
            ) : (
              <p style={{ color: 'var(--text-light)' }} className="text-sm text-center">Sin datos de aprobacion este mes</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// Status badge components
function PayStatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    pagado: { bg: 'rgba(76, 175, 80, 0.2)', text: '#4CB150', label: 'Pagado' },
    pendiente: { bg: 'rgba(255, 193, 7, 0.2)', text: '#FFC107', label: 'Pendiente' },
    vencido: { bg: 'rgba(244, 67, 54, 0.2)', text: '#F44336', label: 'Vencido' },
  };

  const style = styles[status] || styles.pendiente;

  return (
    <span
      style={{
        backgroundColor: style.bg,
        color: style.text,
        borderColor: style.text,
      }}
      className="px-3 py-1 rounded-full text-xs font-medium border"
    >
      {style.label}
    </span>
  );
}

function AccountStatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    activo: { bg: 'rgba(76, 175, 80, 0.2)', text: '#4CB150', label: 'Activo' },
    on_track: { bg: 'rgba(33, 150, 243, 0.2)', text: '#2196F3', label: 'On Track' },
    pago_pendiente: { bg: 'rgba(255, 193, 7, 0.2)', text: '#FFC107', label: 'Pago Pendiente' },
    onboarding: { bg: 'rgba(155, 39, 176, 0.2)', text: '#9B27B0', label: 'Onboarding' },
    pausado: { bg: 'rgba(158, 158, 158, 0.2)', text: '#9E9E9E', label: 'Pausado' },
  };

  const style = styles[status] || styles.activo;

  return (
    <span
      style={{
        backgroundColor: style.bg,
        color: style.text,
        borderColor: style.text,
      }}
      className="px-3 py-1 rounded-full text-xs font-medium border"
    >
      {style.label}
    </span>
  );
}

function EngagementStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <p className="text-lg font-bold tabular-nums" style={{ color }}>
        {value.toLocaleString('es-MX')}
      </p>
      <p className="text-[10px]" style={{ color: 'var(--text-light)' }}>{label}</p>
    </div>
  );
}
