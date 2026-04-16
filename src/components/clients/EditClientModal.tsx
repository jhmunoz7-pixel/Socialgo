'use client';

import React, { useState, useEffect } from 'react';
import { updateClient } from '@/lib/hooks';
import type { Client, Package, Member, AccountStatus, PayStatus, PackageType } from '@/types';

interface EditClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  client: Client | null;
  packages: Package[];
  members: Member[];
}

type ContractType = 'Mensual' | 'Trimestral' | 'Semestral' | 'Anual';

const EMOJI_LIST = ['🎯', '💼', '🛍️', '✨', '🎨', '📸', '💎', '🌟', '🔥', '🌿', '☕', '🍕'];
const PRESET_COLORS = ['#C4B5FD', '#FFE8D5', '#D5E8FF', '#E8FFD5', '#FFD5E8', '#D5FFE8'];

export const EditClientModal: React.FC<EditClientModalProps> = ({
  isOpen,
  onClose,
  onUpdated,
  client,
  packages,
  members,
}) => {
  // Información de marca
  const [nombre, setNombre] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [color, setColor] = useState('#C4B5FD');

  // Contacto
  const [nombreContacto, setNombreContacto] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [ciudad, setCiudad] = useState('');

  // Redes sociales
  const [instagramHandle, setInstagramHandle] = useState('');
  const [tiktokHandle, setTiktokHandle] = useState('');
  const [facebookHandle, setFacebookHandle] = useState('');

  // Paquete
  const [paqueteSeleccionado, setPaqueteSeleccionado] = useState('');
  const [tipoContratacion, setTipoContratacion] = useState<ContractType>('Mensual');
  const [precioOverride, setPrecioOverride] = useState<number | null>(null);

  // Status
  const [accountStatus, setAccountStatus] = useState<AccountStatus>('activo');
  const [payStatus, setPayStatus] = useState<PayStatus>('pagado');
  const [accountManager, setAccountManager] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync form with client prop
  useEffect(() => {
    if (client) {
      setNombre(client.name || '');
      setEmoji(client.emoji || '🎯');
      setColor(client.color || '#C4B5FD');
      setNombreContacto(client.contact_name || '');
      setTelefono(client.contact_phone || '');
      setEmail(client.contact_email || '');
      setCiudad(client.city || '');
      setInstagramHandle(client.instagram || '');
      setTiktokHandle(client.tiktok || '');
      setFacebookHandle(client.facebook || '');
      setPaqueteSeleccionado(client.package_id || '');
      setAccountManager(client.manager_id || '');
      setAccountStatus(client.account_status || 'activo');
      setPayStatus(client.pay_status || 'pagado');

      // Map package_type back to ContractType
      const typeMap: Record<string, ContractType> = {
        monthly: 'Mensual',
        quarterly: 'Trimestral',
        semiannual: 'Semestral',
        annual: 'Anual',
      };
      setTipoContratacion(typeMap[client.package_type] || 'Mensual');
      setPrecioOverride(client.custom_price || null);
    }
  }, [client, isOpen]);

  // Package lookup available if needed for price display
  void packages; // satisfy lint — packages used in select options below

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

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      setError('El nombre de la marca es requerido');
      return;
    }

    if (!client) {
      setError('Cliente no válido');
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
        instagram: instagramHandle.trim() || null,
        tiktok: tiktokHandle.trim() || null,
        facebook: facebookHandle.trim() || null,
        package_id: paqueteSeleccionado || null,
        package_type: packageTypeMap[tipoContratacion],
        custom_price: precioOverride,
        account_status: accountStatus,
        pay_status: payStatus,
        manager_id: accountManager || null,
        emoji,
        color,
      };

      await updateClient(client.id, clientData);

      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error procesando cliente');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !client) return null;

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
              Editar cliente
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
                    placeholder="#C4B5FD"
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

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="form-label">Instagram</label>
                  <input
                    type="text"
                    placeholder="@username"
                    value={instagramHandle}
                    onChange={(e) => setInstagramHandle(e.target.value)}
                    className="form-input"
                  />
                </div>
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
              </div>
            </div>

            {/* Section: Paquete */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                Paquete
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
                  <label className="form-label">Precio personalizado</label>
                  <input
                    type="number"
                    value={precioOverride !== null ? precioOverride : ''}
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
            </div>

            {/* Section: Status */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                Status
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Estatus de cuenta</label>
                  <select
                    value={accountStatus}
                    onChange={(e) => setAccountStatus(e.target.value as AccountStatus)}
                    className="form-select"
                  >
                    <option value="activo">Activo</option>
                    <option value="onboarding">Onboarding</option>
                    <option value="pausado">Pausado</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Estatus de pago</label>
                  <select
                    value={payStatus}
                    onChange={(e) => setPayStatus(e.target.value as PayStatus)}
                    className="form-select"
                  >
                    <option value="pagado">Pagado</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="vencido">Vencido</option>
                  </select>
                </div>
              </div>

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
              {loading ? 'Procesando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
