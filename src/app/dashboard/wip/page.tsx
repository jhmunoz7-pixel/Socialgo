'use client';

import React, { useState, useMemo } from 'react';
import {
  useClients,
  usePosts,
  useCanvaDesigns,
} from '@/lib/hooks';
import type { Post, CanvaDesign } from '@/types';
import { EmptyState } from '@/components/ui/EmptyState';
import { TipBanner } from '@/components/ui/TipBanner';
import {
  Layers,
  ExternalLink,
  Link2,
  Loader2,
  X,
  ChevronDown,
  Image,
  Clock,
  FileText,
  Check,
  Search,
} from 'lucide-react';

// ─── Status badge colors ─────────────────────────────────────────
const STATUS_CONFIG: Record<CanvaDesign['status'], { label: string; color: string; bg: string }> = {
  wip: { label: 'WIP', color: '#7A6560', bg: '#F3F0EE' },
  assigned: { label: 'Asignado', color: '#1D4ED8', bg: '#DBEAFE' },
  exported: { label: 'Exportado', color: '#15803D', bg: '#DCFCE7' },
};

// ─── Format relative time ────────────────────────────────────────
function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Nunca';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Justo ahora';
  if (diffMin < 60) return `hace ${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `hace ${diffD}d`;
}

// ─── Add Design Card ─────────────────────────────────────────────
function AddDesignCard({
  clientId,
  onAdded,
}: {
  clientId: string;
  onAdded: () => void;
}) {
  const [designInput, setDesignInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Extract design ID from URL or raw ID
  const parseDesignId = (input: string): string => {
    const trimmed = input.trim();
    // Handle full URL: https://www.canva.com/design/DAGdtjOVgJU/cvLa0AWQ4dmJPLx2IQSMRA/edit
    const urlMatch = trimmed.match(/canva\.com\/design\/([^/]+)/);
    if (urlMatch) return urlMatch[1];
    // Handle raw ID
    return trimmed;
  };

  const handleAdd = async () => {
    const designId = parseDesignId(designInput);
    if (!designId) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/canva/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          designs: [{ canva_design_id: designId }],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      setSuccess('Diseño agregado');
      setDesignInput('');
      onAdded();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al agregar diseño');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="rounded-2xl p-5 border"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--glass-border)',
      }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--primary)', color: 'var(--text-dark)' }}
        >
          <Image className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold" style={{ color: 'var(--text-dark)' }}>
            Agregar diseño de Canva
          </h3>
          <p className="text-xs" style={{ color: 'var(--text-light)' }}>
            Pega la URL o el ID del diseño de Canva
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={designInput}
          onChange={(e) => { setDesignInput(e.target.value); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="https://www.canva.com/design/DAGxxx.../edit  o  DAGxxx..."
          className="flex-1 px-3 py-2 rounded-xl border text-sm"
          style={{
            background: 'var(--bg)',
            borderColor: 'var(--glass-border)',
            color: 'var(--text-dark)',
          }}
        />
        <button
          onClick={handleAdd}
          disabled={saving || !designInput.trim()}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 flex items-center gap-1.5"
          style={{ background: 'var(--gradient)' }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
          {saving ? 'Agregando...' : 'Agregar'}
        </button>
      </div>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      {success && <p className="text-xs mt-2" style={{ color: '#15803D' }}>{success}</p>}
    </div>
  );
}

// ─── Assign Modal ────────────────────────────────────────────────
function AssignModal({
  design,
  posts,
  onClose,
  onAssign,
}: {
  design: CanvaDesign;
  posts: Post[];
  onClose: () => void;
  onAssign: (designId: string, postId: string) => Promise<void>;
}) {
  const [assigning, setAssigning] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState('');

  // Show unassigned posts (draft/planned, no image_url)
  const availablePosts = useMemo(() => {
    return posts.filter((p) => {
      const isAvailable =
        ['draft', 'planned'].includes(p.status) && !p.image_url;
      if (!isAvailable) return false;
      if (!searchQ) return true;
      const q = searchQ.toLowerCase();
      return (
        (p.name && p.name.toLowerCase().includes(q)) ||
        p.platform.toLowerCase().includes(q)
      );
    });
  }, [posts, searchQ]);

  const handleAssign = async (postId: string) => {
    setAssigning(postId);
    try {
      await onAssign(design.id, postId);
      onClose();
    } catch {
      setAssigning(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-lg rounded-2xl border overflow-hidden"
        style={{
          background: 'var(--bg-warm)',
          borderColor: 'var(--glass-border)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--glass-border)' }}>
          <div>
            <h3 className="font-semibold" style={{ color: 'var(--text-dark)' }}>
              Asignar a post
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-light)' }}>
              {design.title || 'Sin titulo'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:opacity-70 transition-opacity">
            <X className="w-5 h-5" style={{ color: 'var(--text-light)' }} />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b" style={{ borderColor: 'var(--glass-border)' }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-light)' }} />
            <input
              type="text"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Buscar post..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border text-sm"
              style={{
                background: 'var(--bg)',
                borderColor: 'var(--glass-border)',
                color: 'var(--text-dark)',
              }}
            />
          </div>
        </div>

        {/* Post list */}
        <div className="max-h-80 overflow-y-auto p-2">
          {availablePosts.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm" style={{ color: 'var(--text-light)' }}>
                No hay posts disponibles para asignar
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-light)' }}>
                Crea un post borrador o planificado sin imagen
              </p>
            </div>
          ) : (
            availablePosts.map((post) => (
              <button
                key={post.id}
                onClick={() => handleAssign(post.id)}
                disabled={assigning === post.id}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:opacity-80"
                style={{
                  background: assigning === post.id ? 'var(--primary)' : 'transparent',
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                  style={{
                    background: 'var(--surface)',
                    color: 'var(--text-mid)',
                    border: '1px solid var(--glass-border)',
                  }}
                >
                  {post.platform.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-dark)' }}>
                    {post.name || 'Sin nombre'}
                  </p>
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-light)' }}>
                    <span className="capitalize">{post.platform}</span>
                    {post.scheduled_date && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(post.scheduled_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                        </span>
                      </>
                    )}
                    {post.format && (
                      <>
                        <span>·</span>
                        <span className="capitalize">{post.format}</span>
                      </>
                    )}
                  </div>
                </div>
                {assigning === post.id ? (
                  <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: 'var(--text-mid)' }} />
                ) : (
                  <Link2 className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-light)' }} />
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Design Card ─────────────────────────────────────────────────
function DesignCard({
  design,
  onAssign,
}: {
  design: CanvaDesign;
  onAssign: () => void;
}) {
  const statusCfg = STATUS_CONFIG[design.status];

  return (
    <div
      className="rounded-2xl border overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--glass-border)',
      }}
    >
      {/* Thumbnail */}
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        {design.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={design.thumbnail_url}
            alt={design.title || 'Canva design'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: 'var(--bg)', color: 'var(--text-light)' }}
          >
            <Image className="w-10 h-10" />
          </div>
        )}

        {/* Page count badge */}
        {design.page_count > 1 && (
          <span
            className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-sm"
            style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}
          >
            <FileText className="w-3 h-3" />
            {design.page_count}
          </span>
        )}

        {/* Status badge */}
        <span
          className="absolute top-2 right-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
          style={{ background: statusCfg.bg, color: statusCfg.color }}
        >
          {statusCfg.label}
        </span>
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <div>
          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-dark)' }}>
            {design.title || 'Sin titulo'}
          </p>
          {design.client && (
            <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-light)' }}>
              <span>{design.client.emoji}</span>
              <span>{design.client.name}</span>
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[10px]" style={{ color: 'var(--text-light)' }}>
            {timeAgo(design.synced_at)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {design.design_url && (
            <a
              href={design.design_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all hover:opacity-80"
              style={{
                borderColor: 'var(--glass-border)',
                color: 'var(--text-mid)',
                background: 'var(--bg)',
              }}
            >
              <ExternalLink className="w-3 h-3" />
              Ver en Canva
            </a>
          )}

          {design.status === 'wip' ? (
            <button
              onClick={onAssign}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: 'var(--gradient)' }}
            >
              <Link2 className="w-3 h-3" />
              Asignar
            </button>
          ) : (
            <span
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
              style={{ background: statusCfg.bg, color: statusCfg.color }}
            >
              <Check className="w-3 h-3" />
              {statusCfg.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main WIP Page ───────────────────────────────────────────────
export default function WIPPage() {
  const { data: clients, loading: clientsLoading } = useClients();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [assignModalDesign, setAssignModalDesign] = useState<CanvaDesign | null>(null);

  const {
    data: designs,
    loading: designsLoading,
    refetch: refetchDesigns,
  } = useCanvaDesigns(selectedClientId);

  const {
    data: posts,
  } = usePosts(selectedClientId);

  // Auto-select first client
  React.useEffect(() => {
    if (clients.length > 0 && !selectedClientId) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId]);

  const handleAssign = async (designId: string, postId: string) => {
    const res = await fetch('/api/canva/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canva_design_id: designId, post_id: postId }),
    });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error || 'Error al asignar');
    }
    await refetchDesigns();
  };

  // Count stats
  const wipCount = designs.filter((d) => d.status === 'wip').length;
  const assignedCount = designs.filter((d) => d.status === 'assigned').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--gradient)' }}
          >
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-dark)' }}>
              Work in Progress
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-light)' }}>
              Diseños de Canva en progreso — asignalos a posts para iniciar el flujo de aprobación
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3">
          <div
            className="px-3 py-1.5 rounded-xl text-xs font-medium"
            style={{ background: STATUS_CONFIG.wip.bg, color: STATUS_CONFIG.wip.color }}
          >
            {wipCount} WIP
          </div>
          <div
            className="px-3 py-1.5 rounded-xl text-xs font-medium"
            style={{ background: STATUS_CONFIG.assigned.bg, color: STATUS_CONFIG.assigned.color }}
          >
            {assignedCount} Asignados
          </div>
        </div>
      </div>

      {/* Tip */}
      <TipBanner dismissible>
        Los creativos trabajan en Canva. Cuando un diseño esté listo, asígnalo a un post para iniciar la revisión.
      </TipBanner>

      {/* Client filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium" style={{ color: 'var(--text-mid)' }}>
          Cliente:
        </label>
        <div className="relative">
          <select
            value={selectedClientId || ''}
            onChange={(e) => setSelectedClientId(e.target.value || null)}
            className="appearance-none pl-3 pr-8 py-2 rounded-xl border text-sm font-medium cursor-pointer min-w-[200px]"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--glass-border)',
              color: 'var(--text-dark)',
            }}
          >
            {clientsLoading ? (
              <option>Cargando...</option>
            ) : (
              clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.name}
                </option>
              ))
            )}
          </select>
          <ChevronDown
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: 'var(--text-light)' }}
          />
        </div>
      </div>

      {/* Add design input */}
      {selectedClientId && (
        <AddDesignCard
          clientId={selectedClientId}
          onAdded={async () => {
            await refetchDesigns();
          }}
        />
      )}

      {/* Design grid */}
      {designsLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-light)' }} />
        </div>
      ) : designs.length === 0 ? (
        <EmptyState
          icon={<Layers className="w-12 h-12" />}
          title="No hay diseños agregados"
          description="Pega la URL o ID de un diseño de Canva arriba para agregarlo al board de WIP."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {designs.map((design) => (
            <DesignCard
              key={design.id}
              design={design}
              onAssign={() => setAssignModalDesign(design)}
            />
          ))}
        </div>
      )}

      {/* Assign modal */}
      {assignModalDesign && (
        <AssignModal
          design={assignModalDesign}
          posts={posts}
          onClose={() => setAssignModalDesign(null)}
          onAssign={handleAssign}
        />
      )}
    </div>
  );
}
