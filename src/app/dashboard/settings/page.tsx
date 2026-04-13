'use client';

import { useState, useEffect } from 'react';
import { useOrganization, useMembers, useCurrentUser } from '@/lib/hooks';
import { usePermissions, getRoleLabel, getRoleColor, Permission, getPermissionLabel } from '@/lib/permissions';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import { MemberRole, Organization } from '@/types';

// ============================================================================
// PERMISSION MATRIX FOR DISPLAY
// ============================================================================

const ALL_ROLES: MemberRole[] = ['owner', 'admin', 'member', 'creative', 'client_viewer'];

const ALL_PERMISSIONS: Permission[] = [
  'manage_organization',
  'manage_billing',
  'manage_members',
  'manage_packages',
  'view_all_clients',
  'manage_clients',
  'create_posts',
  'edit_posts',
  'delete_posts',
  'approve_posts',
  'view_posts',
  'view_reports',
  'use_ai_studio',
  'manage_brand_kits',
  'view_brand_kits',
  'comment_on_posts',
];

const PERMISSION_MATRIX: Record<MemberRole, Permission[]> = {
  owner: [
    'manage_organization', 'manage_billing', 'manage_members', 'manage_packages',
    'view_all_clients', 'manage_clients', 'create_posts', 'edit_posts',
    'delete_posts', 'approve_posts', 'view_posts', 'view_reports',
    'use_ai_studio', 'manage_brand_kits', 'view_brand_kits', 'comment_on_posts',
  ],
  admin: [
    'manage_billing', 'manage_members', 'manage_packages', 'view_all_clients',
    'manage_clients', 'create_posts', 'edit_posts', 'delete_posts',
    'approve_posts', 'view_posts', 'view_reports', 'use_ai_studio',
    'manage_brand_kits', 'view_brand_kits', 'comment_on_posts',
  ],
  member: [
    'view_all_clients', 'manage_clients', 'create_posts', 'edit_posts',
    'delete_posts', 'approve_posts', 'view_posts', 'view_reports',
    'use_ai_studio', 'manage_brand_kits', 'view_brand_kits', 'comment_on_posts',
  ],
  creative: [
    'view_all_clients', 'create_posts', 'edit_posts', 'view_posts',
    'use_ai_studio', 'manage_brand_kits', 'view_brand_kits', 'comment_on_posts',
  ],
  client_viewer: [
    'view_posts', 'view_brand_kits', 'comment_on_posts',
  ],
};

function hasPermission(role: MemberRole, permission: Permission): boolean {
  return PERMISSION_MATRIX[role]?.includes(permission) ?? false;
}

// ============================================================================
// TAB: AGENCIA (Organization Settings)
// ============================================================================

interface AgenciaTabProps {
  org: Organization | null;
  orgLoading: boolean;
  refetchOrg: () => Promise<void>;
  canManage: boolean;
}

function AgenciaTab({ org, orgLoading, refetchOrg, canManage }: AgenciaTabProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    website: '',
    timezone: 'UTC',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (org) {
      setFormData({
        name: org.name || '',
        email: org.email || '',
        phone: org.phone || '',
        website: org.website || '',
        timezone: org.timezone || 'UTC',
      });
    }
  }, [org]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!org) return;

    setIsSaving(true);
    setSaveMessage('');

    try {
      const supabase = createSupabaseClient();
      const { error } = await supabase
        .from('organizations')
        .update({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          website: formData.website,
          timezone: formData.timezone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', org.id);

      if (error) throw error;

      setSaveMessage('Cambios guardados exitosamente');
      setTimeout(() => setSaveMessage(''), 3000);
      await refetchOrg();
    } catch (error) {
      console.error('Error saving organization:', error);
      setSaveMessage('Error al guardar cambios');
    } finally {
      setIsSaving(false);
    }
  };

  if (orgLoading || !org) {
    return <div className="text-center text-text/60">Cargando información de agencia...</div>;
  }

  if (!canManage) {
    return (
      <div className="space-y-6">
        <div className="glass-card p-8 rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 shadow-lg">
          <p className="text-text/60 mb-6">No tienes permisos para gestionar la organización.</p>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-text/70 mb-1">Nombre</p>
              <p className="text-lg font-medium text-text">{org.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-text/70 mb-1">Email</p>
                <p className="text-text">{org.email || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-text/70 mb-1">Teléfono</p>
                <p className="text-text">{org.phone || '—'}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-text/70 mb-1">Sitio Web</p>
              <p className="text-text">{org.website || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-text/70 mb-1">Zona Horaria</p>
              <p className="text-text">{org.timezone}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-8 rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 shadow-lg">
      <h2 className="text-2xl font-serif font-bold text-text mb-6">Configuración de Agencia</h2>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-text mb-2">Nombre de Agencia</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="w-full px-4 py-2 rounded-lg bg-white/50 border border-white/30 text-text placeholder-text/40 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-2">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className="w-full px-4 py-2 rounded-lg bg-white/50 border border-white/30 text-text placeholder-text/40 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text mb-2">Teléfono</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="w-full px-4 py-2 rounded-lg bg-white/50 border border-white/30 text-text placeholder-text/40 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">Sitio Web</label>
            <input
              type="url"
              name="website"
              value={formData.website}
              onChange={handleInputChange}
              className="w-full px-4 py-2 rounded-lg bg-white/50 border border-white/30 text-text placeholder-text/40 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-2">Zona Horaria</label>
          <select
            name="timezone"
            value={formData.timezone}
            onChange={handleInputChange}
            className="w-full px-4 py-2 rounded-lg bg-white/50 border border-white/30 text-text focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
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

        <div className="pt-4 border-t border-white/20">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-text/70 mb-1">Plan Actual</p>
              <span
                className="inline-block px-3 py-1 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: org.plan === 'full_access' ? '#E8D5FF' : org.plan === 'pro' ? '#FFD4B8' : '#F3F4F6',
                  color: org.plan === 'full_access' ? '#6B21A8' : org.plan === 'pro' ? '#92400E' : '#374151',
                }}
              >
                {org.plan === 'free' ? 'Gratuito' : org.plan === 'pro' ? 'Pro' : 'Acceso Completo'}
              </span>
            </div>
            <div>
              <p className="text-sm text-text/70 mb-1">Límite de Clientes</p>
              <p className="text-lg font-medium text-text">{org.client_limit}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 rounded-lg font-medium text-white transition-all duration-200 disabled:opacity-50"
          style={{
            background: isSaving ? '#ccc' : `var(--gradient)`,
          }}
        >
          {isSaving ? 'Guardando...' : 'Guardar cambios'}
        </button>
        {saveMessage && <p className="text-sm font-medium text-green-600">{saveMessage}</p>}
      </div>
    </div>
  );
}

// ============================================================================
// TAB: EQUIPO (Team Management)
// ============================================================================

interface EquipoTabProps {
  members: any[];
  membersLoading: boolean;
  canManageMembers: boolean;
  refetchMembers: () => Promise<void>;
  orgId: string | null;
}

function EquipoTab({ members, membersLoading, canManageMembers, refetchMembers, orgId }: EquipoTabProps) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<MemberRole>('member');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [deletingMember, setDeletingMember] = useState<string | null>(null);

  const handleInvite = async () => {
    if (!inviteEmail || !orgId) return;

    setIsInviting(true);
    setInviteMessage(null);

    try {
      const supabase = createSupabaseClient();

      // First check if a user with this email already exists in profiles
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', inviteEmail.trim().toLowerCase())
        .maybeSingle();

      if (existingProfile) {
        // User exists — check if already a member of this org
        const { data: existingMember } = await supabase
          .from('members')
          .select('id')
          .eq('org_id', orgId)
          .eq('user_id', existingProfile.id)
          .maybeSingle();

        if (existingMember) {
          setInviteMessage({ type: 'error', text: 'Este usuario ya es miembro de tu organización.' });
          return;
        }

        // Add existing user to org
        const { error: memberError } = await supabase
          .from('members')
          .insert({
            org_id: orgId,
            user_id: existingProfile.id,
            role: inviteRole,
            full_name: inviteName.trim() || null,
          });

        if (memberError) throw memberError;

        setInviteMessage({ type: 'success', text: `${inviteEmail} agregado como ${getRoleLabel(inviteRole)}.` });
      } else {
        // User doesn't exist — create a placeholder member and show signup instructions
        // We'll use Supabase signUp to create the account, then update the member
        const tempPassword = `Temp${Math.random().toString(36).slice(2, 10)}!`;
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: inviteEmail.trim().toLowerCase(),
          password: tempPassword,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: {
              full_name: inviteName.trim() || null,
            },
          },
        });

        if (signUpError) throw signUpError;

        if (signUpData.user) {
          // Update the auto-created member to belong to THIS org with the right role
          // The trigger created a member in a new auto-org, so we need to update it
          const { error: updateError } = await supabase
            .from('members')
            .update({ org_id: orgId, role: inviteRole, full_name: inviteName.trim() || null })
            .eq('user_id', signUpData.user.id);

          if (updateError) throw updateError;
        }

        setInviteMessage({
          type: 'success',
          text: `Invitación enviada a ${inviteEmail}. El usuario recibirá un email para confirmar su cuenta.`,
        });
      }

      setInviteEmail('');
      setInviteName('');
      setInviteRole('member');
      await refetchMembers();
    } catch (err: unknown) {
      console.error('Error inviting member:', err);
      const message = err instanceof Error ? err.message : 'Error al invitar miembro';
      setInviteMessage({ type: 'error', text: message });
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: MemberRole) => {
    setUpdatingRole(memberId);
    try {
      const supabase = createSupabaseClient();
      const { error } = await supabase
        .from('members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;
      await refetchMembers();
    } catch (err: unknown) {
      console.error('Error updating role:', err);
      const message = err instanceof Error ? err.message : 'Error al cambiar rol';
      alert(message);
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleDeleteMember = async (memberId: string, memberName: string | null) => {
    const displayName = memberName || 'este miembro';
    if (!confirm(`¿Estás seguro de que deseas eliminar a ${displayName} del equipo?`)) return;

    setDeletingMember(memberId);
    try {
      const supabase = createSupabaseClient();
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      await refetchMembers();
    } catch (err: unknown) {
      console.error('Error deleting member:', err);
      const message = err instanceof Error ? err.message : 'Error al eliminar miembro';
      alert(message);
    } finally {
      setDeletingMember(null);
    }
  };

  const getInitials = (name: string | null): string => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Invitation Section */}
      {canManageMembers && (
        <div className="glass-card p-8 rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 shadow-lg">
          <h3 className="text-xl font-serif font-bold text-text mb-4">Agregar miembro</h3>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-text mb-2">Nombre</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Nombre completo"
                  className="w-full px-4 py-2 rounded-lg bg-white/50 border border-white/30 text-text placeholder-text/40 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2">Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="nombre@ejemplo.com"
                  className="w-full px-4 py-2 rounded-lg bg-white/50 border border-white/30 text-text placeholder-text/40 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2">Rol</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as MemberRole)}
                  className="w-full px-4 py-2 rounded-lg bg-white/50 border border-white/30 text-text focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                >
                  <option value="member">Miembro</option>
                  <option value="creative">Creativo</option>
                  <option value="admin">Administrador</option>
                  <option value="client_viewer">Cliente (solo ver)</option>
                </select>
              </div>
            </div>

            {inviteMessage && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  inviteMessage.type === 'success'
                    ? 'bg-green-100/50 text-green-800 border border-green-200/50'
                    : 'bg-red-100/50 text-red-800 border border-red-200/50'
                }`}
              >
                {inviteMessage.text}
              </div>
            )}

            <button
              onClick={handleInvite}
              disabled={!inviteEmail || isInviting}
              className="px-6 py-2 rounded-lg font-medium text-white transition-all duration-200 disabled:opacity-50"
              style={{
                background: inviteEmail && !isInviting ? `var(--gradient)` : '#ccc',
              }}
            >
              {isInviting ? 'Agregando...' : 'Agregar miembro'}
            </button>
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="glass-card p-8 rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 shadow-lg">
        <h3 className="text-xl font-serif font-bold text-text mb-6">
          Miembros del equipo
          {members && members.length > 0 && (
            <span className="text-sm font-normal text-text/50 ml-2">({members.length})</span>
          )}
        </h3>

        <div className="space-y-3">
          {membersLoading ? (
            <p className="text-text/60">Cargando miembros...</p>
          ) : members && members.length > 0 ? (
            members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 rounded-lg bg-white/20 border border-white/30"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center font-semibold text-white"
                    style={{
                      backgroundColor: getRoleColor(member.role),
                    }}
                  >
                    {getInitials(member.full_name)}
                  </div>

                  <div>
                    <p className="font-medium text-text">{member.full_name || 'Usuario sin nombre'}</p>
                    <p className="text-sm text-text/60">{getRoleLabel(member.role)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-text/50">
                    {member.created_at ? new Date(member.created_at).toLocaleDateString('es-MX') : '—'}
                  </span>
                  {canManageMembers && member.role !== 'owner' && (
                    <div className="flex gap-2">
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value as MemberRole)}
                        disabled={updatingRole === member.id}
                        className="px-2 py-1 rounded text-sm bg-white/30 border border-white/30 text-text focus:outline-none text-xs disabled:opacity-50"
                      >
                        <option value="member">Miembro</option>
                        <option value="creative">Creativo</option>
                        <option value="admin">Administrador</option>
                        <option value="client_viewer">Cliente (ver)</option>
                      </select>
                      <button
                        onClick={() => handleDeleteMember(member.id, member.full_name)}
                        disabled={deletingMember === member.id}
                        className="px-2 py-1 rounded text-sm bg-red-500/20 border border-red-300/30 text-red-600 hover:bg-red-500/30 transition-colors text-xs disabled:opacity-50"
                      >
                        {deletingMember === member.id ? '...' : 'Eliminar'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-text/60">No hay miembros en el equipo</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TAB: PERMISOS (Permissions Overview)
// ============================================================================

function PermisosTab() {
  return (
    <div className="glass-card p-8 rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 shadow-lg overflow-x-auto">
      <h2 className="text-2xl font-serif font-bold text-text mb-6">Matriz de Permisos</h2>

      <div className="min-w-full">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left py-2 px-4 text-text font-semibold border-b border-white/20">Permiso</th>
              {ALL_ROLES.map((role) => (
                <th
                  key={role}
                  className="text-center py-2 px-4 text-text font-semibold border-b border-white/20"
                  style={{ minWidth: '120px' }}
                >
                  <div className="text-xs">{getRoleLabel(role)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_PERMISSIONS.map((permission) => (
              <tr key={permission} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                <td className="py-3 px-4 text-text/80">{getPermissionLabel(permission)}</td>
                {ALL_ROLES.map((role) => (
                  <td key={`${permission}-${role}`} className="text-center py-3 px-4">
                    {hasPermission(role, permission) ? (
                      <span className="text-lg">✅</span>
                    ) : (
                      <span className="text-lg text-text/30">❌</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-text/60 mt-6 pt-6 border-t border-white/20">
        Esta tabla muestra todos los permisos disponibles por rol. Los Propietarios tienen acceso completo a todas las
        funciones.
      </p>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function SettingsPage() {
  const { data: org, loading: orgLoading, refetch: refetchOrg } = useOrganization();
  const { data: members, loading: membersLoading, refetch: refetchMembers } = useMembers();
  const { data: _currentUserData } = useCurrentUser();
  const { role: _role, loading: permLoading, can } = usePermissions();

  const [activeTab, setActiveTab] = useState<'agencia' | 'equipo' | 'permisos'>('agencia');

  const canManageOrg = can('manage_organization');
  const canManageMembers = can('manage_members');

  return (
    <div className="space-y-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Sticky Header */}
        <div className="sticky-header sticky top-0 z-50 -mx-8 px-8 pt-7 pb-4" style={{ backgroundColor: 'var(--bg)' }}>
          <h1 className="text-2xl font-serif font-bold" style={{ color: 'var(--text-dark)' }}>⚙️ Configuración</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-mid)' }}>Gestiona tu agencia, equipo y permisos</p>
        </div>

        {permLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-10 rounded-xl" style={{ background: 'var(--glass-border)' }} />
            <div className="h-64 rounded-xl" style={{ background: 'var(--glass-border)' }} />
          </div>
        ) : (
        <>

        {/* Tabs Navigation */}
        <div className="flex gap-2 border-b border-white/20 pb-4">
          {[
            { id: 'agencia', label: 'Agencia' },
            { id: 'equipo', label: 'Equipo' },
            { id: 'permisos', label: 'Permisos' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 rounded-t-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white/20 border-b-2 text-text'
                  : 'text-text/60 hover:text-text/80'
              }`}
              style={
                activeTab === tab.id
                  ? {
                      borderBottomColor: 'var(--primary)',
                    }
                  : {}
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[500px]">
          {activeTab === 'agencia' &&
            (canManageOrg ? (
              <AgenciaTab org={org} orgLoading={orgLoading} refetchOrg={refetchOrg} canManage={true} />
            ) : (
              <div className="glass-card p-8 rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 shadow-lg">
                <p className="text-text/60 mb-6">No tienes permisos para gestionar la agencia.</p>
                {org && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-text/70 mb-1">Nombre</p>
                      <p className="text-lg font-medium text-text">{org.name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-text/70 mb-1">Email</p>
                        <p className="text-text">{org.email || '—'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-text/70 mb-1">Teléfono</p>
                        <p className="text-text">{org.phone || '—'}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-text/70 mb-1">Sitio Web</p>
                      <p className="text-text">{org.website || '—'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-text/70 mb-1">Zona Horaria</p>
                      <p className="text-text">{org.timezone}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}

          {activeTab === 'equipo' &&
            (canManageMembers ? (
              <EquipoTab members={members} membersLoading={membersLoading} canManageMembers={true} refetchMembers={refetchMembers} orgId={org?.id || null} />
            ) : (
              <div className="glass-card p-8 rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 shadow-lg">
                <p className="text-text/60 mb-6">No tienes permisos para gestionar miembros. Aquí está el equipo:</p>
                <EquipoTab members={members} membersLoading={membersLoading} canManageMembers={false} refetchMembers={refetchMembers} orgId={org?.id || null} />
              </div>
            ))}

          {activeTab === 'permisos' && <PermisosTab />}
        </div>
        </>
        )}
      </div>
    </div>
  );
}
