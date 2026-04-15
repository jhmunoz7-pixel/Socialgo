'use client';

import React, { useState, useMemo } from 'react';
import { createClient, updateClient } from '@/lib/hooks';
import {
  Package,
  Member,
  Client,
  AccountStatus,
  PackageType,
} from '@/types';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  packages: Package[];
  members: Member[];
  editClient?: Client | null;
}

type ContractType = 'Mensual' | 'Trimestral' | 'Semestral' | 'Anual';

const EMOJI_LIST = ['🎯', '💼', '🛍️', '✨', '🎨', '📸', '💎', '🌟', '🔥', '🌿', '☕', '🍕'];
const PRESET_COLORS = ['#E8D5FF', '#FFE8D5', '#D5E8FF', '#E8FFD5', '#FFD5E8', '#D5FFE8'];

export const AddClientModal: React.FC<AddClientModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  packages,
  members,
  editClient,
}) => {
  const isEditMode = !!editClient;

  // Información de marca
  const [nombre, setNombre] = useState(editClient?.name || '');
  const [emoji, setEmoji] = useState(editClient?.emoji || '🎯');
  const [color, setColor] = useState(editClient?.color || '#E8D5FF');

  // Contacto
  const [nombreContacto, setNombreContacto] = useState(editClient?.contact_name || '');
  const [telefono, setTelefono] = useState(editClient?.contact_phone || '');
  const [email, setEmail] = useState(editClient?.contact_email || '');
  const [ciudad, setCiudad] = useState(editClient?.city || '');

  // Redes sociales
  const [instagramHandle, setInstagramHandle] = useState(editClient?.instagram || '');
  const [tiktokHandle, setTiktokHandle] = useState(editClient?.tiktok || '');
  const [facebookHandle, setFacebookHandle] = useState(editClient?.facebook || '');
  const [linkedinHandle, setLinkedinHandle] = useState(editClient?.linkedin || '');

  // Paquete y facturación
  const [paqueteSeleccionado, setPaqueteSeleccionado] = useState(editClient?.package_id || '');
  const [precioOverride, setPrecioOverride] = useState<number | null>(null);
  const [tipoContratacion, setTipoContratacion] = useState<ContractType>('Mensual');
  const [fechaInicio, setFechaInicio] = useState(editClient?.start_date || '');
  const [fechaVigencia, setFechaVigencia] = useState('');
  const [requiereIVA, setRequiereIVA] = useState(false);
  const [ivaOption, setIvaOption] = useState<'incluido' | 'sumado'>('incluido');
  const [_showIVAPopup, setShowIVAPopup] = useState(false);

  // Status
  const [accountManager, setAccountManager] = useState(editClient?.manager_id || '');
  const [estatus, setEstatus] = useState<AccountStatus>(editClient?.account_status || 'activo');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPackage = useMemo(() => packages.find((p) => p.id === paqueteSeleccionado), [paqueteSeleccionado, packages]);

  const monthsMap: Record<ContractType, number> = {
    'Mensual': 1,
    'Trimestral': 3,
    'Semestral': 6,
    'Anual': 12,
  };

  const monthsInType = monthsMap[tipoContratacion];

  const precioBase = precioOverride !== null ? precioOverride : (selectedPackage?.price || 0);

  const descuentoAplicado = selectedPackage
    ? tipoContratacion === 'Trimestral'
      ? selectedPackage.discount_quarterly || 0
      : tipoContratacion === 'Semestral'
        ? selectedPackage.discount_semiannual || 0
        : tipoContratacion === 'Anual'
          ? selectedPackage.discount_annual || 0
          : 0
    : 0;

  const pagoMensual = precioBase * (1 - descuentoAplicado / 100);

  const totalContrato = pagoMensual * monthsInType;

  const descuentoMonto = precioBase * monthsInType * (descuentoAplicado / 100);

  const finalPrice = requiereIVA && ivaOption === 'sumado' ? totalContrato * 1.16 : totalContrato;

  const calcularFechaVigencia = () => {
    if (!fechaInicio) return '';
    const start = new Date(fechaInicio);
    const end = new Date(start);
    end.setMonth(end.getMonth() + monthsInType);
    return end.toISOString().split('T')[0];
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const resetForm = () => {
    setNombre('');
    setEmoji('🎯');
    setColor('#E8D5FF');
    setNombreContacto('');
    setTelefono('');
    setEmail('');
    setCiudad('');
    setInstagramHandle('');
    setTiktokHandle('');
    setFacebookHandle('');
    setLinkedinHandle('');
    setPaqueteSeleccionado('');
    setPrecioOverride(null);
    setTipoContratacion('Mensual');
    setFechaInicio('');
    setFechaVigencia('');
    setRequiereIVA(false);
    setIvaOption('incluido');
    setAccountManager('');
    setEstatus('activo');
  };

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      setError('El nombre de la marca es requerido');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const packageTypeMap: Record<ContractType, PackageType> = {
        'Mensual': 'monthly',
        'Trimestral': 'quarterly',
        'Semestral': 'semiannual',
        'Anual': 'annual',
      };

      const clientData = {
        name: nombre.trim(),
        contact_name: nombreContacto.trim() || null,
        contact_phone: telefono.trim() || null,
        contact_email: email.trim() || null,
        city: ciudad.trim() || null,
        instagram: instagramHandle.trim().replace(/^@+/, '') || null,
        instagram_connected: false,
        instagram_access_token: null,
        tiktok: tiktokHandle.trim().replace(/^@+/, '') || null,
        facebook: facebookHandle.trim() || null,
        linkedin: linkedinHandle.trim() || null,
        package_id: paqueteSeleccionado || null,
        package_type: packageTypeMap[tipoContratacion],
        contract_months: monthsInType,
        custom_price: precioOverride,
        requires_iva: requiereIVA,
        iva_included: ivaOption === 'incluido',
        total_accumulated: finalPrice,
        start_date: fechaInicio || null,
        end_date: calcularFechaVigencia() || null,
        manager_id: accountManager || null,
        account_status: estatus,
        pay_status: 'pendiente' as const,
        emoji,
        color,
      };

      if (isEditMode) {
        await updateClient(editClient!.id, clientData);
      } else {
        await createClient(clientData);
      }

      resetForm();
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error procesando cliente');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 flex items-center justify-center z-[500] backdrop-blur-lg"
        style={{ backgroundColor: 'rgba(42,31,26,0.45)' }}
        onClick={handleOverlayClick}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="bg-warm-white rounded-3xl max-w-[640px] w-full max-h-[90vh] overflow-y-auto shadow-lg border border-gray-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sticky Header */}
          <div className="sticky top-0 bg-warm-white border-b border-gray-100 px-8 py-6 flex items-center justify-between z-10 rounded-t-3xl">
            <h2 className="text-xl font-fraunces font-bold text-gray-900">
              {isEditMode ? 'Editar cliente' : 'Agregar cliente'}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ml-4"
              style={{
                background: 'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(10px)',
              }}
              aria-label="Cerrar modal"
            >
              <span className="text-xl text-gray-600">×</span>
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-8 space-y-8">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Section: Información de marca */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                Información de marca
              </h3>

              <div>
                <label className="form-label">Nombre de la marca</label>
                <input
                  type="text"
                  placeholder="ej. Café Lumière"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Emoji selector</label>
                <div className="grid grid-cols-6 gap-2">
                  {EMOJI_LIST.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setEmoji(em)}
                      className={`h-10 text-2xl rounded-lg border-2 transition-all ${
                        emoji === em
                          ? 'border-rose-500 bg-rose-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Color picker</label>
                  <div className="flex gap-2">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-10 h-10 rounded-lg border-2 transition-all ${
                          color === c ? 'border-gray-900 scale-110' : 'border-gray-200'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="form-label">Hex personalizado</label>
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="#E8D5FF"
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            {/* Section: Contacto */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                Contacto
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Nombre del contacto</label>
                  <input
                    type="text"
                    value={nombreContacto}
                    onChange={(e) => setNombreContacto(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Teléfono</label>
                  <input
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Ciudad</label>
                  <input
                    type="text"
                    value={ciudad}
                    onChange={(e) => setCiudad(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            {/* Section: Redes sociales */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                Redes sociales
              </h3>

              <div>
                <label className="form-label">Instagram handle</label>
                <input
                  type="text"
                  placeholder="@username"
                  value={instagramHandle}
                  onChange={(e) => setInstagramHandle(e.target.value)}
                  className="form-input"
                />
              </div>

              <div>
                <button
                  type="button"
                  disabled
                  title="Próximamente"
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-100 text-gray-500 font-medium text-sm cursor-not-allowed border border-gray-200"
                >
                  Conectar cuenta IG
                </button>
                <p className="text-xs text-gray-500 mt-1">Próximamente</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="form-label">TikTok</label>
                  <input
                    type="text"
                    placeholder="@username"
                    value={tiktokHandle}
                    onChange={(e) => setTiktokHandle(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Facebook</label>
                  <input
                    type="text"
                    placeholder="@username"
                    value={facebookHandle}
                    onChange={(e) => setFacebookHandle(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">LinkedIn</label>
                  <input
                    type="text"
                    placeholder="@username"
                    value={linkedinHandle}
                    onChange={(e) => setLinkedinHandle(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            {/* Section: Paquete y facturación */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                Paquete y facturación
              </h3>

              <div>
                <label className="form-label">Paquete</label>
                <select
                  value={paqueteSeleccionado}
                  onChange={(e) => {
                    setPaqueteSeleccionado(e.target.value);
                    setPrecioOverride(null);
                  }}
                  className="form-select"
                >
                  <option value="">Seleccionar paquete</option>
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} - ${pkg.price} {pkg.currency}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Precio base</label>
                  <input
                    type="number"
                    value={precioOverride !== null ? precioOverride : selectedPackage?.price || ''}
                    onChange={(e) => setPrecioOverride(e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="0"
                    className="form-input"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="form-label">Tipo de contratación</label>
                  <select
                    value={tipoContratacion}
                    onChange={(e) => setTipoContratacion(e.target.value as ContractType)}
                    className="form-select"
                  >
                    <option value="Mensual">Mensual</option>
                    <option value="Trimestral">Trimestral</option>
                    <option value="Semestral">Semestral</option>
                    <option value="Anual">Anual</option>
                  </select>
                </div>
              </div>

              {/* Pricing breakdown card */}
              {selectedPackage && (
                <div className="glass-card p-4 space-y-2 bg-white/30">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Precio base del paquete:</span>
                    <span className="font-medium">${precioBase.toLocaleString('es-MX', { maximumFractionDigits: 2 })}</span>
                  </div>
                  {descuentoAplicado > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Descuento ({descuentoAplicado}%):</span>
                      <span className="font-medium text-green-600">-${descuentoMonto.toLocaleString('es-MX', { maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-medium">
                    <span>Pago mensual:</span>
                    <span>${pagoMensual.toLocaleString('es-MX', { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Período ({monthsInType} {monthsInType === 1 ? 'mes' : 'meses'}):</span>
                    <span className="font-medium">${totalContrato.toLocaleString('es-MX', { maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Fecha de inicio</label>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Fecha de vigencia</label>
                  <input
                    type="date"
                    value={fechaVigencia || calcularFechaVigencia()}
                    onChange={(e) => setFechaVigencia(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              {/* IVA Section */}
              <div className="space-y-3 border-t border-gray-200 pt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requiereIVA}
                    onChange={(e) => {
                      setRequiereIVA(e.target.checked);
                      if (e.target.checked) setShowIVAPopup(true);
                    }}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm font-medium text-gray-900">
                    ¿El cliente requiere factura con IVA?
                  </span>
                </label>

                {requiereIVA && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                    <p className="text-sm font-medium text-gray-900">¿El precio ya incluye IVA o se suma 16% extra?</p>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="iva-option"
                          value="incluido"
                          checked={ivaOption === 'incluido'}
                          onChange={() => setIvaOption('incluido')}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-gray-700">El precio ya incluye IVA</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="iva-option"
                          value="sumado"
                          checked={ivaOption === 'sumado'}
                          onChange={() => setIvaOption('sumado')}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-gray-700">Sumar 16% extra</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Final Summary Card */}
              <div className="glass-card p-4 bg-white/50 space-y-2 border border-gray-200">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Resumen de pago</p>
                <div className="flex justify-between text-sm font-medium">
                  <span>Pago mensual:</span>
                  <span>${pagoMensual.toLocaleString('es-MX', { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span>Total del contrato ({tipoContratacion.toLowerCase()}):</span>
                  <span>${finalPrice.toLocaleString('es-MX', { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="text-xs text-gray-600">
                  {requiereIVA
                    ? ivaOption === 'incluido'
                      ? 'Precio con IVA incluido'
                      : 'IVA 16% sumado al total'
                    : 'Sin IVA'}
                </div>
              </div>
            </div>

            {/* Section: Status */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                Status
              </h3>

              <div>
                <label className="form-label">Account Manager</label>
                <select
                  value={accountManager}
                  onChange={(e) => setAccountManager(e.target.value)}
                  className="form-select"
                >
                  <option value="">Seleccionar gerente</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name || member.id}
                    </option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          {/* Sticky Footer */}
          <div className="sticky bottom-0 bg-warm-white border-t border-gray-100 px-8 py-4 flex gap-3 z-10">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-rose-deep rounded-lg hover:bg-rose-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Procesando...' : isEditMode ? 'Guardar cambios' : 'Agregar cliente'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
