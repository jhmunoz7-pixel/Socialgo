'use client';

import { useState } from 'react';
import { usePackages, createPackage, updatePackage, deletePackage } from '@/lib/hooks';
import { Package } from '@/types';
import { Plus as PlusIcon, X as XIcon, Check as CheckIcon, Pencil, Trash2, Package as PackageIcon, AlertTriangle } from 'lucide-react';

const Plus = () => <PlusIcon className="w-4 h-4" />;
const X = () => <XIcon className="w-4 h-4" />;
const Check = () => <CheckIcon className="w-4 h-4 text-green-600" />;
const Edit = () => <Pencil className="w-4 h-4" />;
const Trash = () => <Trash2 className="w-4 h-4" />;

export default function PackagesPage() {
  const { data: packages, loading, error, refetch } = usePackages();
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

  return (
    <div className="pb-12">
      {/* Sticky Header */}
      <div
        className="sticky-header sticky top-0 z-20 border-b border-gray-100 -mx-8 px-8 pt-7 pb-4 flex items-center justify-between"
        style={{
          background: 'var(--bg)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <h1 className="text-2xl font-serif font-bold" style={{ color: 'var(--text-dark)' }}>
          <span className="flex items-center gap-2"><PackageIcon className="w-5 h-5" style={{ color: 'var(--primary-deep)' }} /> Paquetes</span>
        </h1>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl font-sans text-sm font-medium text-white transition-transform hover:scale-105 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #FF8FAD 0%, #FFBA8A 100%)' }}
        >
          <Plus />
          <span className="hidden sm:inline">Nuevo paquete</span>
          <span className="sm:hidden">+ Nuevo</span>
        </button>
      </div>

      <div className="p-6 md:p-8">
        {/* Error State */}
        {error && (
          <div
            className="p-4 rounded-2xl mb-6 text-sm font-sans text-red-800"
            style={{ background: 'rgba(255, 200, 200, 0.5)', backdropFilter: 'blur(16px)' }}
          >
            Error al cargar paquetes: {error?.message || String(error) || 'Error desconocido'}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-80 rounded-2xl border border-white/40 animate-pulse"
                style={{ background: 'rgba(255,248,243,0.4)' }}
              />
            ))}
          </div>
        ) : packages.length === 0 ? (
          /* Empty State */
          <div
            className="flex flex-col items-center justify-center py-16 px-6 rounded-3xl border border-white/40"
            style={{ background: 'rgba(255,248,243,0.7)', backdropFilter: 'blur(16px)' }}
          >
            <PackageIcon className="w-12 h-12 mb-4" style={{ color: 'var(--text-light)' }} />
            <h2 className="text-xl font-serif font-bold text-[#2A1F1A] mb-2">
              Sin paquetes aún
            </h2>
            <p className="text-[#2A1F1A]/60 font-sans mb-6 text-center max-w-sm">
              Crea tu primer paquete para comenzar a ofrecer servicios a tus clientes
            </p>
            <button
              onClick={openCreateModal}
              className="px-6 py-2 rounded-2xl font-sans text-sm font-medium text-white transition-transform hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #FF8FAD 0%, #FFBA8A 100%)' }}
            >
              Crear primer paquete
            </button>
          </div>
        ) : (
          /* Grid of Packages */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="relative rounded-2xl border border-white/40 shadow-sm p-6 group hover:shadow-md transition-shadow"
                style={{ background: 'rgba(255,248,243,0.7)', backdropFilter: 'blur(16px)' }}
              >
                {/* Featured Badge */}
                {pkg.is_featured && (
                  <div
                    className="absolute top-4 right-4 px-3 py-1 rounded-full font-sans text-xs font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg, #FF8FAD 0%, #FFBA8A 100%)' }}
                  >
                    Destacado
                  </div>
                )}

                {/* Package Name */}
                <h3 className="text-xl font-serif font-bold text-[#2A1F1A] mb-2 pr-16">
                  {pkg.name}
                </h3>

                {/* Description */}
                {pkg.description && (
                  <p className="text-sm font-sans text-[#2A1F1A]/70 mb-4">
                    {pkg.description}
                  </p>
                )}

                {/* Price */}
                <div className="mb-6">
                  {pkg.price !== null ? (
                    <p className="text-3xl font-serif font-bold text-[#FF8FAD]">
                      ${pkg.price.toLocaleString('es-MX', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                      <span className="text-sm font-sans font-normal text-[#2A1F1A]/60 ml-1">
                        {pkg.currency}
                      </span>
                    </p>
                  ) : (
                    <p className="text-sm font-sans text-[#2A1F1A]/60 italic">
                      Precio personalizado
                    </p>
                  )}
                </div>

                {/* Discount Badges */}
                {(pkg.discount_quarterly || pkg.discount_semiannual || pkg.discount_annual) && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {pkg.discount_quarterly > 0 && (
                      <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        -{pkg.discount_quarterly}% trimestral
                      </span>
                    )}
                    {pkg.discount_semiannual > 0 && (
                      <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        -{pkg.discount_semiannual}% semestral
                      </span>
                    )}
                    {pkg.discount_annual > 0 && (
                      <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        -{pkg.discount_annual}% anual
                      </span>
                    )}
                  </div>
                )}

                {/* Features List */}
                <div className="mb-6">
                  <p className="text-xs font-sans font-semibold text-[#2A1F1A]/70 uppercase tracking-wide mb-3">
                    Características
                  </p>
                  <ul className="space-y-2">
                    {pkg.features && pkg.features.length > 0 ? (
                      pkg.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check />
                          <span className="font-sans text-sm text-[#2A1F1A]">
                            {feature}
                          </span>
                        </li>
                      ))
                    ) : (
                      <p className="font-sans text-sm text-[#2A1F1A]/50">
                        Sin características
                      </p>
                    )}
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 space-y-2 flex-col">
                  <button
                    onClick={() => openEditModal(pkg)}
                    className="w-full py-2 rounded-2xl font-sans text-sm font-medium text-[#2A1F1A] transition-all hover:shadow-md flex items-center justify-center gap-2"
                    style={{ background: 'rgba(255, 181, 200, 0.3)' }}
                  >
                    <Edit />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(pkg.id)}
                    disabled={isDeleting === pkg.id}
                    className="w-full py-2 rounded-2xl font-sans text-sm font-medium text-red-600 transition-all hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: 'rgba(255, 100, 100, 0.1)' }}
                  >
                    <Trash />
                    {isDeleting === pkg.id ? 'Eliminando...' : 'Eliminar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div
            className="w-full max-w-2xl rounded-3xl border border-white/40 shadow-xl max-h-[90vh] overflow-y-auto"
            style={{ background: 'rgba(255,248,243,0.95)', backdropFilter: 'blur(16px)' }}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-warm-white border-b border-gray-100 px-6 md:px-8 py-6 flex items-center justify-between">
              <h2 className="text-2xl font-serif font-bold text-[#2A1F1A]">
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
                <label className="block text-sm font-sans font-semibold text-[#2A1F1A] mb-2">
                  Nombre del paquete
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ej: Básico, Professional, Premium"
                  className="w-full px-4 py-2 rounded-xl font-sans text-sm border border-white/40 focus:outline-none focus:ring-2 focus:ring-[#FF8FAD] transition-all"
                  style={{ background: 'rgba(255,255,255,0.6)' }}
                  required
                />
              </div>

              {/* Description Field */}
              <div>
                <label className="block text-sm font-sans font-semibold text-[#2A1F1A] mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe qué incluye este paquete..."
                  rows={3}
                  className="w-full px-4 py-2 rounded-xl font-sans text-sm border border-white/40 focus:outline-none focus:ring-2 focus:ring-[#FF8FAD] transition-all"
                  style={{ background: 'rgba(255,255,255,0.6)' }}
                />
              </div>

              {/* Price and Currency */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-sans font-semibold text-[#2A1F1A] mb-2">
                    Precio base
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0"
                    className="w-full px-4 py-2 rounded-xl font-sans text-sm border border-white/40 focus:outline-none focus:ring-2 focus:ring-[#FF8FAD] transition-all"
                    style={{ background: 'rgba(255,255,255,0.6)' }}
                    step="0.01"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-sans font-semibold text-[#2A1F1A] mb-2">
                    Moneda
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl font-sans text-sm border border-white/40 focus:outline-none focus:ring-2 focus:ring-[#FF8FAD] transition-all"
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
                <p className="text-sm font-sans font-semibold text-[#2A1F1A] mb-3">
                  Descuentos por tipo de contratación
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-sans font-semibold text-[#2A1F1A]/70 mb-2">
                      Trimestral (%)
                    </label>
                    <input
                      type="number"
                      value={formData.discount_quarterly}
                      onChange={(e) => setFormData({ ...formData, discount_quarterly: e.target.value })}
                      placeholder="0"
                      className="w-full px-4 py-2 rounded-xl font-sans text-sm border border-white/40 focus:outline-none focus:ring-2 focus:ring-[#FF8FAD] transition-all"
                      style={{ background: 'rgba(255,255,255,0.6)' }}
                      step="0.01"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-sans font-semibold text-[#2A1F1A]/70 mb-2">
                      Semestral (%)
                    </label>
                    <input
                      type="number"
                      value={formData.discount_semiannual}
                      onChange={(e) => setFormData({ ...formData, discount_semiannual: e.target.value })}
                      placeholder="0"
                      className="w-full px-4 py-2 rounded-xl font-sans text-sm border border-white/40 focus:outline-none focus:ring-2 focus:ring-[#FF8FAD] transition-all"
                      style={{ background: 'rgba(255,255,255,0.6)' }}
                      step="0.01"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-sans font-semibold text-[#2A1F1A]/70 mb-2">
                      Anual (%)
                    </label>
                    <input
                      type="number"
                      value={formData.discount_annual}
                      onChange={(e) => setFormData({ ...formData, discount_annual: e.target.value })}
                      placeholder="0"
                      className="w-full px-4 py-2 rounded-xl font-sans text-sm border border-white/40 focus:outline-none focus:ring-2 focus:ring-[#FF8FAD] transition-all"
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
                <label className="block text-sm font-sans font-semibold text-[#2A1F1A] mb-3">
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
                    className="flex-1 px-4 py-2 rounded-xl font-sans text-sm border border-white/40 focus:outline-none focus:ring-2 focus:ring-[#FF8FAD] transition-all"
                    style={{ background: 'rgba(255,255,255,0.6)' }}
                  />
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="px-4 py-2 rounded-xl font-sans text-sm font-medium text-white transition-transform hover:scale-105 active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #FF8FAD 0%, #FFBA8A 100%)' }}
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
                        className="flex items-center gap-2 px-3 py-1 rounded-full font-sans text-sm text-[#2A1F1A] border border-white/40"
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
                    className="w-4 h-4 rounded cursor-pointer accent-[#FF8FAD]"
                  />
                  <span className="font-sans text-sm font-semibold text-[#2A1F1A]">
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
                  className="flex-1 px-4 py-2 rounded-2xl font-sans text-sm font-medium text-[#2A1F1A] border border-white/40 hover:bg-white/20 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !formData.name}
                  className="flex-1 px-4 py-2 rounded-2xl font-sans text-sm font-medium text-white transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #FF8FAD 0%, #FFBA8A 100%)' }}
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
