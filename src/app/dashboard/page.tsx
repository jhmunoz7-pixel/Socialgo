'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useClients, useStats, usePackages, useMembers, deleteClient } from '@/lib/hooks';
import { Client, PayStatus, AccountStatus } from '@/types';
import { AddClientModal } from '@/components/clients/AddClientModal';

/**
 * Clients Dashboard Page
 * Displays all clients for the agency with stats, search, filtering, and actions
 */
export default function ClientsPage() {
  const router = useRouter();
  const { data: clients, loading: clientsLoading, refetch: refetchClients } = useClients();
  const { data: stats, loading: statsLoading } = useStats();
  const { data: packages } = usePackages();
  const { data: members } = useMembers();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'activo' | 'onboarding' | 'pausado'>('todos');
  const [addClientOpen, setAddClientOpen] = useState(false);

  // Filter clients based on search and status
  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (client.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

      const matchesStatus = statusFilter === 'todos' || client.account_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [clients, searchQuery, statusFilter]);

  // Helper functions
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', { month: 'short', day: '2-digit', year: 'numeric' });
  };

  const payBadge = (status: PayStatus) => {
    const badgeMap = {
      pagado: 'badge-success',
      pendiente: 'badge-warning',
      vencido: 'badge-danger',
    };
    return badgeMap[status];
  };

  const accountBadge = (status: AccountStatus) => {
    const badgeMap = {
      activo: 'badge-success',
      onboarding: 'badge-warning',
      pausado: 'badge-neutral',
    };
    return badgeMap[status];
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este cliente?')) return;
    try {
      await deleteClient(id);
      // Refetch clients
      window.location.reload();
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Error al eliminar el cliente');
    }
  };

  const handleViewClient = (id: string) => {
    router.push(`/dashboard/clients/${id}`);
  };

  // Skeleton loading component
  if (clientsLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-sg-bg p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header skeleton */}
          <div className="mb-8">
            <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg w-1/3 mb-4 animate-pulse" />
            <div className="h-5 bg-gray-200 rounded w-1/2 animate-pulse" />
          </div>
          {/* Stats skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="stat-card animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-1/2 mb-4" />
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (clients.length === 0) {
    return (
      <div className="min-h-screen bg-sg-bg p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="font-display text-display-md text-sg-text mb-2">Clientes</h1>
              <p className="text-body-md text-sg-text-mid">Gestiona cuentas, contratos y estatus de pago</p>
            </div>
            <button
              onClick={() => setAddClientOpen(true)}
              className="btn btn-primary"
            >
              + Agregar cliente
            </button>
          </div>

          {/* Empty state */}
          <div className="glass-card p-12 text-center">
            <div className="mb-4 text-5xl">👥</div>
            <h2 className="text-heading-md text-sg-text font-semibold mb-2">No tienes clientes aún</h2>
            <p className="text-body-md text-sg-text-mid mb-6">
              Comienza a agregar tus primeros clientes para gestionar sus cuentas y pagos
            </p>
            <button
              onClick={() => setAddClientOpen(true)}
              className="btn btn-primary"
            >
              Agregar mi primer cliente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sg-bg p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="font-display text-display-md text-sg-text mb-2">Clientes</h1>
            <p className="text-body-md text-sg-text-mid">Gestiona cuentas, contratos y estatus de pago</p>
          </div>
          <button
            onClick={() => setAddClientOpen(true)}
            className="btn btn-primary"
          >
            + Agregar cliente
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Active Clients */}
          <div className="stat-card">
            <p className="text-body-xs text-sg-text-mid font-semibold uppercase tracking-wide mb-3">
              Clientes activos
            </p>
            <p className="font-mono text-heading-lg text-sg-text font-bold mb-2">
              {stats?.activeClientsCount ?? 0}
            </p>
            <p className="text-body-xs text-sg-text-light">De tu plan actual</p>
          </div>

          {/* Total MRR */}
          <div className="stat-card">
            <p className="text-body-xs text-sg-text-mid font-semibold uppercase tracking-wide mb-3">
              MRR Total
            </p>
            <p className="font-mono text-heading-lg text-sg-text font-bold mb-2">
              {formatCurrency(stats?.totalMRR ?? 0)}
            </p>
            <p className="text-body-xs text-sg-text-light">Ingresos recurrentes mensuales</p>
          </div>

          {/* Posts This Month */}
          <div className="stat-card">
            <p className="text-body-xs text-sg-text-mid font-semibold uppercase tracking-wide mb-3">
              Posts planeados
            </p>
            <p className="font-mono text-heading-lg text-sg-text font-bold mb-2">
              {stats?.postsThisMonth ?? 0}
            </p>
            <p className="text-body-xs text-sg-text-light">Este mes</p>
          </div>

          {/* Pending Payments */}
          <div className="stat-card">
            <p className="text-body-xs text-sg-text-mid font-semibold uppercase tracking-wide mb-3">
              Pagos pendientes
            </p>
            <p className="font-mono text-heading-lg text-sg-text font-bold mb-2">
              {stats?.pendingPayments ?? 0}
            </p>
            <p className="text-body-xs text-sg-text-light">Requieren atención</p>
          </div>
        </div>

        {/* Clients Table */}
        <div className="glass-card overflow-hidden">
          {/* Filter Bar */}
          <div className="p-6 border-b border-sg-border">
            <div className="flex flex-col gap-4">
              {/* Search */}
              <div>
                <input
                  type="text"
                  placeholder="Buscar cliente por nombre o contacto..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input w-full"
                />
              </div>

              {/* Filter Chips */}
              <div className="flex flex-wrap gap-2">
                {['todos', 'activo', 'onboarding', 'pausado'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status as any)}
                    className={`filter-chip ${statusFilter === status ? 'active' : ''}`}
                  >
                    {status === 'todos' && 'Todos'}
                    {status === 'activo' && 'Activos'}
                    {status === 'onboarding' && 'Pendientes'}
                    {status === 'pausado' && 'Pausados'}
                  </button>
                ))}

                {/* Export Button */}
                <button className="filter-chip ml-auto">
                  📥 Exportar
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-sg-border">
                  <th className="text-left p-4 text-body-xs font-semibold text-sg-text-mid uppercase tracking-wide">
                    Marca / Contacto
                  </th>
                  <th className="text-left p-4 text-body-xs font-semibold text-sg-text-mid uppercase tracking-wide">
                    Paquete
                  </th>
                  <th className="text-left p-4 text-body-xs font-semibold text-sg-text-mid uppercase tracking-wide">
                    Inicio
                  </th>
                  <th className="text-right p-4 text-body-xs font-semibold text-sg-text-mid uppercase tracking-wide">
                    Mensualidad
                  </th>
                  <th className="text-center p-4 text-body-xs font-semibold text-sg-text-mid uppercase tracking-wide">
                    Pago
                  </th>
                  <th className="text-center p-4 text-body-xs font-semibold text-sg-text-mid uppercase tracking-wide">
                    Cuenta
                  </th>
                  <th className="text-center p-4 text-body-xs font-semibold text-sg-text-mid uppercase tracking-wide">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr
                    key={client.id}
                    className="border-b border-sg-border hover:bg-[rgba(255,181,200,0.07)] transition-colors cursor-pointer"
                  >
                    {/* Brand / Contact */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-sm flex items-center justify-center text-lg flex-shrink-0"
                          style={{ backgroundColor: client.color }}
                        >
                          {client.emoji}
                        </div>
                        <div className="min-w-0">
                          <p className="text-body-md font-semibold text-sg-text truncate">
                            {client.name}
                          </p>
                          <p className="text-body-xs text-sg-text-light truncate">
                            {client.contact_name || client.contact_email || '-'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Package */}
                    <td className="p-4">
                      <span className="package-tag">
                        {client.package?.name ?? 'Sin paquete'}
                      </span>
                    </td>

                    {/* Start Date */}
                    <td className="p-4">
                      <p className="text-body-sm text-sg-text">
                        {formatDate(client.start_date)}
                      </p>
                    </td>

                    {/* MRR */}
                    <td className="p-4 text-right">
                      <p className="font-mono text-body-md font-semibold text-sg-text">
                        {formatCurrency(client.mrr)}
                      </p>
                    </td>

                    {/* Pay Status Badge */}
                    <td className="p-4 text-center">
                      <span className={`badge ${payBadge(client.pay_status)}`}>
                        {client.pay_status === 'pagado' && '✓ Pagado'}
                        {client.pay_status === 'pendiente' && '⏳ Pendiente'}
                        {client.pay_status === 'vencido' && '⚠ Vencido'}
                      </span>
                    </td>

                    {/* Account Status Badge */}
                    <td className="p-4 text-center">
                      <span className={`badge ${accountBadge(client.account_status)}`}>
                        {client.account_status === 'activo' && '✓ Activo'}
                        {client.account_status === 'onboarding' && '⏳ Onboarding'}
                        {client.account_status === 'pausado' && '⊘ Pausado'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleViewClient(client.id)}
                          className="text-body-xs font-semibold text-rose hover:text-rose-deep transition-colors"
                          title="Ver cliente"
                        >
                          Ver
                        </button>
                        <span className="text-sg-border">•</span>
                        <button
                          onClick={() => handleDeleteClient(client.id)}
                          className="text-body-xs font-semibold text-sg-text-light hover:text-sg-danger-text transition-colors"
                          title="Eliminar cliente"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty filter state */}
          {filteredClients.length === 0 && clients.length > 0 && (
            <div className="p-12 text-center">
              <p className="text-body-md text-sg-text-mid">
                No se encontraron clientes que coincidan con tu búsqueda
              </p>
            </div>
          )}
        </div>

        {/* Pagination info */}
        <div className="mt-4 flex items-center justify-between">
          <p className="text-body-sm text-sg-text-mid">
            Mostrando {filteredClients.length} de {clients.length} clientes
          </p>
        </div>
      </div>

      {/* Add Client Modal */}
      <AddClientModal
        isOpen={addClientOpen}
        onClose={() => setAddClientOpen(false)}
        onCreated={() => refetchClients()}
        packages={packages}
        members={members}
      />
    </div>
  );
}
