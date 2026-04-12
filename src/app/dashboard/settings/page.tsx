'use client';

import { useState } from 'react';
import { useOrganization, useMembers } from '@/lib/hooks';

export default function SettingsPage() {
  const { data: org, loading: orgLoading, error: orgError, refetch: refetchOrg } = useOrganization();
  const { data: members, loading: membersLoading } = useMembers();

  const [formData, setFormData] = useState({
    name: org?.name || '',
    slug: org?.slug || '',
    email: org?.email || '',
    phone: org?.phone || '',
    website: org?.website || '',
    timezone: org?.timezone || 'UTC',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      // API call would go here
      setSaveMessage('Cambios guardados exitosamente');
      setTimeout(() => setSaveMessage(''), 3000);
      refetchOrg();
    } catch (error) {
      setSaveMessage('Error al guardar cambios');
    } finally {
      setIsSaving(false);
    }
  };

  if (orgLoading || !org) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream via-lavender to-peach p-8">
        <div className="text-center text-text">Cargando configuración...</div>
      </div>
    );
  }

  const getRoleBadge = (role: string) => {
    const roleColors: Record<string, string> = {
      owner: 'bg-rose/20 text-rose-deep border border-rose-deep/30',
      admin: 'bg-peach/20 text-orange-700 border border-peach/30',
      member: 'bg-lavender/20 text-purple-700 border border-lavender/30',
    };
    return roleColors[role] || roleColors.member;
  };

  const getPlanBadge = () => {
    const planColors: Record<string, string> = {
      free: 'bg-gray-100 text-gray-700',
      pro: 'bg-rose/20 text-rose-deep',
      full_access: 'bg-lavender/20 text-purple-700',
    };
    const planLabels: Record<string, string> = {
      free: 'Gratuito',
      pro: 'Pro',
      full_access: 'Acceso Completo',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${planColors[org.plan] || planColors.free}`}>
        {planLabels[org.plan] || org.plan}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream via-lavender to-peach p-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-text mb-2">Mi Agencia</h1>
          <p className="text-text/70">Gestiona tu cuenta y configuración de equipo</p>
        </div>

        {/* Organization Info Section */}
        <div className="glass-card p-8 rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 shadow-lg">
          <h2 className="text-2xl font-serif font-bold text-text mb-6">Información de la Agencia</h2>

          <div className="space-y-5">
            <div>
              <label className="form-label block text-sm font-medium text-text mb-2">
                Nombre de Agencia
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="form-input w-full px-4 py-2 rounded-lg bg-white/50 border border-rose/30 text-text placeholder-text/40 focus:outline-none focus:ring-2 focus:ring-rose-deep"
              />
            </div>

            <div>
              <label className="form-label block text-sm font-medium text-text mb-2">
                Slug (URL)
              </label>
              <input
                type="text"
                name="slug"
                value={formData.slug}
                onChange={handleInputChange}
                className="form-input w-full px-4 py-2 rounded-lg bg-white/50 border border-rose/30 text-text placeholder-text/40 focus:outline-none focus:ring-2 focus:ring-rose-deep"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label block text-sm font-medium text-text mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleInputChange}
                  className="form-input w-full px-4 py-2 rounded-lg bg-white/50 border border-rose/30 text-text placeholder-text/40 focus:outline-none focus:ring-2 focus:ring-rose-deep"
                />
              </div>
              <div>
                <label className="form-label block text-sm font-medium text-text mb-2">
                  Teléfono
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleInputChange}
                  className="form-input w-full px-4 py-2 rounded-lg bg-white/50 border border-rose/30 text-text placeholder-text/40 focus:outline-none focus:ring-2 focus:ring-rose-deep"
                />
              </div>
            </div>

            <div>
              <label className="form-label block text-sm font-medium text-text mb-2">
                Sitio Web
              </label>
              <input
                type="url"
                name="website"
                value={formData.website || ''}
                onChange={handleInputChange}
                className="form-input w-full px-4 py-2 rounded-lg bg-white/50 border border-rose/30 text-text placeholder-text/40 focus:outline-none focus:ring-2 focus:ring-rose-deep"
              />
            </div>

            <div>
              <label className="form-label block text-sm font-medium text-text mb-2">
                Zona Horaria
              </label>
              <select
                name="timezone"
                value={formData.timezone}
                onChange={handleInputChange}
                className="form-input w-full px-4 py-2 rounded-lg bg-white/50 border border-rose/30 text-text focus:outline-none focus:ring-2 focus:ring-rose-deep"
              >
                <option value="UTC">UTC</option>
                <option value="America/Mexico_City">México</option>
                <option value="America/Los_Angeles">Pacific</option>
                <option value="America/New_York">Eastern</option>
                <option value="Europe/London">London</option>
                <option value="Europe/Madrid">Madrid</option>
                <option value="Asia/Tokyo">Tokyo</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 rounded-lg font-medium text-white transition-all duration-200 disabled:opacity-50"
              style={{
                background: isSaving ? '#ccc' : 'linear-gradient(135deg, #FF8FAD 0%, #FFBA8A 100%)',
              }}
            >
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
            {saveMessage && (
              <p className="text-sm font-medium text-green-600">{saveMessage}</p>
            )}
          </div>
        </div>

        {/* Team Section */}
        <div className="glass-card p-8 rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-serif font-bold text-text">Equipo</h2>
            <button
              className="px-4 py-2 rounded-lg font-medium text-white text-sm transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, #FF8FAD 0%, #FFBA8A 100%)',
              }}
            >
              Invitar miembro
            </button>
          </div>

          <div className="space-y-3">
            {membersLoading ? (
              <p className="text-text/60">Cargando miembros...</p>
            ) : members && members.length > 0 ? (
              members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-white/20 border border-white/30"
                >
                  <div>
                    <p className="font-medium text-text">{member.name || member.email}</p>
                    <p className="text-sm text-text/60">{member.email}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadge(member.role)}`}>
                    {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-text/60">No hay miembros en el equipo</p>
            )}
          </div>
        </div>

        {/* Plan & Billing Section */}
        <div className="glass-card p-8 rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 shadow-lg">
          <h2 className="text-2xl font-serif font-bold text-text mb-6">Plan y Facturación</h2>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-text/70 mb-2">Plan Actual</p>
              {getPlanBadge()}
            </div>
            <div>
              <p className="text-sm text-text/70 mb-2">Ciclo de Facturación</p>
              <p className="text-lg font-medium text-text capitalize">
                {org.billing_cycle === 'monthly' ? 'Mensual' : org.billing_cycle === 'quarterly' ? 'Trimestral' : 'Anual'}
              </p>
            </div>
            <div>
              <p className="text-sm text-text/70 mb-2">Límite de Clientes</p>
              <p className="text-lg font-medium text-text">{org.client_limit}</p>
            </div>
            <div>
              <p className="text-sm text-text/70 mb-2">Estado de Suscripción</p>
              <p className="text-lg font-medium text-text capitalize">{org.plan_status}</p>
            </div>
          </div>

          <button
            className="mt-6 px-4 py-2 rounded-lg font-medium text-white text-sm transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, #FF8FAD 0%, #FFBA8A 100%)',
            }}
          >
            Ir al Portal de Facturación
          </button>
        </div>

        {/* Danger Zone */}
        <div className="glass-card p-8 rounded-2xl backdrop-blur-md bg-red-50/10 border border-red-200/30 shadow-lg">
          <h2 className="text-2xl font-serif font-bold text-red-700 mb-4">Zona de Peligro</h2>
          <p className="text-sm text-text/70 mb-4">
            Esta acción es irreversible. Cancela tu suscripción y pierde acceso a todos los servicios.
          </p>
          <button className="px-4 py-2 rounded-lg font-medium text-white text-sm bg-red-600 hover:bg-red-700 transition-colors">
            Cancelar Suscripción
          </button>
        </div>

      </div>
    </div>
  );
}
