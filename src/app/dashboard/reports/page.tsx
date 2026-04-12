'use client';

import { useState } from 'react';
import { useStats, useClients, usePosts } from '@/lib/hooks';

interface ClientRow {
  id: string;
  name: string;
  emoji: string;
  posts_this_month: number;
  avg_ai_score: number;
  pay_status: 'paid' | 'pending' | 'overdue';
  account_status: 'active' | 'inactive' | 'paused';
}

interface ContentStats {
  type: string;
  count: number;
  color: string;
}

export default function ReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().split('T')[0].slice(0, 7));
  const { data: stats, loading: statsLoading } = useStats();
  const { data: clients, loading: clientsLoading } = useClients();
  const { data: posts, loading: postsLoading } = usePosts();

  // Format currency as MXN
  const formatMXN = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Get content mix data from posts
  const getContentMix = (): ContentStats[] => {
    if (!posts || posts.length === 0) return [];

    const typeCounts: Record<string, number> = {};
    posts.forEach(post => {
      const type = post.post_type || 'other';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const colors: Record<string, string> = {
      reels: '#FF8FAD',
      carousel: '#FFD4B8',
      single: '#E8D5FF',
      video: '#FFBA8A',
      story: '#FFF8F3',
      other: '#E8D5FF',
    };

    return Object.entries(typeCounts).map(([type, count]) => ({
      type,
      count,
      color: colors[type] || '#E8D5FF',
    }));
  };

  const contentMix = getContentMix();
  const totalContentPosts = contentMix.reduce((sum, item) => sum + item.count, 0);

  const getPayStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      paid: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      overdue: 'bg-red-100 text-red-700',
    };
    const labels: Record<string, string> = {
      paid: 'Pagado',
      pending: 'Pendiente',
      overdue: 'Vencido',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || colors.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getAccountStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-rose/20 text-rose-deep',
      inactive: 'bg-gray-100 text-gray-700',
      paused: 'bg-yellow-100 text-yellow-700',
    };
    const labels: Record<string, string> = {
      active: 'Activo',
      inactive: 'Inactivo',
      paused: 'Pausado',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || colors.inactive}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream via-lavender to-peach p-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header with Month Selector */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-serif font-bold text-text mb-2">Reportes</h1>
            <p className="text-text/70">Análisis de rendimiento y estadísticas</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-text">Mes:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 rounded-lg bg-white/50 border border-rose/30 text-text focus:outline-none focus:ring-2 focus:ring-rose-deep"
            />
          </div>
        </div>

        {/* Stats Row - 4 Glass Cards */}
        <div className="grid grid-cols-4 gap-4">
          {/* Total Clients */}
          <div className="glass-card p-6 rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 shadow-lg">
            <p className="text-sm text-text/70 mb-3">Clientes Totales</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-serif font-bold text-text">
                {statsLoading ? '-' : stats?.total_clients || 0}
              </p>
            </div>
            <p className="text-xs text-text/50 mt-3">En tu cuenta</p>
          </div>

          {/* Active Clients */}
          <div className="glass-card p-6 rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 shadow-lg">
            <p className="text-sm text-text/70 mb-3">Clientes Activos</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-serif font-bold text-text">
                {statsLoading ? '-' : stats?.active_clients || 0}
              </p>
            </div>
            <p className="text-xs text-text/50 mt-3">Con posts este mes</p>
          </div>

          {/* Total MRR */}
          <div className="glass-card p-6 rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 shadow-lg">
            <p className="text-sm text-text/70 mb-3">MRR Total</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-serif font-bold text-text">
                {statsLoading ? '-' : formatMXN(stats?.total_mrr || 0)}
              </p>
            </div>
            <p className="text-xs text-text/50 mt-3">Ingresos mensuales</p>
          </div>

          {/* Total Posts */}
          <div className="glass-card p-6 rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 shadow-lg">
            <p className="text-sm text-text/70 mb-3">Posts Totales</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-serif font-bold text-text">
                {statsLoading ? '-' : stats?.total_posts || 0}
              </p>
            </div>
            <p className="text-xs text-text/50 mt-3">Este mes</p>
          </div>
        </div>

        {/* Client Performance Table */}
        <div className="glass-card p-8 rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 shadow-lg">
          <h2 className="text-2xl font-serif font-bold text-text mb-6">Rendimiento por Cliente</h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/30">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-text/80">Cliente</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-text/80">Posts</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-text/80">Promedio IA</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-text/80">Estado de Pago</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-text/80">Estado Cuenta</th>
                </tr>
              </thead>
              <tbody>
                {clientsLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 px-4 text-center text-text/60">
                      Cargando clientes...
                    </td>
                  </tr>
                ) : clients && clients.length > 0 ? (
                  clients.map((client) => (
                    <tr key={client.id} className="border-b border-white/20 hover:bg-white/10 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{client.emoji || '📱'}</span>
                          <div>
                            <p className="font-medium text-text">{client.name}</p>
                            <p className="text-xs text-text/60">{client.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <p className="font-semibold text-text">{client.posts_this_month || 0}</p>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <p className="font-semibold text-text">{client.avg_ai_score ? client.avg_ai_score.toFixed(1) : 'N/A'}</p>
                      </td>
                      <td className="py-4 px-4 text-center">
                        {getPayStatusBadge(client.pay_status || 'pending')}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {getAccountStatusBadge(client.account_status || 'active')}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 px-4 text-center text-text/60">
                      No hay clientes
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Content Mix Chart */}
        <div className="glass-card p-8 rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 shadow-lg">
          <h2 className="text-2xl font-serif font-bold text-text mb-6">Distribución de Contenido</h2>

          {postsLoading ? (
            <p className="text-text/60">Cargando contenido...</p>
          ) : contentMix.length > 0 ? (
            <div className="space-y-4">
              {contentMix.map((item) => {
                const percentage = (item.count / totalContentPosts) * 100;
                return (
                  <div key={item.type}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-text capitalize">{item.type}</p>
                      <p className="text-sm text-text/70">{item.count} posts ({percentage.toFixed(0)}%)</p>
                    </div>
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-300 rounded-full"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-text/60">No hay datos de contenido disponibles</p>
          )}
        </div>

        {/* Monthly Trend Placeholder */}
        <div className="glass-card p-8 rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 shadow-lg">
          <h2 className="text-2xl font-serif font-bold text-text mb-6">Tendencia Mensual</h2>
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-lg font-medium text-text mb-2">Próximamente</p>
            <p className="text-sm text-text/60">Los datos de tendencia estarán disponibles en breve</p>
          </div>
        </div>

      </div>
    </div>
  );
}
