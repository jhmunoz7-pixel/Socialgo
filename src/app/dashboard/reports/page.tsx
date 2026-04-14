'use client';

import { useState, useMemo } from 'react';
import { useStats, useClients, usePosts, usePackages } from '@/lib/hooks';
import type { Post, PostType, Platform } from '@/types';
import { POST_TYPE_CONFIG, calculateMonthlyPayment } from '@/types';
import ExcelJS from 'exceljs';

export default function ReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().split('T')[0].slice(0, 7));
  const { loading: statsLoading } = useStats();
  const { data: clients, loading: clientsLoading } = useClients();
  const { data: posts, loading: postsLoading } = usePosts();
  const { data: packages, loading: packagesLoading } = usePackages();

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

  // Computed stats for selected month
  const computedStats = useMemo(() => {
    if (!clients || !posts) return { activeClients: 0, totalMRR: 0, postsThisMonth: 0, pendingPayments: 0 };

    const postsThisMonth = getPostsByMonth(posts, selectedMonth);

    // Active clients: those with posts in selected month
    const clientsWithPosts = new Set(postsThisMonth.map(p => p.client_id));
    const activeClients = clientsWithPosts.size;

    // Total MRR: sum of monthly payments for all active clients
    let totalMRR = 0;
    clients.forEach(client => {
      if (clientsWithPosts.has(client.id)) {
        const pkg = client.package_id
          ? packages?.find(p => p.id === client.package_id) || null
          : null;
        const monthlyPayment = calculateMonthlyPayment(pkg, client.package_type, client.custom_price);
        totalMRR += monthlyPayment;
      }
    });

    // Pending payments: count of clients with pay_status 'pendiente' or 'vencido'
    const pendingPayments = clients.filter(c =>
      c.pay_status === 'pendiente' || c.pay_status === 'vencido'
    ).length;

    return {
      activeClients,
      totalMRR,
      postsThisMonth: postsThisMonth.length,
      pendingPayments,
    };
  }, [clients, posts, selectedMonth, packages]);

  // Client performance data
  const clientPerformance = useMemo(() => {
    if (!clients || !posts) return [];

    const postsThisMonth = getPostsByMonth(posts, selectedMonth);

    return clients
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
  }, [clients, posts, selectedMonth]);

  // Content distribution by post type
  const postTypeDistribution = useMemo(() => {
    if (!posts) return [];

    const postsThisMonth = getPostsByMonth(posts, selectedMonth);
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
      .filter(([_, count]) => count > 0)
      .map(([type, count]) => ({
        type: type as PostType,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
        label: POST_TYPE_CONFIG[type as PostType]?.label || type,
        color: POST_TYPE_CONFIG[type as PostType]?.color || '#D0E8FF',
      }))
      .sort((a, b) => b.count - a.count);
  }, [posts, selectedMonth]);

  // Platform distribution
  const platformDistribution = useMemo(() => {
    if (!posts) return [];

    const postsThisMonth = getPostsByMonth(posts, selectedMonth);
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

    const platformEmojis: Record<Platform, string> = {
      instagram: '📸',
      tiktok: '🎵',
      facebook: '📘',
      linkedin: '💼',
      twitter: '𝕏',
      youtube: '🎬',
    };

    const total = postsThisMonth.length;
    return Object.entries(platformCounts)
      .filter(([_, count]) => count > 0)
      .map(([platform, count]) => ({
        platform: platform as Platform,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
        emoji: platformEmojis[platform as Platform],
      }))
      .sort((a, b) => b.count - a.count);
  }, [posts, selectedMonth]);

  // Approval pipeline
  const approvalPipeline = useMemo(() => {
    if (!posts) return { draft: 0, planned: 0, in_production: 0, pending_approval: 0, approved: 0, published: 0 };

    const postsThisMonth = getPostsByMonth(posts, selectedMonth);
    const pipeline = {
      draft: 0,
      planned: 0,
      in_production: 0,
      pending_approval: 0,
      approved: 0,
      published: 0,
    };

    postsThisMonth.forEach(post => {
      if (post.status === 'draft') pipeline.draft++;
      else if (post.status === 'planned') pipeline.planned++;
      else if (post.status === 'in_production') pipeline.in_production++;
      else if (post.approval_status === 'pending') pipeline.pending_approval++;
      else if (post.approval_status === 'approved' || post.approval_status === 'approved_with_changes') pipeline.approved++;
      else if (post.status === 'published') pipeline.published++;
    });

    return pipeline;
  }, [posts, selectedMonth]);

  // Monthly trend (last 6 months)
  const monthlyTrend = useMemo(() => {
    if (!posts) return [];

    const now = new Date();
    const months = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = date.toISOString().split('T')[0].slice(0, 7);
      const monthLabel = new Intl.DateTimeFormat('es-MX', { month: 'short', year: '2-digit' }).format(date);

      const count = getPostsByMonth(posts, monthStr).length;
      months.push({ monthStr, monthLabel, count });
    }

    const maxCount = Math.max(...months.map(m => m.count), 1);
    return months.map(m => ({
      ...m,
      barHeight: maxCount > 0 ? (m.count / maxCount) * 100 : 0,
    }));
  }, [posts]);

  // Skeleton loader component
  const Skeleton = ({ width = 'w-full', height = 'h-4' }: { width?: string; height?: string }) => (
    <div className={`${width} ${height} rounded animate-pulse`} style={{ backgroundColor: 'var(--text-light)' }} />
  );

  return (
    <div className="space-y-8">
      {/* Sticky Header + Stats */}
      <div className="sticky-header sticky top-0 z-50 -mx-8 px-8 pt-7 pb-4" style={{ backgroundColor: 'var(--bg)' }}>

        {/* Header with Month Selector */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-serif font-bold" style={{ color: 'var(--text-dark)' }}>📊 Reportes</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-mid)' }}>Análisis de rendimiento y estadísticas</p>
          </div>
          <div className="flex items-center gap-3">
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
            <button
              onClick={async () => {
                try {
                  const wb = new ExcelJS.Workbook();

                  // Sheet 1: Resumen
                  const ws1 = wb.addWorksheet('Resumen');
                  ws1.addRows([
                    ['Métrica', 'Valor'],
                    ['Mes', selectedMonth],
                    ['Clientes activos', computedStats.activeClients],
                    ['MRR total', computedStats.totalMRR],
                    ['Posts del mes', computedStats.postsThisMonth],
                    ['Pagos pendientes', computedStats.pendingPayments],
                  ]);

                  // Sheet 2: Rendimiento por cliente
                  const ws2 = wb.addWorksheet('Clientes');
                  ws2.addRows([
                    ['Cliente', 'Posts', 'AI Score Prom.', 'Tasa aprobación %', 'Status pago', 'Status cuenta'],
                    ...clientPerformance.map(c => [
                      `${c.emoji} ${c.name}`, c.postsCount, c.avgAiScore, c.approvalRate, c.payStatus, c.accountStatus,
                    ]),
                  ]);

                  // Sheet 3: Distribución por tipo
                  const ws3 = wb.addWorksheet('Tipos');
                  ws3.addRows([
                    ['Tipo', 'Cantidad', 'Porcentaje %'],
                    ...postTypeDistribution.map(t => [t.label, t.count, Math.round(t.percentage)]),
                  ]);

                  // Download via Blob
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
              📥 Exportar
            </button>
          </div>
        </div>

        {/* Stats Row - 4 Glass Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Active Clients */}
          <div style={{
            background: 'var(--surface)',
            borderColor: 'var(--glass-border)',
            backdropFilter: 'blur(16px)',
          }} className="p-6 rounded-2xl border">
            <p style={{ color: 'var(--text-mid)' }} className="text-sm mb-3">Clientes Activos</p>
            {statsLoading || clientsLoading ? (
              <Skeleton width="w-24" height="h-8" />
            ) : (
              <>
                <p style={{ color: 'var(--text-dark)' }} className="text-3xl font-serif font-bold">
                  {computedStats.activeClients}
                </p>
                <p style={{ color: 'var(--text-light)' }} className="text-xs mt-3">Este mes</p>
              </>
            )}
          </div>

          {/* Total MRR */}
          <div style={{
            background: 'var(--surface)',
            borderColor: 'var(--glass-border)',
            backdropFilter: 'blur(16px)',
          }} className="p-6 rounded-2xl border">
            <p style={{ color: 'var(--text-mid)' }} className="text-sm mb-3">MRR Total</p>
            {statsLoading || clientsLoading || packagesLoading ? (
              <Skeleton width="w-32" height="h-8" />
            ) : (
              <>
                <p style={{ color: 'var(--text-dark)' }} className="text-2xl font-serif font-bold">
                  {formatMXN(computedStats.totalMRR)}
                </p>
                <p style={{ color: 'var(--text-light)' }} className="text-xs mt-3">Ingresos mensuales</p>
              </>
            )}
          </div>

          {/* Posts This Month */}
          <div style={{
            background: 'var(--surface)',
            borderColor: 'var(--glass-border)',
            backdropFilter: 'blur(16px)',
          }} className="p-6 rounded-2xl border">
            <p style={{ color: 'var(--text-mid)' }} className="text-sm mb-3">Posts Este Mes</p>
            {postsLoading ? (
              <Skeleton width="w-24" height="h-8" />
            ) : (
              <>
                <p style={{ color: 'var(--text-dark)' }} className="text-3xl font-serif font-bold">
                  {computedStats.postsThisMonth}
                </p>
                <p style={{ color: 'var(--text-light)' }} className="text-xs mt-3">Publicaciones</p>
              </>
            )}
          </div>

          {/* Pending Payments */}
          <div style={{
            background: 'var(--surface)',
            borderColor: 'var(--glass-border)',
            backdropFilter: 'blur(16px)',
          }} className="p-6 rounded-2xl border">
            <p style={{ color: 'var(--text-mid)' }} className="text-sm mb-3">Pagos Pendientes</p>
            {clientsLoading ? (
              <Skeleton width="w-24" height="h-8" />
            ) : (
              <>
                <p style={{ color: 'var(--text-dark)' }} className="text-3xl font-serif font-bold">
                  {computedStats.pendingPayments}
                </p>
                <p style={{ color: 'var(--text-light)' }} className="text-xs mt-3">Clientes</p>
              </>
            )}
          </div>
        </div>
      </div>

      <div>
        {/* Client Performance Table */}
        <div style={{
          background: 'var(--surface)',
          borderColor: 'var(--glass-border)',
          backdropFilter: 'blur(16px)',
        }} className="p-8 rounded-2xl border">
          <h2 style={{ color: 'var(--text-dark)' }} className="text-2xl font-serif font-bold mb-6">Rendimiento por Cliente</h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderColor: 'var(--glass-border)' }} className="border-b">
                  <th style={{ color: 'var(--text-mid)' }} className="text-left py-3 px-4 text-sm font-semibold">Cliente</th>
                  <th style={{ color: 'var(--text-mid)' }} className="text-center py-3 px-4 text-sm font-semibold">Posts</th>
                  <th style={{ color: 'var(--text-mid)' }} className="text-center py-3 px-4 text-sm font-semibold">Puntuación IA</th>
                  <th style={{ color: 'var(--text-mid)' }} className="text-center py-3 px-4 text-sm font-semibold">Tasa Aprobación</th>
                  <th style={{ color: 'var(--text-mid)' }} className="text-center py-3 px-4 text-sm font-semibold">Pago</th>
                  <th style={{ color: 'var(--text-mid)' }} className="text-center py-3 px-4 text-sm font-semibold">Cuenta</th>
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
                  clientPerformance.map((row, idx) => (
                    <tr
                      key={row.id}
                      style={{ borderColor: 'var(--glass-border)' }}
                      className={`border-b transition-colors ${idx % 2 === 0 ? '' : ''}`}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{row.emoji}</span>
                          <div>
                            <p style={{ color: 'var(--text-dark)' }} className="font-medium">{row.name}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-dark)' }} className="py-4 px-4 text-center font-semibold">
                        {row.postsCount}
                      </td>
                      <td style={{ color: 'var(--text-dark)' }} className="py-4 px-4 text-center font-semibold">
                        {row.avgAiScore > 0 ? row.avgAiScore : '—'}
                      </td>
                      <td style={{ color: 'var(--text-dark)' }} className="py-4 px-4 text-center font-semibold">
                        {row.postsCount > 0 ? `${row.approvalRate}%` : '—'}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <PayStatusBadge status={row.payStatus} />
                      </td>
                      <td className="py-4 px-4 text-center">
                        <AccountStatusBadge status={row.accountStatus} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 px-4 text-center">
                      <p style={{ color: 'var(--text-light)' }}>No hay clientes con datos en este período</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Content Distribution */}
        <div style={{
          background: 'var(--surface)',
          borderColor: 'var(--glass-border)',
          backdropFilter: 'blur(16px)',
        }} className="p-8 rounded-2xl border">
          <h2 style={{ color: 'var(--text-dark)' }} className="text-2xl font-serif font-bold mb-6">Distribución de Contenido por Tipo</h2>

          {postsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i}>
                  <Skeleton height="h-6" />
                  <div className="mt-2">
                    <Skeleton height="h-3" />
                  </div>
                </div>
              ))}
            </div>
          ) : postTypeDistribution.length > 0 ? (
            <div className="space-y-5">
              {postTypeDistribution.map((item) => (
                <div key={item.type}>
                  <div className="flex items-center justify-between mb-2">
                    <p style={{ color: 'var(--text-dark)' }} className="text-sm font-medium">{item.label}</p>
                    <p style={{ color: 'var(--text-mid)' }} className="text-sm">{item.count} ({item.percentage.toFixed(0)}%)</p>
                  </div>
                  <div style={{ backgroundColor: 'var(--glass-border)' }} className="h-3 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-300 rounded-full"
                      style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-light)' }}>No hay datos de contenido en este período</p>
          )}
        </div>

        {/* Platform Distribution */}
        <div style={{
          background: 'var(--surface)',
          borderColor: 'var(--glass-border)',
          backdropFilter: 'blur(16px)',
        }} className="p-8 rounded-2xl border">
          <h2 style={{ color: 'var(--text-dark)' }} className="text-2xl font-serif font-bold mb-6">Distribución por Plataforma</h2>

          {postsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i}>
                  <Skeleton height="h-6" />
                  <div className="mt-2">
                    <Skeleton height="h-3" />
                  </div>
                </div>
              ))}
            </div>
          ) : platformDistribution.length > 0 ? (
            <div className="space-y-5">
              {platformDistribution.map((item) => (
                <div key={item.platform}>
                  <div className="flex items-center justify-between mb-2">
                    <p style={{ color: 'var(--text-dark)' }} className="text-sm font-medium">{item.emoji} {item.platform.charAt(0).toUpperCase() + item.platform.slice(1)}</p>
                    <p style={{ color: 'var(--text-mid)' }} className="text-sm">{item.count} ({item.percentage.toFixed(0)}%)</p>
                  </div>
                  <div style={{ backgroundColor: 'var(--glass-border)' }} className="h-3 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-300 rounded-full"
                      style={{ width: `${item.percentage}%`, backgroundColor: 'var(--primary)' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-light)' }}>No hay datos de plataforma en este período</p>
          )}
        </div>

        {/* Approval Pipeline */}
        <div style={{
          background: 'var(--surface)',
          borderColor: 'var(--glass-border)',
          backdropFilter: 'blur(16px)',
        }} className="p-8 rounded-2xl border">
          <h2 style={{ color: 'var(--text-dark)' }} className="text-2xl font-serif font-bold mb-8">Pipeline de Aprobación</h2>

          {postsLoading ? (
            <Skeleton height="h-20" />
          ) : (
            <div className="flex items-end justify-between gap-3 h-40">
              <PipelineStage label="Borrador" count={approvalPipeline.draft} color="var(--text-light)" />
              <PipelineStage label="Planeado" count={approvalPipeline.planned} color="var(--secondary)" />
              <PipelineStage label="En Prod." count={approvalPipeline.in_production} color="var(--primary)" />
              <PipelineStage label="Pendiente" count={approvalPipeline.pending_approval} color="var(--secondary)" />
              <PipelineStage label="Aprobado" count={approvalPipeline.approved} color="var(--primary-deep)" />
              <PipelineStage label="Publicado" count={approvalPipeline.published} color="var(--primary)" />
            </div>
          )}
        </div>

        {/* Monthly Trend */}
        <div style={{
          background: 'var(--surface)',
          borderColor: 'var(--glass-border)',
          backdropFilter: 'blur(16px)',
        }} className="p-8 rounded-2xl border">
          <h2 style={{ color: 'var(--text-dark)' }} className="text-2xl font-serif font-bold mb-8">Tendencia Últimos 6 Meses</h2>

          {postsLoading ? (
            <Skeleton height="h-40" />
          ) : monthlyTrend.length > 0 ? (
            <div className="flex items-end justify-between gap-2 h-48">
              {monthlyTrend.map((month) => (
                <div key={month.monthStr} className="flex-1 flex flex-col items-center">
                  <div className="flex items-end justify-center h-40 w-full">
                    <div
                      className="w-full rounded-t transition-all duration-300"
                      style={{
                        height: `${month.barHeight}%`,
                        backgroundColor: month.count > 0 ? 'var(--primary)' : 'var(--glass-border)',
                      }}
                      title={`${month.monthLabel}: ${month.count} posts`}
                    />
                  </div>
                  <p style={{ color: 'var(--text-mid)' }} className="text-xs mt-3 text-center">{month.monthLabel}</p>
                  <p style={{ color: 'var(--text-dark)' }} className="text-xs font-semibold text-center">{month.count}</p>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-light)' }}>No hay datos de posts en los últimos 6 meses</p>
          )}
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

function PipelineStage({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-2 flex-1">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {count}
      </div>
      <p style={{ color: 'var(--text-mid)' }} className="text-xs text-center font-medium">
        {label}
      </p>
    </div>
  );
}
