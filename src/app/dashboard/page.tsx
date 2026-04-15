'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useClients, useStats, usePackages, useMembers, deleteClient, updateClient } from '@/lib/hooks';
import { Client, PayStatus, AccountStatus, calculateMonthlyPayment } from '@/types';
import { AddClientModal } from '@/components/clients/AddClientModal';

export default function ClientsPage() {
  const router = useRouter();
  const { data: clients, loading: clientsLoading, refetch: refetchClients } = useClients();
  const { data: stats, loading: statsLoading } = useStats();
  const { data: packages } = usePackages();
  const { data: members } = useMembers();
  const [searchQuery, setSearchQuery] = useState('');
  const [packageTypeFilter, setPackageTypeFilter] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [addClientOpen, setAddClientOpen] = useState(false);

  // Filter clients based on search, package type, and status
  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (client.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

      const matchesPackageType = packageTypeFilter === 'todos' || client.package_type === packageTypeFilter;

      const matchesStatus = statusFilter === 'todos' ||
        (statusFilter === 'pago_pendiente' && client.pay_status === 'pendiente') ||
        (statusFilter !== 'pago_pendiente' && client.account_status === statusFilter);

      return matchesSearch && matchesPackageType && matchesStatus;
    });
  }, [clients, searchQuery, packageTypeFilter, statusFilter]);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const calculateMonthsActive = (startDate: string | null): number => {
    if (!startDate) return 0;
    const start = new Date(startDate);
    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.ceil(daysDiff / 30));
  };

  const getMonthlyPayment = (client: Client): number => {
    return calculateMonthlyPayment(client.package || null, client.package_type, client.custom_price);
  };

  const getStatusBadgeClass = (status: AccountStatus | 'pago_pendiente'): string => {
    const map: Record<string, string> = {
      activo: 'badge-success',
      on_track: 'badge-success',
      pago_pendiente: 'badge-warning',
      onboarding: 'badge-warning',
      pausado: 'badge-neutral',
    };
    return map[status] || 'badge-neutral';
  };

  const getStatusLabel = (status: AccountStatus | 'pago_pendiente'): string => {
    const map: Record<string, string> = {
      activo: 'Activo',
      on_track: 'On Track',
      pago_pendiente: 'Pago Pendiente',
      onboarding: 'Onboarding',
      pausado: 'Pausado',
    };
    return map[status] || status;
  };

  const handleTogglePayStatus = async (client: Client) => {
    try {
      const newPayStatus: PayStatus = client.pay_status === 'pendiente' ? 'pagado' : 'pendiente';
      await updateClient(client.id, { pay_status: newPayStatus });
      await refetchClients();
    } catch (error) {
      console.error('Error updating pay status:', error);
      alert('Error al actualizar el estado de pago');
    }
  };

  const handleToggleAccountStatus = async (client: Client) => {
    try {
      const newStatus: AccountStatus = client.account_status === 'activo' ? 'pausado' : 'activo';
      await updateClient(client.id, { account_status: newStatus });
      await refetchClients();
    } catch (error) {
      console.error('Error updating account status:', error);
      alert('Error al actualizar el estado de la cuenta');
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este cliente?')) return;
    try {
      await deleteClient(id);
      await refetchClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Error al eliminar el cliente');
    }
  };

  const handleEditClient = (id: string) => {
    router.push(`/dashboard/clients/${id}`);
  };

  const handleExportXLS = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Clientes');

      ws.addRow(['Marca', 'Paquete', 'Tipo', 'Meses Activos', 'Pago Mensual', 'Ciudad', 'Instagram', 'Status']);
      filteredClients.forEach((client) => {
        ws.addRow([
          client.name,
          client.package?.name || 'Sin paquete',
          client.package_type || '-',
          calculateMonthsActive(client.start_date),
          getMonthlyPayment(client),
          client.city || '-',
          client.instagram || '-',
          getStatusLabel(
            client.pay_status === 'pendiente' ? 'pago_pendiente' : (client.account_status as AccountStatus)
          ),
        ]);
      });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clientes-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting XLS:', error);
      alert('Error al exportar archivo');
    }
  };

  const isLoading = clientsLoading || statsLoading;

  return (
    <div className="space-y-6">
      {/* Sticky Header + Stats — always pinned at top */}
      <div className="sticky-header sticky top-0 z-50 -mx-8 px-8 pt-7 pb-4" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-serif font-bold" style={{ color: 'var(--text-dark)' }}>👥 Clientes</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-mid)' }}>Gestiona cuentas, contratos y estatus de pago</p>
          </div>
          <button
            onClick={() => setAddClientOpen(true)}
            className="btn btn-primary"
          >
            + Agregar cliente
          </button>
        </div>

        {/* Stats Grid — inside sticky area */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {isLoading ? (
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="stat-card animate-pulse">
                <div className="h-4 rounded w-1/2 mb-3" style={{ background: 'var(--glass-border)' }} />
                <div className="h-6 rounded w-1/3" style={{ background: 'var(--glass-border)' }} />
              </div>
            ))
          ) : (
            <>
              <div className="stat-card">
                <p className="text-body-xs text-sg-text-mid font-semibold uppercase tracking-wide mb-1">MRR Total</p>
                <p className="font-mono text-heading-md text-sg-text font-bold">{formatCurrency(stats?.totalMRR ?? 0)}</p>
              </div>
              <div className="stat-card">
                <p className="text-body-xs text-sg-text-mid font-semibold uppercase tracking-wide mb-1">Clientes activos</p>
                <p className="font-mono text-heading-md text-sg-text font-bold">{stats?.activeClientsCount ?? 0}</p>
              </div>
              <div className="stat-card">
                <p className="text-body-xs text-sg-text-mid font-semibold uppercase tracking-wide mb-1">Posts planeados</p>
                <p className="font-mono text-heading-md text-sg-text font-bold">{stats?.postsThisMonth ?? 0}</p>
              </div>
              <div className="stat-card">
                <p className="text-body-xs text-sg-text-mid font-semibold uppercase tracking-wide mb-1">Pagos pendientes</p>
                <p className="font-mono text-heading-md text-sg-text font-bold">{stats?.pendingPayments ?? 0}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        /* Skeleton for data area only */
        <>
          <div className="glass-card rounded-lg animate-pulse p-6">
            <div className="h-4 rounded w-full mb-3" style={{ background: 'var(--glass-border)' }} />
            <div className="h-4 rounded w-3/4 mb-3" style={{ background: 'var(--glass-border)' }} />
            <div className="h-4 rounded w-1/2" style={{ background: 'var(--glass-border)' }} />
          </div>
        </>
      ) : clients.length === 0 ? (
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
      ) : (
      <>

      {/* Filter Bar */}
      <div className="flex flex-col gap-4">
        {/* Search */}
        <input
          type="text"
          placeholder="Buscar cliente por nombre..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="form-input w-full"
        />

        {/* Filters and Export */}
        <div className="flex flex-col md:flex-row gap-3">
          {/* Package Type Filter */}
          <select
            value={packageTypeFilter}
            onChange={(e) => setPackageTypeFilter(e.target.value)}
            className="form-input flex-1"
          >
            <option value="todos">Tipo: Todos</option>
            <option value="mensual">Mensual</option>
            <option value="trimestral">Trimestral</option>
            <option value="semestral">Semestral</option>
            <option value="anual">Anual</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-input flex-1"
          >
            <option value="todos">Status: Todos</option>
            <option value="activo">Activo</option>
            <option value="on_track">On Track</option>
            <option value="pago_pendiente">Pago Pendiente</option>
            <option value="onboarding">Onboarding</option>
            <option value="pausado">Pausado</option>
          </select>

          {/* Export Button */}
          <button
            onClick={handleExportXLS}
            className="btn btn-primary whitespace-nowrap"
          >
            📥 Exportar XLS
          </button>
        </div>
      </div>

      {/* Mobile Card View — visible on small screens only */}
      <div className="md:hidden space-y-3 pb-8">
        {filteredClients.map((client) => (
          <div
            key={client.id}
            onClick={() => handleEditClient(client.id)}
            className="glass-card rounded-xl p-4 active:scale-[0.98] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-sm flex items-center justify-center text-lg flex-shrink-0"
                style={{ backgroundColor: client.color }}
              >
                {client.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body-md font-semibold text-sg-text truncate">{client.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="package-tag text-xs">{client.package?.name ?? 'Sin paquete'}</span>
                  <span className="text-body-xs text-sg-text-mid">{client.package_type || ''}</span>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); if (client.pay_status === 'pendiente') handleTogglePayStatus(client); }}
                className={`badge ${getStatusBadgeClass(client.pay_status === 'pendiente' ? 'pago_pendiente' : client.account_status)} text-xs flex-shrink-0`}
              >
                {client.pay_status === 'pendiente' ? 'Pago Pendiente' : getStatusLabel(client.account_status)}
              </button>
            </div>
            <div className="flex items-center justify-between text-body-xs text-sg-text-mid">
              <span>Mes {calculateMonthsActive(client.start_date)}</span>
              <span className="font-mono font-semibold text-sg-text">{formatCurrency(getMonthlyPayment(client))}</span>
              <span>{client.city || '-'}</span>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                {client.instagram && (
                  <a href={client.instagram} target="_blank" rel="noopener noreferrer" className="text-rose text-base min-w-[44px] min-h-[44px] flex items-center justify-center">📷</a>
                )}
                <button onClick={() => handleToggleAccountStatus(client)} className={`text-base min-w-[44px] min-h-[44px] flex items-center justify-center ${client.account_status === 'activo' ? 'text-green-500' : 'text-sg-text-light'}`} title={client.account_status === 'activo' ? 'Desactivar' : 'Activar'}>{client.account_status === 'activo' ? '✅' : '⏸️'}</button>
                <button onClick={() => handleEditClient(client.id)} className="text-rose text-base min-w-[44px] min-h-[44px] flex items-center justify-center" title="Editar">✏️</button>
                <button onClick={() => handleDeleteClient(client.id)} className="text-sg-text-light text-base min-w-[44px] min-h-[44px] flex items-center justify-center" title="Eliminar">🗑️</button>
              </div>
            </div>
          </div>
        ))}

        {filteredClients.length === 0 && clients.length > 0 && (
          <div className="p-12 text-center">
            <p className="text-body-md text-sg-text-mid">No se encontraron clientes que coincidan con tu búsqueda</p>
          </div>
        )}

        <div className="mt-4 px-4">
          <p className="text-body-sm text-sg-text-mid">Mostrando {filteredClients.length} de {clients.length} clientes</p>
        </div>
      </div>

      {/* Desktop Table View — hidden on small screens */}
      <div className="hidden md:block pb-8">
        <div className="overflow-x-auto glass-card rounded-lg">
          <table className="w-full">
            <thead>
              <tr className="border-b border-sg-border" style={{ backgroundColor: 'var(--bg)' }}>
                  <th className="text-left p-4 text-body-xs font-semibold text-sg-text-mid uppercase tracking-wide">
                    Marca
                  </th>
                  <th className="text-left p-4 text-body-xs font-semibold text-sg-text-mid uppercase tracking-wide">
                    Paquete
                  </th>
                  <th className="text-left p-4 text-body-xs font-semibold text-sg-text-mid uppercase tracking-wide">
                    Tipo
                  </th>
                  <th className="text-left p-4 text-body-xs font-semibold text-sg-text-mid uppercase tracking-wide">
                    Meses activos
                  </th>
                  <th className="text-right p-4 text-body-xs font-semibold text-sg-text-mid uppercase tracking-wide">
                    Pago mensual
                  </th>
                  <th className="text-left p-4 text-body-xs font-semibold text-sg-text-mid uppercase tracking-wide">
                    Ciudad
                  </th>
                  <th className="text-center p-4 text-body-xs font-semibold text-sg-text-mid uppercase tracking-wide">
                    IG
                  </th>
                  <th className="text-center p-4 text-body-xs font-semibold text-sg-text-mid uppercase tracking-wide">
                    Status
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
                    onClick={() => handleEditClient(client.id)}
                    className="border-b border-sg-border hover:bg-[rgba(255,181,200,0.07)] transition-colors cursor-pointer"
                  >
                    {/* Marca */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-sm flex items-center justify-center text-lg flex-shrink-0"
                          style={{ backgroundColor: client.color }}
                        >
                          {client.emoji}
                        </div>
                        <p className="text-body-md font-semibold text-sg-text truncate">
                          {client.name}
                        </p>
                      </div>
                    </td>

                    {/* Paquete */}
                    <td className="p-4">
                      <span className="package-tag">
                        {client.package?.name ?? 'Sin paquete'}
                      </span>
                    </td>

                    {/* Tipo */}
                    <td className="p-4">
                      <p className="text-body-sm text-sg-text">
                        {client.package_type || '-'}
                      </p>
                    </td>

                    {/* Meses activos */}
                    <td className="p-4">
                      <p className="text-body-sm text-sg-text">
                        Mes {calculateMonthsActive(client.start_date)}
                      </p>
                    </td>

                    {/* Pago mensual */}
                    <td className="p-4 text-right">
                      <p className="font-mono text-body-md font-semibold text-sg-text">
                        {formatCurrency(getMonthlyPayment(client))}
                      </p>
                    </td>

                    {/* Ciudad */}
                    <td className="p-4">
                      <p className="text-body-sm text-sg-text">
                        {client.city || '-'}
                      </p>
                    </td>

                    {/* IG */}
                    <td className="p-4 text-center">
                      {client.instagram ? (
                        <a
                          href={client.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-rose hover:text-rose-deep transition-colors text-lg"
                          title="Abrir Instagram"
                          onClick={(e) => e.stopPropagation()}
                        >
                          📷
                        </a>
                      ) : (
                        <span className="text-sg-text-light">-</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="p-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (client.pay_status === 'pendiente') {
                            handleTogglePayStatus(client);
                          }
                        }}
                        className={`badge ${getStatusBadgeClass(
                          client.pay_status === 'pendiente' ? 'pago_pendiente' : client.account_status
                        )} ${client.pay_status === 'pendiente' ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                      >
                        {client.pay_status === 'pendiente'
                          ? 'Pago Pendiente'
                          : getStatusLabel(client.account_status)}
                      </button>
                    </td>

                    {/* Acciones */}
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleAccountStatus(client); }}
                          className={`relative group text-lg transition-colors ${client.account_status === 'activo' ? 'text-green-500 hover:text-red-400' : 'text-sg-text-light hover:text-green-500'}`}
                          title={client.account_status === 'activo' ? 'Desactivar cliente' : 'Activar cliente'}
                        >
                          {client.account_status === 'activo' ? '✅' : '⏸️'}
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            {client.account_status === 'activo' ? 'Desactivar' : 'Activar'} — {client.account_status === 'activo' ? 'pausar cuenta' : 'cliente con plan pagado'}
                          </span>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEditClient(client.id); }}
                          className="text-rose hover:text-rose-deep transition-colors text-lg"
                          title="Editar cliente"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id); }}
                          className="text-sg-text-light hover:text-sg-danger-text transition-colors text-lg"
                          title="Eliminar cliente"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredClients.length === 0 && clients.length > 0 && (
              <div className="p-12 text-center">
                <p className="text-body-md text-sg-text-mid">
                  No se encontraron clientes que coincidan con tu búsqueda
                </p>
              </div>
            )}
          </div>

          {/* Info Footer */}
          <div className="mt-4 flex items-center justify-between px-4">
            <p className="text-body-sm text-sg-text-mid">
              Mostrando {filteredClients.length} de {clients.length} clientes
            </p>
          </div>
      </div>
      </>
      )}

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
