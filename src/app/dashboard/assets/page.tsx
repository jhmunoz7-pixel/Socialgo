'use client';

import { useState, useMemo, useRef } from 'react';
import { useClients, useAssets, createAsset, deleteAsset, useCurrentUser } from '@/lib/hooks';
import type { Asset } from '@/types';
import PermissionGate from '@/components/auth/PermissionGate';

const getAssetTypeLabel = (fileType: Asset['file_type']) => {
  const labels: Record<string, string> = {
    photo: 'Foto', video: 'Video', template: 'Plantilla',
    kit: 'Kit', brandbook: 'Brandbook', logo: 'Logo',
    font: 'Fuente', other: 'Otro',
  };
  return labels[fileType || 'other'] || 'Otro';
};

const getAssetEmoji = (fileType: Asset['file_type']) => {
  const emojis: Record<string, string> = {
    photo: '📸', video: '🎬', template: '📐',
    kit: '📦', brandbook: '📘', logo: '🎨',
    font: '🔤', other: '📁',
  };
  return emojis[fileType || 'other'] || '📁';
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function AssetsPage() {
  return (
    <PermissionGate requires="create_posts">
      <AssetsPageInner />
    </PermissionGate>
  );
}

function AssetsPageInner() {
  const { data: currentUser } = useCurrentUser();
  const { data: clients } = useClients();
  const { data: assets, loading, refetch } = useAssets();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [uploadClientId, setUploadClientId] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedType === 'all' || asset.file_type === selectedType;
      const matchesClient = selectedClient === 'all' || asset.client_id === selectedClient;
      return matchesSearch && matchesType && matchesClient;
    });
  }, [assets, searchQuery, selectedType, selectedClient]);

  const clientMap = useMemo(() => new Map((clients || []).map((c) => [c.id, c])), [clients]);

  const handleUpload = async () => {
    if (!uploadingFile || !currentUser?.member?.org_id) return;
    setUploading(true);
    try {
      await createAsset(uploadingFile, currentUser.member.org_id, uploadClientId || null);
      setShowUploadModal(false);
      setUploadingFile(null);
      setUploadClientId('');
      await refetch();
    } catch (err) {
      console.error('Error uploading:', err);
      alert('Error al subir el archivo. Intenta de nuevo.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (asset: Asset) => {
    if (!confirm(`¿Eliminar "${asset.name}"?`)) return;
    setDeletingId(asset.id);
    try {
      await deleteAsset(asset.id, asset.file_url);
      await refetch();
    } catch (err) {
      console.error('Error deleting:', err);
      alert('Error al eliminar el archivo');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sticky-header sticky top-0 z-50 -mx-8 px-8 pt-7 pb-4" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-serif font-bold" style={{ color: 'var(--text-dark)' }}>
            📁 Assets
          </h1>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-white font-medium transition-transform hover:scale-105"
            style={{ background: 'var(--gradient)' }}
          >
            📤 Subir archivo
          </button>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-mid)' }}>
          Gestiona fotos, videos y plantillas para tus clientes
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="form-input flex-1"
        />
        <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="form-input">
          <option value="all">Tipo: Todos</option>
          <option value="photo">Foto</option>
          <option value="video">Video</option>
          <option value="template">Plantilla</option>
          <option value="kit">Kit</option>
        </select>
        <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)} className="form-input">
          <option value="all">Cliente: Todos</option>
          {(clients || []).map((c) => (
            <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
          ))}
        </select>
        <div className="flex gap-1">
          <button onClick={() => setViewMode('grid')} className={`px-3 py-2 rounded-lg text-sm ${viewMode === 'grid' ? 'font-bold' : ''}`}
            style={{ background: viewMode === 'grid' ? 'var(--glass-border)' : 'transparent' }}>⊞</button>
          <button onClick={() => setViewMode('list')} className={`px-3 py-2 rounded-lg text-sm ${viewMode === 'list' ? 'font-bold' : ''}`}
            style={{ background: viewMode === 'list' ? 'var(--glass-border)' : 'transparent' }}>☰</button>
        </div>
      </div>

      <p className="text-xs" style={{ color: 'var(--text-light)' }}>
        {filteredAssets.length} asset{filteredAssets.length !== 1 ? 's' : ''}
      </p>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 rounded-2xl" style={{ background: 'var(--glass-border)' }} />
          ))}
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-4xl mb-3">📁</p>
          <h3 className="text-lg font-serif font-semibold mb-2" style={{ color: 'var(--text-dark)' }}>
            {assets.length === 0 ? 'No tienes assets aún' : 'No se encontraron assets'}
          </h3>
          <p className="text-sm" style={{ color: 'var(--text-mid)' }}>
            {assets.length === 0 ? 'Sube tu primer archivo para comenzar' : 'Intenta cambiar tus filtros'}
          </p>
          {assets.length === 0 && (
            <button onClick={() => setShowUploadModal(true)} className="btn btn-primary mt-4">
              Subir primer archivo
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredAssets.map((asset) => (
            <div key={asset.id} className="rounded-2xl border overflow-hidden group" style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)' }}>
              {/* Thumbnail */}
              <div className="w-full h-40 flex items-center justify-center relative"
                style={{
                  background: asset.file_url && asset.file_type === 'photo'
                    ? `url(${asset.file_url}) center/cover`
                    : `${getAssetEmoji(asset.file_type) ? 'var(--glass-border)' : 'var(--bg)'}`,
                }}>
                {asset.file_url && asset.file_type === 'photo' ? null : (
                  <span className="text-4xl opacity-40">{getAssetEmoji(asset.file_type)}</span>
                )}
                <button
                  onClick={() => handleDelete(asset)}
                  disabled={deletingId === asset.id}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'rgba(239, 68, 68, 0.9)', color: 'white' }}
                  title="Eliminar"
                >
                  {deletingId === asset.id ? '...' : '🗑️'}
                </button>
              </div>
              <div className="p-3 space-y-1">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-dark)' }}>{asset.name}</p>
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-mid)' }}>
                  <span className="px-2 py-0.5 rounded-full" style={{ background: 'var(--glass-border)' }}>
                    {getAssetTypeLabel(asset.file_type)}
                  </span>
                  <span>{formatFileSize(asset.file_size)}</span>
                </div>
                {asset.client_id && (
                  <p className="text-xs" style={{ color: 'var(--text-light)' }}>
                    {clientMap.get(asset.client_id)?.emoji} {clientMap.get(asset.client_id)?.name || 'Cliente'}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredAssets.map((asset) => (
            <div key={asset.id} className="glass-card rounded-xl p-3 flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--glass-border)' }}>
                <span className="text-xl">{getAssetEmoji(asset.file_type)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-dark)' }}>{asset.name}</p>
                <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-mid)' }}>
                  <span>{getAssetTypeLabel(asset.file_type)}</span>
                  <span>{formatFileSize(asset.file_size)}</span>
                  {asset.client_id && <span>{clientMap.get(asset.client_id)?.name}</span>}
                </div>
              </div>
              <button onClick={() => handleDelete(asset)} disabled={deletingId === asset.id}
                className="opacity-0 group-hover:opacity-100 text-sm transition-opacity" style={{ color: 'var(--text-light)' }}>
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[500] backdrop-blur-lg"
          style={{ backgroundColor: 'rgba(42,31,26,0.45)' }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowUploadModal(false); setUploadingFile(null); } }}>
          <div className="rounded-3xl max-w-md w-full shadow-lg border p-8 space-y-6"
            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--glass-border)' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-serif font-bold" style={{ color: 'var(--text-dark)' }}>Subir archivo</h2>
              <button onClick={() => { setShowUploadModal(false); setUploadingFile(null); }}
                className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--surface)' }}>
                <span className="text-xl" style={{ color: 'var(--text-mid)' }}>×</span>
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-dark)' }}>Archivo</label>
              <input ref={fileInputRef} type="file" accept="image/*,video/*,.pdf,.svg"
                onChange={(e) => setUploadingFile(e.target.files?.[0] || null)}
                className="w-full text-sm rounded-lg border p-2"
                style={{ borderColor: 'var(--glass-border)', color: 'var(--text-dark)', backgroundColor: 'var(--surface)' }} />
              {uploadingFile && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-mid)' }}>
                  {uploadingFile.name} ({(uploadingFile.size / 1024 / 1024).toFixed(1)} MB)
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-dark)' }}>Cliente (opcional)</label>
              <select value={uploadClientId} onChange={(e) => setUploadClientId(e.target.value)}
                className="w-full text-sm rounded-lg border p-2"
                style={{ borderColor: 'var(--glass-border)', color: 'var(--text-dark)', backgroundColor: 'var(--surface)' }}>
                <option value="">Sin cliente</option>
                {(clients || []).map((c) => (
                  <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                ))}
              </select>
            </div>

            <button disabled={!uploadingFile || uploading} onClick={handleUpload}
              className="w-full py-3 rounded-2xl text-white font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--gradient)' }}>
              {uploading ? 'Subiendo...' : 'Subir archivo'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
