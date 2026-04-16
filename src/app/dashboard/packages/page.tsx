'use client';

import { useState } from 'react';
import { usePackages, createPackage, updatePackage, deletePackage, useClients } from '@/lib/hooks';
import { Package } from '@/types';
import { Plus as PlusIcon, X as XIcon, Check as CheckIcon, Pencil, Trash2, Package as PackageIcon, AlertTriangle, Sparkles, Users as UsersIcon, TrendingUp } from 'lucide-react';

const Plus = () => <PlusIcon className="w-4 h-4" />;
const X = () => <XIcon className="w-4 h-4" />;
const Edit = () => <Pencil className="w-3.5 h-3.5" />;
const Trash = () => <Trash2 className="w-3.5 h-3.5" />;

export default function PackagesPage() {
  const { data: packages, loading, error, refetch } = usePackages();
  const { data: clients } = useClients();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    currency: 'MXN',
    discount_quarterly: '',
    discount_semiannual: '',
    discount_annual: '',
    features: [] as string[],
    is_featured: false,
    featureInput: '',
  });

  const openCreateModal = () => {
    setEditingPackage(null);
    setSaveError(null);
    const emptyForm = {
      name: '',
      description: '',
      price: '',
      currency: 'MXN',
      discount_quarterly: '',
      discount_semiannual: '',
      discount_annual: '',
      features: [] as string[],
      is_featured: false,
      featureInput: '',
    };
    setFormData(emptyForm);
    // Use setTimeout to ensure state is flushed before opening modal
    setTimeout(() => setIsModalOpen(true), 0);
  };

  const openEditModal = (pkg: Package) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description || '',
      price: pkg.price?.toString() || '',
      currency: pkg.currency,
      discount_quarterly: pkg.discount_quarterly?.toString() || '',
      discount_semiannual: pkg.discount_semiannual?.toString() || '',
      discount_annual: pkg.discount_annual?.toString() || '',
      features: pkg.features || [],
      is_featured: pkg.is_featured,
      featureInput: '',
    });
    setIsModalOpen(true);
  };

  const handleAddFeature = () => {
    if (formData.featureInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        features: [...prev.features, prev.featureInput.trim()],
        featureInput: '',
      }));
    }
  };

  const handleRemoveFeature = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setSaveError(null);

    try {
      const packageData = {
        name: formData.name,
        description: formData.description || null,
        price: formData.price ? parseFloat(formData.price) : null,
        currency: formData.currency,
        discount_quarterly: formData.discount_quarterly ? parseFloat(formData.discount_quarterly) : 0,
        discount_semiannual: formData.discount_semiannual ? parseFloat(formData.discount_semiannual) : 0,
        discount_annual: formData.discount_annual ? parseFloat(formData.discount_annual) : 0,
        features: formData.features,
        is_featured: formData.is_featured,
        sort_order: editingPackage ? editingPackage.sort_order : (packages?.length || 0),
      };

      if (editingPackage) {
        await updatePackage(editingPackage.id, packageData);
      } else {
        await createPackage(packageData);
      }

      setFormData({
        name: '',
        description: '',
        price: '',
        currency: 'MXN',
        discount_quarterly: '',
        discount_semiannual: '',
        discount_annual: '',
        features: [],
        is_featured: false,
        featureInput: '',
      });
      setEditingPackage(null);
      setIsModalOpen(false);
      await refetch();
    } catch (err: unknown) {
      console.error('Error saving package:', err);
      const message = err instanceof Error ? err.message : 'Error desconocido al guardar';
      setSaveError(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = (packageId: string) => {
    setConfirmDeleteId(packageId);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    setIsDeleting(confirmDeleteId);
    setConfirmDeleteId(null);
    try {
      await deletePackage(confirmDeleteId);
      await refetch();
    } catch (err: unknown) {
      console.error('Error deleting package:', err);
      const message = err instanceof Error ? err.message : 'Error al eliminar';
      setSaveError(`Error al eliminar: ${message}`);
    } finally {
      setIsDeleting(null);
    }
  };

  // Metrics
  const totalPackages = packages.length;
  const featuredCount = packages.filter((p) => p.is_featured).length;
  const avgPrice = packages.length
    ? Math.round(
        packages.reduce((sum, p) => sum + (p.price || 0), 0) /
          Math.max(packages.filter((p) => p.price !== null).length, 1)
      )
    : 0;

  // Map clients to packages
  const clientsByPackage: Record<string, number> = {};
  clients.forEach((c) => {
    if (c.package_id) clientsByPackage[c.package_id] = (clientsByPackage[c.package_id] || 0) + 1;
  });

  return (
    <div className="py-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-dark)' }}>
            <PackageIcon className="w-5 h-5" style={{ color: '#6366F1' }} />
            Paquetes
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-light)' }}>
            {totalPackages} {totalPackages === 1 ? 'paquete disponible' : 'paquetes disponibles'}
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:shadow-md hover:-translate-y-0.5 duration-200"
          style={{ background: 'linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)' }}
        >
          <Plus />
          <span className="hidden sm:inline">Nuevo paquete</span>
          <span className="sm:hidden">Nuevo</span>
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div
          className="p-4 rounded-2xl mb-6 text-sm"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#991B1B' }}
        >
          Error al cargar paquetes: {error?.message || String(error) || 'Error desconocido'}
        </div>
      )}

      {/* Summary stats (Home-style) */}
      <div
        className="grid gap-5 mb-5"
        style={{ gridTemplateColumns: 'repeat(12, 1fr)' }}
      >
        <div
          className="rounded-2xl p-5"
          style={{
            gridColumn: 'span 4',
            background: '#FFFFFF',
            borderLeft: '4px solid #6366F1',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#EEF2FF' }}>
              <PackageIcon className="w-4 h-4" style={{ color: '#6366F1' }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-dark)' }}>
                {totalPackages}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-light)' }}>Paquetes totales</p>
            </div>
          </div>
        </div>
        <div
          className="rounded-2xl p-5"
          style={{
            gridColumn: 'span 4',
            background: '#FFFFFF',
            borderLeft: '4px solid #A78BFA',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#F5F3FF' }}>
              <Sparkles className="w-4 h-4" style={{ color: '#A78BFA' }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-dark)' }}>
                {featuredCount}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-light)' }}>Destacados</p>
            </div>
          </div>
        </div>
        <div
          className="rounded-2xl p-5"
          style={{
            gridColumn: 'span 4',
            background: '#FFFFFF',
            borderLeft: '4px solid #38BDF8',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#E0F2FE' }}>
              <TrendingUp className="w-4 h-4" style={{ color: '#38BDF8' }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-dark)' }}>
                ${avgPrice.toLocaleString('es-MX')}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-light)' }}>Precio promedio</p>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-80 rounded-2xl animate-pulse"
              style={{ background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.15)' }}
            />
          ))}
        </div>
      ) : packages.length === 0 ? (
        /* Empty State */
        <div
          className="flex flex-col items-center justify-center py-16 px-6 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 50%, #FDF4FF 100%)',
            border: '1px solid rgba(99,102,241,0.2)',
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)' }}
          >
            <PackageIcon className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#312E81' }}>
            Sin paquetes aún
          </h2>
          <p className="text-sm mb-5 text-center max-w-sm" style={{ color: '#6366F1' }}>
            Crea tu primer paquete para comenzar a ofrecer servicios a tus clientes.
          </p>
          <button
            onClick={openCreateModal}
            className="px-5 py-2 rounded-xl text-sm font-medium text-white transition-all hover:shadow-md hover:-translate-y-0.5 duration-200"
            style={{ background: 'linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)' }}
          >
            Crear primer paquete
          </button>
        </div>
      ) : (
        /* Grid of Packages */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {packages.map((pkg) => {
            const clientCount = clientsByPackage[pkg.id] || 0;
            return (
              <div
                key={pkg.id}
                className="relative rounded-2xl p-5 transition-all hover:shadow-md hover:-translate-y-0.5 duration-200 flex flex-col"
                style={{
                  background: pkg.is_featured
                    ? 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)'
                    : '#FFFFFF',
                  border: pkg.is_featured
                    ? '1px solid rgba(99,102,241,0.25)'
                    : '1px solid rgba(148,163,184,0.2)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                {/* Featured Badge */}
                {pkg.is_featured && (
                  <div
                    className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)' }}
                  >
                    <Sparkles className="w-3 h-3" />
                    Destacado
                  </div>
                )}

                {/* Icon + Name */}
                <div className="flex items-start gap-3 mb-3 pr-20">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: pkg.is_featured
                        ? 'linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)'
                        : '#EEF2FF',
                    }}
                  >
                    <PackageIcon
                      className="w-5 h-5"
                      style={{ color: pkg.is_featured ? 'white' : '#6366F1' }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold truncate" style={{ color: 'var(--text-dark)' }}>
                      {pkg.name}
                    </h3>
                    {pkg.description && (
                      <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-light)' }}>
                        {pkg.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Price */}
                <div className="mb-4 pb-4" style={{ borderBottom: '1px solid rgba(148,163,184,0.15)' }}>
                  {pkg.price !== null ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold" style={{ color: '#6366F1' }}>
                        ${pkg.price.toLocaleString('es-MX', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
                      </span>
                      <span className="text-xs font-medium" style={{ color: 'var(--text-light)' }}>
                        {pkg.currency} / mes
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm italic" style={{ color: 'var(--text-light)' }}>
                      Precio personalizado
                    </p>
                  )}

                  {/* Client count chip */}
                  <div className="flex items-center gap-1.5 mt-2 text-xs" style={{ color: 'var(--text-mid)' }}>
                    <UsersIcon className="w-3 h-3" />
                    <span>
                      {clientCount} {clientCount === 1 ? 'cliente activo' : 'clientes activos'}
                    </span>
                  </div>
                </div>

                {/* Discount badges */}
                {(pkg.discount_quarterly > 0 || pkg.discount_semiannual > 0 || pkg.discount_annual > 0) && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {pkg.discount_quarterly > 0 && (
                      <span
                        className="px-2 py-0.5 text-[10px] font-medium rounded-full"
                        style={{ background: '#ECFDF5', color: '#047857' }}
                      >
                        -{pkg.discount_quarterly}% trimestral
                      </span>
                    )}
                    {pkg.discount_semiannual > 0 && (
                      <span
                        className="px-2 py-0.5 text-[10px] font-medium rounded-full"
                        style={{ background: '#ECFDF5', color: '#047857' }}
                      >
                        -{pkg.discount_semiannual}% semestral
                      </span>
                    )}
                    {pkg.discount_annual > 0 && (
                      <span
                        className="px-2 py-0.5 text-[10px] font-medium rounded-full"
                        style={{ background: '#ECFDF5', color: '#047857' }}
                      >
                        -{pkg.discount_annual}% anual
                      </span>
                    )}
                  </div>
                )}

                {/* Features */}
                <div className="flex-1 mb-4">
                  <p
                    className="text-[10px] font-semibold uppercase tracking-wider mb-2"
                    style={{ color: 'var(--text-light)' }}
                  >
                    Incluye
                  </p>
                  {pkg.features && pkg.features.length > 0 ? (
                    <ul className="space-y-1.5">
                      {pkg.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-dark)' }}>
                          <CheckIcon
                            className="w-4 h-4 flex-shrink-0 mt-0.5"
                            style={{ color: '#10B981' }}
                          />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs italic" style={{ color: 'var(--text-light)' }}>
                      Sin características añadidas.
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3" style={{ borderTop: '1px solid rgba(148,163,184,0.15)' }}>
                  <button
                    onClick={() => openEditModal(pkg)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      background: '#EEF2FF',
                      color: '#6366F1',
                    }}
                  >
                    <Edit />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(pkg.id)}
                    disabled={isDeleting === pkg.id}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: 'rgba(239,68,68,0.08)',
                      color: '#DC2626',
                    }}
                  >
                    <Trash />
                    {isDeleting === pkg.id ? '...' : ''}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div
            className="w-full max-w-2xl rounded-3xl border border-white/40 shadow-xl max-h-[90vh] overflow-y-auto"
            style={{ background: 'rgba(241,245,249,0.95)', backdropFilter: 'blur(16px)' }}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-warm-white border-b border-gray-100 px-6 md:px-8 py-6 flex items-center justify-between">
              <h2 className="text-2xl font-serif font-bold text-[#0F172A]">
                {editingPackage ? 'Editar paquete' : 'Nuevo paquete'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
              {/* Name Field */}
              <div>
                <label className="block text-sm font-sans font-semibold text-[#0F172A] mb-2">
                  Nombre del paquete
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ej: Básico, Professional, Premium"
                  className="w-full px-4 py-2 rounded-xl font-sans text-sm border border-white/40 focus:outline-none focus:ring-2 focus:ring-[#6366F1] transition-all"
                  style={{ background: 'rgba(255,255,255,0.6)' }}
                  required
                />
              </div>

              {/* Description Field */}
              <div>
                <label className="block text-sm font-sans font-semibold text-[#0F172A] mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe qué incluye este paquete..."
                  rows={3}
                  className="w-full px-4 py-2 rounded-xl font-sans text-sm border border-white/40 focus:outline-none focus:ring-2 focus:ring-[#6366F1] transition-all"
                  style={{ background: 'rgba(255,255,255,0.6)' }}
                />
              </div>

              {/* Price and Currency */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-sans font-semibold text-[#0F172A] mb-2">
                    Precio base
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0"
                    className="w-full px-4 py-2 rounded-xl font-sans text-sm border border-white/40 focus:outline-none focus:ring-2 focus:ring-[#6366F1] transition-all"
                    style={{ background: 'rgba(255,255,255,0.6)' }}
                    step="0.01"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-sans font-semibold text-[#0F172A] mb-2">
                    Moneda
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl font-sans text-sm border border-white/40 focus:outline-none focus:ring-2 focus:ring-[#6366F1] transition-all"
                    style={{ background: 'rgba(255,255,255,0.6)' }}
                  >
                    <option value="MXN">MXN (Peso Mexicano)</option>
                    <option value="USD">USD (Dólar Estadounidense)</option>
                    <option value="EUR">EUR (Euro)</option>
                  </select>
                </div>
              </div>

              {/* Discounts */}
              <div>
                <p className="text-sm font-sans font-semibold text-[#0F172A] mb-3">
                  Descuentos por tipo de contratación
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-sans font-semibold text-[#0F172A]/70 mb-2">
                      Trimestral (%)
                    </label>
                    <input
                      type="number"
                      value={formData.discount_quarterly}
                      onChange={(e) => setFormData({ ...formData, discount_quarterly: e.target.value })}
                      placeholder="0"
                      className="w-full px-4 py-2 rounded-xl font-sans text-sm border border-white/40 focus:outline-none focus:ring-2 focus:ring-[#6366F1] transition-all"
                      style={{ background: 'rgba(255,255,255,0.6)' }}
                      step="0.01"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-sans font-semibold text-[#0F172A]/70 mb-2">
                      Semestral (%)
                    </label>
                    <input
                      type="number"
                      value={formData.discount_semiannual}
                      onChange={(e) => setFormData({ ...formData, discount_semiannual: e.target.value })}
                      placeholder="0"
                      className="w-full px-4 py-2 rounded-xl font-sans text-sm border border-white/40 focus:outline-none focus:ring-2 focus:ring-[#6366F1] transition-all"
                      style={{ background: 'rgba(255,255,255,0.6)' }}
                      step="0.01"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-sans font-semibold text-[#0F172A]/70 mb-2">
                      Anual (%)
                    </label>
                    <input
                      type="number"
                      value={formData.discount_annual}
                      onChange={(e) => setFormData({ ...formData, discount_annual: e.target.value })}
                      placeholder="0"
                      className="w-full px-4 py-2 rounded-xl font-sans text-sm border border-white/40 focus:outline-none focus:ring-2 focus:ring-[#6366F1] transition-all"
                      style={{ background: 'rgba(255,255,255,0.6)' }}
                      step="0.01"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
              </div>

              {/* Features Field */}
              <div>
                <label className="block text-sm font-sans font-semibold text-[#0F172A] mb-3">
                  Características
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={formData.featureInput}
                    onChange={(e) => setFormData({ ...formData, featureInput: e.target.value })}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddFeature();
                      }
                    }}
                    placeholder="Añadir característica..."
                    className="flex-1 px-4 py-2 rounded-xl font-sans text-sm border border-white/40 focus:outline-none focus:ring-2 focus:ring-[#6366F1] transition-all"
                    style={{ background: 'rgba(255,255,255,0.6)' }}
                  />
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="px-4 py-2 rounded-xl font-sans text-sm font-medium text-white transition-transform hover:scale-105 active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)' }}
                  >
                    <Plus />
                  </button>
                </div>

                {/* Features Chips */}
                {formData.features.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.features.map((feature, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-3 py-1 rounded-full font-sans text-sm text-[#0F172A] border border-white/40"
                        style={{ background: 'rgba(255, 181, 200, 0.2)' }}
                      >
                        <span>{feature}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFeature(idx)}
                          className="hover:opacity-70"
                        >
                          <X />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Featured Toggle */}
              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={formData.is_featured}
                    onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                    className="w-4 h-4 rounded cursor-pointer accent-[#6366F1]"
                  />
                  <span className="font-sans text-sm font-semibold text-[#0F172A]">
                    Marcar como destacado
                  </span>
                </label>
              </div>

              {/* Error Message */}
              {saveError && (
                <div className="p-3 rounded-xl text-sm font-sans text-red-800" style={{ background: 'rgba(255, 200, 200, 0.5)' }}>
                  {saveError}
                </div>
              )}

              {/* Form Actions */}
              <div className="flex gap-3 pt-6 border-t border-white/40">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 rounded-2xl font-sans text-sm font-medium text-[#0F172A] border border-white/40 hover:bg-white/20 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !formData.name}
                  className="flex-1 px-4 py-2 rounded-2xl font-sans text-sm font-medium text-white transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)' }}
                >
                  {isCreating ? 'Guardando...' : editingPackage ? 'Guardar cambios' : 'Crear paquete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[600] backdrop-blur-lg"
          style={{ backgroundColor: 'rgba(42,31,26,0.45)' }}
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            className="rounded-3xl max-w-sm w-full shadow-lg border p-8 text-center space-y-4"
            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--glass-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <AlertTriangle className="w-10 h-10" style={{ color: 'var(--danger-text)' }} />
            <h3 className="text-lg font-serif font-bold" style={{ color: 'var(--text-dark)' }}>
              ¿Eliminar paquete?
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-mid)' }}>
              Esta acción no se puede deshacer. Los clientes asignados a este paquete quedarán sin paquete.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 px-4 py-2 rounded-2xl font-sans text-sm font-medium border transition-colors"
                style={{ borderColor: 'var(--glass-border)', color: 'var(--text-dark)' }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 rounded-2xl font-sans text-sm font-medium text-white transition-transform hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
