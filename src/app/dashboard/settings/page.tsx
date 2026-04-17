'use client';

import { useState, useEffect } from 'react';
import { useOrganization, useMembers, useCurrentUser, useClients } from '@/lib/hooks';
import { usePermissions, getRoleLabel, getRoleColor } from '@/lib/permissions';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import { MemberRole, Organization } from '@/types';
import { Settings, Hash, CheckCircle, XCircle, Loader2, Palette, Link2, Unlink } from 'lucide-react';


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

  // Slack integration state
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [isSavingSlack, setIsSavingSlack] = useState(false);
  const [slackSaveMessage, setSlackSaveMessage] = useState('');
  const [isTestingSlack, setIsTestingSlack] = useState(false);
  const [slackTestResult, setSlackTestResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (org) {
      setFormData({
        name: org.name || '',
        email: org.email || '',
        phone: org.phone || '',
        website: org.website || '',
        timezone: org.timezone || 'UTC',
      });
      setSlackWebhookUrl(org.slack_webhook_url || '');
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

  const handleSaveSlack = async () => {
    if (!org) return;
    setIsSavingSlack(true);
    setSlackSaveMessage('');
    try {
      const supabase = createSupabaseClient();
      const { error } = await supabase
        .from('organizations')
        .update({
          slack_webhook_url: slackWebhookUrl.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', org.id);
      if (error) throw error;
      setSlackSaveMessage('Webhook guardado exitosamente');
      setTimeout(() => setSlackSaveMessage(''), 3000);
      await refetchOrg();
    } catch (error) {
      console.error('Error saving Slack webhook:', error);
      setSlackSaveMessage('Error al guardar webhook');
    } finally {
      setIsSavingSlack(false);
    }
  };

  const handleTestSlack = async () => {
    if (!slackWebhookUrl.trim()) return;
    setIsTestingSlack(true);
    setSlackTestResult(null);
    try {
      const res = await fetch('/api/notifications/slack/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhook_url: slackWebhookUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSlackTestResult({ type: 'error', text: data.error || 'Error al probar webhook' });
      } else {
        setSlackTestResult({ type: 'success', text: 'Mensaje de prueba enviado. Revisa tu canal de Slack.' });
      }
    } catch {
      setSlackTestResult({ type: 'error', text: 'Error de conexion al probar webhook' });
    } finally {
      setIsTestingSlack(false);
    }
  };

  return (
    <div className="space-y-6">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  backgroundColor: org.plan === 'full_access' ? '#C4B5FD' : org.plan === 'pro' ? '#C4B5FD' : '#F3F4F6',
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

    {/* Integraciones — Slack */}
    <div className="glass-card p-8 rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 shadow-lg">
      <div className="flex items-center gap-3 mb-2">
        <Hash className="w-5 h-5" style={{ color: 'var(--primary-deep)' }} />
        <h2 className="text-2xl font-serif font-bold text-text">Integraciones</h2>
      </div>
      <p className="text-sm text-text/60 mb-6">Conecta herramientas externas para recibir notificaciones automaticas.</p>

      <div className="space-y-4">
        <div className="p-5 rounded-xl bg-white/20 border border-white/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[#4A154B] flex items-center justify-center">
              <Hash className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-text">Slack</h3>
              <p className="text-xs text-text/60">Recibe notificaciones cuando se crean, aprueban o publican posts.</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-text mb-2">Webhook URL</label>
              <input
                type="url"
                value={slackWebhookUrl}
                onChange={(e) => setSlackWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full px-4 py-2 rounded-lg bg-white/50 border border-white/30 text-text placeholder-text/40 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all text-sm font-mono"
              />
              <p className="text-xs text-text/50 mt-1">
                Crea un webhook en Slack: Apps {'>'} Incoming Webhooks {'>'} Add New Webhook to Workspace
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveSlack}
                disabled={isSavingSlack}
                className="px-5 py-2 rounded-lg font-medium text-white transition-all duration-200 disabled:opacity-50 text-sm"
                style={{
                  background: isSavingSlack ? '#ccc' : 'var(--gradient)',
                }}
              >
                {isSavingSlack ? 'Guardando...' : 'Guardar webhook'}
              </button>

              <button
                onClick={handleTestSlack}
                disabled={isTestingSlack || !slackWebhookUrl.trim()}
                className="px-5 py-2 rounded-lg font-medium text-sm transition-all duration-200 disabled:opacity-50 border"
                style={{
                  borderColor: 'var(--primary)',
                  color: 'var(--primary-deep)',
                  background: 'rgba(255,255,255,0.3)',
                }}
              >
                {isTestingSlack ? (
                  <span className="flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Probando...</span>
                ) : (
                  'Probar conexion'
                )}
              </button>

              {slackSaveMessage && (
                <p className="text-sm font-medium text-green-600">{slackSaveMessage}</p>
              )}
            </div>

            {slackTestResult && (
              <div
                className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                  slackTestResult.type === 'success'
                    ? 'bg-green-100/50 text-green-800 border border-green-200/50'
                    : 'bg-red-100/50 text-red-800 border border-red-200/50'
                }`}
              >
                {slackTestResult.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 flex-shrink-0" />
                )}
                {slackTestResult.text}
              </div>
            )}
          </div>
        </div>
      </div>
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
  const { data: clients } = useClients();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<MemberRole>('creative');
  const [inviteClientIds, setInviteClientIds] = useState<string[]>([]);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [deletingMember, setDeletingMember] = useState<string | null>(null);
  const [resendingInvite, setResendingInvite] = useState<string | null>(null);
  const [editingAssignments, setEditingAssignments] = useState<string | null>(null);
  const [assignmentsByMember, setAssignmentsByMember] = useState<Record<string, string[]>>({});
  const [assignmentDraft, setAssignmentDraft] = useState<string[]>([]);
  const [savingAssignments, setSavingAssignments] = useState(false);

  // Load assignments for all creative members so we can show a summary
  useEffect(() => {
    const creatives = (members || []).filter((m) => m.role === 'creative');
    if (creatives.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        creatives.map(async (m) => {
          try {
            const res = await fetch(`/api/members/${m.id}/clients`);
            if (!res.ok) return [m.id, [] as string[]] as const;
            const json = await res.json();
            return [m.id, (json?.client_ids as string[]) ?? []] as const;
          } catch {
            return [m.id, [] as string[]] as const;
          }
        })
      );
      if (cancelled) return;
      setAssignmentsByMember((prev) => {
        const next = { ...prev };
        for (const [id, ids] of entries) next[id] = ids;
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [members]);

  const toggleClientId = (
    list: string[],
    setter: (ids: string[]) => void,
    id: string
  ) => {
    setter(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const handleInvite = async () => {
    if (!inviteEmail || !orgId) return;

    setIsInviting(true);
    setInviteMessage(null);

    try {
      const res = await fetch('/api/members/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim().toLowerCase(),
          full_name: inviteName.trim() || null,
          role: inviteRole,
          client_ids: inviteRole === 'creative' ? inviteClientIds : [],
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || 'Error al invitar miembro');
      }

      setInviteMessage({
        type: 'success',
        text: json?.invited
          ? `Invitación enviada a ${inviteEmail}. Recibirá un email para definir su contraseña.`
          : `${inviteEmail} fue agregado a tu equipo.`,
      });

      setInviteEmail('');
      setInviteName('');
      setInviteRole('member');
      setInviteClientIds([]);
      await refetchMembers();
    } catch (err: unknown) {
      console.error('Error inviting member:', err);
      const message = err instanceof Error ? err.message : 'Error al invitar miembro';
      setInviteMessage({ type: 'error', text: message });
    } finally {
      setIsInviting(false);
    }
  };

  const openAssignmentsEditor = (memberId: string) => {
    setEditingAssignments(memberId);
    setAssignmentDraft(assignmentsByMember[memberId] ?? []);
  };

  const saveAssignments = async () => {
    if (!editingAssignments) return;
    setSavingAssignments(true);
    try {
      const res = await fetch(`/api/members/${editingAssignments}/clients`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_ids: assignmentDraft }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Error al guardar asignaciones');
      setAssignmentsByMember((prev) => ({
        ...prev,
        [editingAssignments]: assignmentDraft,
      }));
      setEditingAssignments(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al guardar';
      alert(message);
    } finally {
      setSavingAssignments(false);
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

  const handleResendInvite = async (member: { id: string; full_name: string | null }) => {
    setResendingInvite(member.id);
    try {
      const res = await fetch('/api/members/resend-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: member.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al reenviar');
      alert(`Invitación reenviada a ${data.email}`);
    } catch (err: unknown) {
      console.error('Error resending invite:', err);
      const message = err instanceof Error ? err.message : 'Error al reenviar invitación';
      alert(message);
    } finally {
      setResendingInvite(null);
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <option value="creative">Creativo</option>
                  <option value="admin">Administrador</option>
                  <option value="client_viewer">Cliente (solo ver)</option>
                </select>
              </div>
            </div>

            {inviteRole === 'creative' && (
              <div className="p-4 rounded-lg bg-white/30 border border-white/30">
                <label className="block text-sm font-medium text-text mb-1">
                  ¿A qué clientes tendrá acceso?
                </label>
                <p className="text-xs text-text/60 mb-3">
                  El creativo solo verá posts, brand kit y assets de los clientes que marques.
                </p>
                {(!clients || clients.length === 0) ? (
                  <p className="text-xs text-text/50">
                    Aún no tienes clientes. Crea un cliente primero para poder asignarlo.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {clients.map((c) => {
                      const checked = inviteClientIds.includes(c.id);
                      return (
                        <button
                          type="button"
                          key={c.id}
                          onClick={() =>
                            toggleClientId(inviteClientIds, setInviteClientIds, c.id)
                          }
                          className="px-3 py-1.5 rounded-full text-xs transition-all border"
                          style={{
                            background: checked
                              ? 'var(--gradient)'
                              : 'rgba(255,255,255,0.5)',
                            color: checked ? 'white' : 'var(--text)',
                            borderColor: checked
                              ? 'transparent'
                              : 'rgba(255,255,255,0.4)',
                            fontWeight: checked ? 600 : 500,
                          }}
                        >
                          {checked ? '✓ ' : ''}
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

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
            members.map((member) => {
              const assignedIds = assignmentsByMember[member.id] ?? [];
              const assignedClients = (clients || []).filter((c) =>
                assignedIds.includes(c.id)
              );
              const isEditing = editingAssignments === member.id;
              return (
              <div
                key={member.id}
                className="p-4 rounded-lg bg-white/20 border border-white/30 space-y-3"
              >
                <div className="flex items-center justify-between">
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
                        onClick={() => handleResendInvite(member)}
                        disabled={resendingInvite === member.id}
                        className="px-2 py-1 rounded text-sm bg-blue-500/20 border border-blue-300/30 text-blue-600 hover:bg-blue-500/30 transition-colors text-xs disabled:opacity-50"
                        title="Reenviar invitación por email"
                      >
                        {resendingInvite === member.id ? '...' : '📩 Reenviar'}
                      </button>
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

                {member.role === 'creative' && (
                  <div className="pl-16 pr-2">
                    {isEditing ? (
                      <div className="space-y-3">
                        <p className="text-xs text-text/70 font-medium">
                          Elige los clientes visibles para este creativo:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {(clients || []).map((c) => {
                            const checked = assignmentDraft.includes(c.id);
                            return (
                              <button
                                type="button"
                                key={c.id}
                                onClick={() =>
                                  toggleClientId(assignmentDraft, setAssignmentDraft, c.id)
                                }
                                className="px-3 py-1.5 rounded-full text-xs transition-all border"
                                style={{
                                  background: checked
                                    ? 'var(--gradient)'
                                    : 'rgba(255,255,255,0.5)',
                                  color: checked ? 'white' : 'var(--text)',
                                  borderColor: checked
                                    ? 'transparent'
                                    : 'rgba(255,255,255,0.4)',
                                  fontWeight: checked ? 600 : 500,
                                }}
                              >
                                {checked ? '✓ ' : ''}
                                {c.name}
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={saveAssignments}
                            disabled={savingAssignments}
                            className="px-4 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-50"
                            style={{ background: 'var(--gradient)' }}
                          >
                            {savingAssignments ? 'Guardando...' : 'Guardar acceso'}
                          </button>
                          <button
                            onClick={() => setEditingAssignments(null)}
                            disabled={savingAssignments}
                            className="px-4 py-1.5 rounded-lg text-xs bg-white/40 border border-white/40 text-text"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-xs text-text/60">Acceso a:</span>
                        {assignedClients.length === 0 ? (
                          <span className="text-xs text-text/50 italic">
                            Sin clientes asignados (no verá ningún cliente)
                          </span>
                        ) : (
                          assignedClients.map((c) => (
                            <span
                              key={c.id}
                              className="px-2 py-0.5 rounded-full text-xs bg-white/50 border border-white/30 text-text"
                            >
                              {c.name}
                            </span>
                          ))
                        )}
                        {canManageMembers && (
                          <button
                            onClick={() => openAssignmentsEditor(member.id)}
                            className="ml-auto px-3 py-1 rounded-lg text-xs bg-white/50 border border-white/40 text-text hover:bg-white/70 transition"
                          >
                            Editar acceso
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              );
            })
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


// ============================================================================
// MAIN PAGE
// ============================================================================

export default function SettingsPage() {
  const { data: org, loading: orgLoading, refetch: refetchOrg } = useOrganization();
  const { data: members, loading: membersLoading, refetch: refetchMembers } = useMembers();
  const { data: _currentUserData } = useCurrentUser();
  const { role: _role, loading: permLoading, can } = usePermissions();

  const [activeTab, setActiveTab] = useState<'agencia' | 'equipo' | 'integraciones'>('agencia');

  // Respect ?tab=integraciones deep-links (used by the Canva OAuth callback)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'integraciones' || tab === 'equipo' || tab === 'agencia') {
      setActiveTab(tab);
    }
  }, []);

  const canManageOrg = can('manage_organization');
  const canManageMembers = can('manage_members');

  return (
    <div className="space-y-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Sticky Header */}
        <div className="sticky-header sticky top-0 z-50 -mx-8 px-8 pt-7 pb-4" style={{ backgroundColor: 'var(--bg)' }}>
          <h1 className="text-2xl font-serif font-bold flex items-center gap-2" style={{ color: 'var(--text-dark)' }}><Settings className="w-5 h-5" style={{ color: 'var(--primary-deep)' }} /> Configuración</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-mid)' }}>Gestiona tu agencia y equipo</p>
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
            { id: 'integraciones', label: 'Integraciones' },
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

          {activeTab === 'integraciones' && <IntegracionesTab />}

        </div>
        </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// INTEGRACIONES TAB
// ============================================================================

interface CanvaStatus {
  configured: boolean;
  connected: boolean;
  displayName: string | null;
  canvaUserId: string | null;
  expiresAt: string | null;
  updatedAt: string | null;
  scope: string | null;
}

function IntegracionesTab() {
  const [status, setStatus] = useState<CanvaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/canva/auth/status', { cache: 'no-store' });
      const body = await res.json();
      if (res.ok) setStatus(body);
    } catch (err) {
      console.error('Error loading Canva status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    // Read query string set by the OAuth callback redirect
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const canva = params.get('canva');
      if (canva === 'connected') {
        setMessage({ type: 'success', text: 'Canva conectado correctamente.' });
      } else if (canva === 'error') {
        const reason = params.get('reason') || 'unknown';
        setMessage({ type: 'error', text: `No se pudo conectar con Canva (${reason}).` });
      }
    }
  }, []);

  const handleConnect = () => {
    window.location.href = '/api/canva/auth/authorize';
  };

  const handleDisconnect = async () => {
    if (!confirm('¿Desconectar tu cuenta de Canva? Los diseños ya sincronizados se conservan.')) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/canva/auth/disconnect', { method: 'POST' });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Canva desconectado.' });
        await loadStatus();
      } else {
        const body = await res.json();
        setMessage({ type: 'error', text: body.error || 'Error al desconectar.' });
      }
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <div
          className="p-3 rounded-xl text-sm"
          style={{
            background: message.type === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
            border: message.type === 'success' ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(239,68,68,0.25)',
            color: message.type === 'success' ? '#047857' : '#991B1B',
          }}
        >
          {message.text}
        </div>
      )}

      {/* Canva card */}
      <div
        className="rounded-2xl p-6"
        style={{ background: 'white', border: '1px solid var(--glass-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)' }}
          >
            <Palette className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-semibold" style={{ color: 'var(--text-dark)' }}>Canva</h3>
              {loading ? null : status?.connected ? (
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{ background: '#ECFDF5', color: '#047857' }}
                >
                  <CheckCircle className="w-3 h-3" /> Conectado
                </span>
              ) : (
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: '#F1F5F9', color: 'var(--text-mid)' }}
                >
                  Sin conectar
                </span>
              )}
            </div>
            <p className="text-sm" style={{ color: 'var(--text-mid)' }}>
              Conecta tu cuenta para sincronizar páginas de tus diseños y verlas en el calendario.
            </p>

            {!loading && !status?.configured && (
              <div
                className="mt-3 p-3 rounded-xl text-xs"
                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#92400E' }}
              >
                El administrador debe configurar <b>CANVA_CLIENT_ID</b>, <b>CANVA_CLIENT_SECRET</b> y <b>CANVA_REDIRECT_URI</b> en el servidor antes de que los usuarios puedan conectar.
              </div>
            )}

            {!loading && status?.connected && (
              <div
                className="mt-3 p-3 rounded-xl text-xs"
                style={{ background: '#F8FAFC', border: '1px solid var(--glass-border)', color: 'var(--text-mid)' }}
              >
                <p>
                  Conectado como <b style={{ color: 'var(--text-dark)' }}>{status.displayName || status.canvaUserId || 'Cuenta Canva'}</b>
                </p>
                {status.expiresAt && (
                  <p className="mt-1">Token válido hasta {new Date(status.expiresAt).toLocaleString('es-MX')}.</p>
                )}
              </div>
            )}

            <div className="flex gap-2 mt-4">
              {loading ? (
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-light)' }}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando…
                </div>
              ) : status?.connected ? (
                <button
                  onClick={handleDisconnect}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg text-sm font-medium border hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1.5"
                  style={{ borderColor: 'var(--glass-border)', color: 'var(--text-dark)' }}
                >
                  <Unlink className="w-3.5 h-3.5" />
                  {actionLoading ? 'Desconectando…' : 'Desconectar'}
                </button>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={!status?.configured}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white shadow-sm hover:shadow-md transition-shadow disabled:opacity-50 flex items-center gap-1.5"
                  style={{ background: 'linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)' }}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Conectar Canva
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs" style={{ color: 'var(--text-light)' }}>
        Más integraciones (Slack, Instagram, Facebook) disponibles en la pestaña de Agencia o próximamente aquí.
      </p>
    </div>
  );
}
