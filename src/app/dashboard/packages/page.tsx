'use client';

import { useState } from 'react';
import { usePackages, createPackage } from '@/lib/hooks';
import { Package } from '@/types';

// Icon replacements (no external dependency)
const ChevronDown = ({ className }: { className?: string }) => <span className={className} style={{ display: 'inline-block', fontSize: '12px' }}>▼</span>;
const Plus = () => <span className="text-lg leading-none">+</span>;
const X = () => <span className="font-bold">✕</span>;
const Check = () => <span className="text-green-600 font-bold">✓</span>;

export default function PackagesPage() {
  const { data: packages, loading, error, refetch } = usePackages();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    currency: 'MXN',
    features: [] as string[],
    is_featured: false,
    featureInput: '',
  });

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

    try {
      const packageData: Omit<Package, 'id' | 'org_id' | 'created_at' | 'updated_at'> = {
        name: formData.name,
        price: formData.price ? parseFloat(formData.price) : null,
        currency: formData.currency,
        features: formData.features,
        is_featured: formData.is_featured,
        sort_order: packages.length,
      };

      await createPackage(packageData);
      setFormData({
        name: '',
        price: '',
        currency: 'MXN',
        features: [],
        is_featured: false,
        featureInput: '',
      });
      setIsModalOpen(false);
      refetch();
    } catch (err) {
      console.error('Error creating package:', err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#2A1F1A]">
          Paquetes
        </h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl font-sans text-sm font-medium text-white transition-transform hover:scale-105 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #FF8FAD 0%, #FFBA8A 100%)' }}
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Nuevo paquete</span>
          <span className="sm:hidden">+ Nuevo</span>
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div
          className="p-4 rounded-2xl mb-6 text-sm font-sans text-red-800"
          style={{ background: 'rgba(255, 200, 200, 0.5)', backdropFilter: 'blur(16px)' }}
        >
          Error al cargar paquetes: {error}
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
          <div className="text-5xl mb-4">📦</div>
          <h2 className="text-xl font-serif font-bold text-[#2A1F1A] mb-2">
            Sin paquetes aún
          </h2>
          <p className="text-[#2A1F1A]/60 font-sans mb-6 text-center max-w-sm">
            Crea tu primer paquete para comenzar a ofrecer servicios a tus clientes
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
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
                <div className="absolute top-4 right-4 px-3 py-1 rounded-full font-sans text-xs font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #FF8FAD 0%, #FFBA8A 100%)' }}>
                  Destacado
                </div>
              )}

              {/* Package Name */}
              <h3 className="text-xl font-serif font-bold text-[#2A1F1A] mb-2 pr-16">
                {pkg.name}
              </h3>

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

              {/* Features List */}
              <div className="mb-6">
                <p className="text-xs font-sans font-semibold text-[#2A1F1A]/70 uppercase tracking-wide mb-3">
                  Características
                </p>
                <ul className="space-y-2">
                  {pkg.features && pkg.features.length > 0 ? (
                    pkg.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check size={16} className="text-[#FF8FAD] mt-0.5 flex-shrink-0" />
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

              {/* Edit Button */}
              <button
                className="w-full py-2 rounded-2xl font-sans text-sm font-medium text-[#2A1F1A] transition-all hover:shadow-md"
                style={{ background: 'rgba(255, 181, 200, 0.3)' }}
              >
                Editar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div
            className="w-full max-w-md rounded-3xl border border-white/40 shadow-xl p-6 md:p-8"
            style={{ background: 'rgba(255,248,243,0.95)', backdropFilter: 'blur(16px)' }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-serif font-bold text-[#2A1F1A]">
                Nuevo paquete
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={20} className="text-[#2A1F1A]" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
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

              {/* Price Field */}
              <div>
                <label className="block text-sm font-sans font-semibold text-[#2A1F1A] mb-2">
                  Precio
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

              {/* Currency Field */}
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

              {/* Features Field */}
              <div>
                <label className="block text-sm font-sans font-semibold text-[#2A1F1A] mb-2">
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
                    <Plus size={16} />
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
                          <X size={14} />
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

              {/* Form Actions */}
              <div className="flex gap-3 pt-4">
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
                  {isCreating ? 'Creando...' : 'Crear paquete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
