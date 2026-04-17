'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, Trash2, Save, RefreshCw, CheckCircle2, AlertCircle, Camera } from 'lucide-react';
import type { SocialConnection } from '@/types';
import { MetaConnectWizard } from './MetaConnectWizard';

interface ConnectionSetupProps {
  clientId: string;
}

interface ConnectionDisplay {
  id: string;
  platform: 'instagram' | 'facebook';
  page_id: string | null;
  page_name: string | null;
  access_token: string; // masked
  token_expires_at: string | null;
  connected: boolean;
}

const PLATFORMS: { key: 'instagram' | 'facebook'; label: string; color: string; icon: React.ReactNode }[] = [
  { key: 'instagram', label: 'Instagram', color: '#E1306C', icon: <Camera className="w-4 h-4" /> },
  { key: 'facebook', label: 'Facebook', color: '#1877F2', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
];

export function ConnectionSetup({ clientId }: ConnectionSetupProps) {
  const [connections, setConnections] = useState<ConnectionDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ platform: string; valid: boolean } | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state per platform
  const [forms, setForms] = useState<Record<string, { access_token: string; page_id: string; page_name: string }>>({
    instagram: { access_token: '', page_id: '', page_name: '' },
    facebook: { access_token: '', page_id: '', page_name: '' },
  });

  const fetchConnections = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/social-connections?client_id=${clientId}`);
      const data = await res.json();
      if (data.success && data.data) {
        const mapped: ConnectionDisplay[] = data.data.map((c: SocialConnection & { access_token: string }) => ({
          id: c.id,
          platform: c.platform,
          page_id: c.page_id,
          page_name: c.page_name,
          access_token: c.access_token,
          token_expires_at: c.token_expires_at,
          connected: true,
        }));
        setConnections(mapped);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const handleSave = async (platform: 'instagram' | 'facebook') => {
    const form = forms[platform];
    if (!form.access_token.trim()) {
      setMessage({ type: 'error', text: 'El access token es obligatorio' });
      return;
    }

    setSaving(platform);
    setMessage(null);

    try {
      const res = await fetch('/api/social-connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          platform,
          access_token: form.access_token,
          page_id: form.page_id || null,
          page_name: form.page_name || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setMessage({ type: 'error', text: data.error || 'Error al guardar' });
        return;
      }

      setMessage({
        type: data.token_valid ? 'success' : 'error',
        text: data.message,
      });

      // Reset form and refetch
      setForms((prev) => ({ ...prev, [platform]: { access_token: '', page_id: '', page_name: '' } }));
      await fetchConnections();
    } catch {
      setMessage({ type: 'error', text: 'Error de red al guardar' });
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (connectionId: string) => {
    if (!confirm('Eliminar esta conexión? Los posts publicados no se verán afectados.')) return;

    try {
      const res = await fetch('/api/social-connections', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: connectionId }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Conexión eliminada' });
        await fetchConnections();
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al eliminar' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de red' });
    }
  };

  const handleTestToken = async (platform: string) => {
    const form = forms[platform];
    if (!form.access_token.trim()) {
      setMessage({ type: 'error', text: 'Ingresa un access token para probar' });
      return;
    }

    setTesting(platform);
    setTestResult(null);

    try {
      // We call the POST endpoint with a save — the response includes token_valid
      // For a pure test without saving, we validate client-side via the API
      const res = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${form.access_token}`);
      const data = await res.json();
      const valid = !data.error;
      setTestResult({ platform, valid });
      setMessage({
        type: valid ? 'success' : 'error',
        text: valid ? 'Token válido' : `Token inválido: ${data.error?.message || 'error desconocido'}`,
      });
    } catch {
      setTestResult({ platform, valid: false });
      setMessage({ type: 'error', text: 'Error al validar token' });
    } finally {
      setTesting(null);
    }
  };

  const updateForm = (platform: string, field: string, value: string) => {
    setForms((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], [field]: value },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm" style={{ color: 'var(--text-mid)' }}>
        <RefreshCw className="w-4 h-4 animate-spin" /> Cargando conexiones...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-serif font-bold flex items-center gap-2" style={{ color: 'var(--text-dark)' }}>
        <Wifi className="w-4 h-4" style={{ color: 'var(--primary-deep)' }} />
        Publicación Directa
      </h3>

      <p className="text-xs" style={{ color: 'var(--text-mid)' }}>
        Conecta las cuentas de redes sociales de este cliente para publicar directamente desde SocialGo.
      </p>

      {/* Guided wizard — pastes a token, auto-discovers pages + IG */}
      <MetaConnectWizard clientId={clientId} onConnected={fetchConnections} />

      {/* Divider */}
      <div className="flex items-center gap-2 my-4" role="separator">
        <div className="flex-1 h-px" style={{ background: 'var(--glass-border)' }} />
        <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-light)' }}>
          o manual
        </span>
        <div className="flex-1 h-px" style={{ background: 'var(--glass-border)' }} />
      </div>

      {/* Status message */}
      {message && (
        <div
          className="flex items-center gap-2 p-3 rounded-xl text-xs font-semibold"
          style={{
            background: message.type === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
            color: message.type === 'success' ? '#065F46' : '#DC2626',
          }}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          {message.text}
        </div>
      )}

      {/* Platform cards */}
      {PLATFORMS.map(({ key, label, color, icon }) => {
        const existing = connections.find((c) => c.platform === key);
        const form = forms[key];

        return (
          <div key={key} className="rounded-2xl border p-4 space-y-3" style={{ borderColor: 'var(--glass-border)', background: 'white' }}>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span style={{ color }}>{icon}</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-dark)' }}>{label}</span>
              </div>
              {existing ? (
                <span className="text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1" style={{ background: 'rgba(16,185,129,0.10)', color: '#065F46' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Conectado
                </span>
              ) : (
                <span className="text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1" style={{ background: 'rgba(158,158,158,0.10)', color: '#666' }}>
                  <WifiOff className="w-3 h-3" />
                  Sin conexión
                </span>
              )}
            </div>

            {/* Connected state */}
            {existing && (
              <div className="space-y-2">
                <div className="text-xs space-y-1" style={{ color: 'var(--text-mid)' }}>
                  {existing.page_name && <p><span className="font-semibold">Página:</span> {existing.page_name}</p>}
                  {existing.page_id && <p><span className="font-semibold">ID:</span> {existing.page_id}</p>}
                  <p><span className="font-semibold">Token:</span> {existing.access_token}</p>
                  {existing.token_expires_at && (
                    <p>
                      <span className="font-semibold">Expira:</span>{' '}
                      {new Date(existing.token_expires_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(existing.id)}
                  className="text-xs font-semibold flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                  style={{ background: 'rgba(239,68,68,0.08)', color: '#DC2626' }}
                >
                  <Trash2 className="w-3 h-3" /> Desconectar
                </button>
              </div>
            )}

            {/* Setup form */}
            {!existing && (
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--text-mid)' }}>
                    Access Token *
                  </label>
                  <input
                    type="password"
                    value={form.access_token}
                    onChange={(e) => updateForm(key, 'access_token', e.target.value)}
                    placeholder="Pega tu token de acceso aquí"
                    className="w-full px-3 py-2 rounded-lg text-xs border outline-none"
                    style={{ borderColor: 'var(--glass-border)', color: 'var(--text-dark)' }}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--text-mid)' }}>
                    {key === 'instagram' ? 'Instagram Business Account ID' : 'Page ID'}
                  </label>
                  <input
                    type="text"
                    value={form.page_id}
                    onChange={(e) => updateForm(key, 'page_id', e.target.value)}
                    placeholder={key === 'instagram' ? 'Ej: 17841400...' : 'Ej: 10150045...'}
                    className="w-full px-3 py-2 rounded-lg text-xs border outline-none"
                    style={{ borderColor: 'var(--glass-border)', color: 'var(--text-dark)' }}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--text-mid)' }}>
                    Nombre de la página (opcional)
                  </label>
                  <input
                    type="text"
                    value={form.page_name}
                    onChange={(e) => updateForm(key, 'page_name', e.target.value)}
                    placeholder="Ej: Mi Página de Facebook"
                    className="w-full px-3 py-2 rounded-lg text-xs border outline-none"
                    style={{ borderColor: 'var(--glass-border)', color: 'var(--text-dark)' }}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleTestToken(key)}
                    disabled={testing === key || !form.access_token.trim()}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-1.5 border"
                    style={{ borderColor: 'var(--glass-border)', color: 'var(--text-mid)' }}
                  >
                    {testing === key ? (
                      <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Probando...</>
                    ) : (
                      <><Wifi className="w-3.5 h-3.5" /> Probar token</>
                    )}
                  </button>
                  <button
                    onClick={() => handleSave(key)}
                    disabled={saving === key || !form.access_token.trim()}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold text-white transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
                    style={{ background: color }}
                  >
                    {saving === key ? (
                      <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Guardando...</>
                    ) : (
                      <><Save className="w-3.5 h-3.5" /> Conectar</>
                    )}
                  </button>
                </div>

                {testResult?.platform === key && (
                  <div
                    className="flex items-center gap-1.5 p-2 rounded-lg text-[10px] font-semibold"
                    style={{
                      background: testResult.valid ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                      color: testResult.valid ? '#065F46' : '#DC2626',
                    }}
                  >
                    {testResult.valid ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    {testResult.valid ? 'Token válido' : 'Token inválido'}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Help text */}
      <div className="rounded-xl p-3 text-[10px]" style={{ background: 'rgba(167,139,250,0.06)', color: 'var(--text-mid)' }}>
        <p className="font-semibold mb-1" style={{ color: 'var(--text-dark)' }}>Como obtener los tokens:</p>
        <ol className="list-decimal list-inside space-y-0.5">
          <li>Ve a <span className="font-semibold">developers.facebook.com</span> y crea una Meta App</li>
          <li>Agrega los productos &quot;Instagram Graph API&quot; y/o &quot;Pages API&quot;</li>
          <li>Genera un Page Access Token de larga duracion</li>
          <li>Pega el token y el Page/Account ID aqui</li>
        </ol>
      </div>
    </div>
  );
}
