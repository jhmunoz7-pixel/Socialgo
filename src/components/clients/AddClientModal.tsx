'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/hooks';
import { Package, Member, AccountStatus } from '@/types';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void; // callback to refetch clients
  packages: Package[]; // available packages to select
  members: Member[]; // available account managers
}

export const AddClientModal: React.FC<AddClientModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  packages,
  members,
}) => {
  const [nombre, setNombre] = useState('');
  const [contacto, setContacto] = useState('');
  const [email, setEmail] = useState('');
  const [paquete, setPaquete] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [accountManager, setAccountManager] = useState('');
  const [estatus, setEstatus] = useState<AccountStatus>('onboarding');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    // Validate required field
    if (!nombre.trim()) {
      setError('El nombre de la marca es requerido');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await createClient({
        name: nombre.trim(),
        contact_name: contacto.trim() || null,
        contact_email: email.trim() || null,
        package_id: paquete || null,
        start_date: fechaInicio || null,
        manager_id: accountManager || null,
        account_status: estatus,
        emoji: '🎯',
        color: '#E8D5FF',
        mrr: 0,
        mrr_currency: 'USD',
        pay_status: 'pendiente',
      });

      // Reset form
      setNombre('');
      setContacto('');
      setEmail('');
      setPaquete('');
      setFechaInicio('');
      setAccountManager('');
      setEstatus('onboarding');

      // Call callback to refetch clients
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating client');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 flex items-center justify-center z-500 backdrop-blur-lg"
        style={{
          backgroundColor: 'rgba(42,31,26,0.45)',
        }}
        onClick={handleOverlayClick}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Container */}
        <div
          className="bg-warm-white rounded-3xl max-w-[560px] w-full max-h-[90vh] overflow-y-auto shadow-lg border border-gray-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="sticky top-0 bg-warm-white border-b border-gray-100 px-8 py-6 flex items-center justify-between z-10 rounded-t-3xl">
            <h2 className="text-xl font-fraunces font-bold text-gray-900">
              Agregar cliente
            </h2>

            {/* Close Button */}
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
          <div className="p-8 space-y-6">
            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Form Grid - 2 Columns */}
            <div className="grid grid-cols-2 gap-4">
              {/* Nombre de la marca - Full Width */}
              <div className="col-span-2">
                <label className="form-label">Nombre de la marca</label>
                <input
                  type="text"
                  placeholder="ej. Café Lumière"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="form-input"
                />
              </div>

              {/* Contacto principal */}
              <div>
                <label className="form-label">Contacto principal</label>
                <input
                  type="text"
                  value={contacto}
                  onChange={(e) => setContacto(e.target.value)}
                  className="form-input"
                />
              </div>

              {/* Email */}
              <div>
                <label className="form-label">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                />
              </div>

              {/* Paquete */}
              <div>
                <label className="form-label">Paquete</label>
                <select
                  value={paquete}
                  onChange={(e) => setPaquete(e.target.value)}
                  className="form-select"
                >
                  <option value="">Seleccionar paquete</option>
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fecha de inicio */}
              <div>
                <label className="form-label">Fecha de inicio</label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="form-input"
                />
              </div>

              {/* Account Manager */}
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

              {/* Estatus inicial - Full Width */}
              <div className="col-span-2">
                <label className="form-label">Estatus inicial</label>
                <select
                  value={estatus}
                  onChange={(e) => setEstatus(e.target.value as AccountStatus)}
                  className="form-select"
                >
                  <option value="onboarding">Onboarding</option>
                  <option value="activo">Activo</option>
                  <option value="pausado">Pausado</option>
                </select>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-100">
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
                {loading ? 'Agregando...' : 'Agregar cliente'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
