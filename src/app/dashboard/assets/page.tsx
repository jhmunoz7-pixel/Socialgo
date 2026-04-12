'use client';

import { useState, useMemo } from 'react';
import { useClients } from '@/lib/hooks';
// Icon replacements (no external dependency)
const Search = () => <span>🔍</span>;
const Upload = () => <span>📤</span>;
const Grid3x3 = () => <span>⊞</span>;
const List = () => <span>☰</span>;
const ImageIcon = () => <span>📸</span>;
const Video = () => <span>🎬</span>;
const LayoutTemplate = () => <span>📐</span>;
const Package = () => <span>📦</span>;
const FileText = () => <span>📄</span>;

type AssetType = 'photo' | 'video' | 'template' | 'kit' | 'other';

interface Asset {
  id: string;
  org_id: string;
  client_id: string | null;
  name: string;
  file_url: string;
  file_type: AssetType | null;
  file_size: number | null;
  dimensions: string | null;
  created_at: string;
}

// Mock data - TODO: Replace with useAssets hook when available
const MOCK_ASSETS: Asset[] = [
  {
    id: '1',
    org_id: 'org_1',
    client_id: 'client_1',
    name: 'Summer Campaign Banner',
    file_url: '',
    file_type: 'photo',
    file_size: 2540000,
    dimensions: '1920x1080',
    created_at: '2026-04-05T10:30:00Z',
  },
  {
    id: '2',
    org_id: 'org_1',
    client_id: 'client_2',
    name: 'Product Demo Video',
    file_url: '',
    file_type: 'video',
    file_size: 156000000,
    dimensions: '3840x2160',
    created_at: '2026-04-03T14:15:00Z',
  },
  {
    id: '3',
    org_id: 'org_1',
    client_id: null,
    name: 'Social Media Template Kit',
    file_url: '',
    file_type: 'kit',
    file_size: 45000000,
    dimensions: null,
    created_at: '2026-04-01T09:00:00Z',
  },
  {
    id: '4',
    org_id: 'org_1',
    client_id: 'client_1',
    name: 'Instagram Post Template',
    file_url: '',
    file_type: 'template',
    file_size: 8500000,
    dimensions: '1080x1080',
    created_at: '2026-03-28T16:45:00Z',
  },
  {
    id: '5',
    org_id: 'org_1',
    client_id: 'client_3',
    name: 'Brand Guidelines Photo',
    file_url: '',
    file_type: 'photo',
    file_size: 3200000,
    dimensions: '2560x1440',
    created_at: '2026-03-25T11:20:00Z',
  },
];

const getAssetIcon = (fileType: AssetType | null) => {
  switch (fileType) {
    case 'photo':
      return <ImageIcon className="w-5 h-5" />;
    case 'video':
      return <Video className="w-5 h-5" />;
    case 'template':
      return <LayoutTemplate className="w-5 h-5" />;
    case 'kit':
      return <Package className="w-5 h-5" />;
    default:
      return <FileText className="w-5 h-5" />;
  }
};

const getAssetTypeLabel = (fileType: AssetType | null) => {
  const labels: Record<AssetType | 'other', string> = {
    photo: 'Foto',
    video: 'Video',
    template: 'Plantilla',
    kit: 'Kit',
    other: 'Otro',
  };
  return labels[fileType || 'other'];
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return 'N/A';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getClientNameById = (clientId: string | null, clients: any[]) => {
  if (!clientId) return 'Sin cliente';
  const client = clients.find((c) => c.id === clientId);
  return client?.name || 'Cliente desconocido';
};

export default function AssetsPage() {
  const { data: clients, loading: clientsLoading } = useClients();

  // TODO: Replace with useAssets hook when available
  const [assets] = useState<Asset[]>(MOCK_ASSETS);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<AssetType | 'all'>('all');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter assets based on search and filters
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesSearch = asset.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesType =
        selectedType === 'all' || asset.file_type === selectedType;
      const matchesClient =
        selectedClient === 'all' || asset.client_id === selectedClient;

      return matchesSearch && matchesType && matchesClient;
    });
  }, [assets, searchQuery, selectedType, selectedClient]);

  return (
    <div className="min-h-screen" style={{ background: '#FFF8F3' }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: 'rgba(255,181,200,0.2)' }}>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-2">
            <h1
              className="text-4xl font-serif font-bold"
              style={{ color: '#2A1F1A' }}
            >
              Assets
            </h1>
            {/* TODO: Implement Supabase Storage integration for file uploads */}
            <button
              className="flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-sans font-medium transition-transform hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #FFB5C8, #FF8FAD)' }}
            >
              <Upload className="w-5 h-5" />
              Subir archivo
            </button>
          </div>
          <p style={{ color: '#2A1F1A', opacity: 0.6 }} className="text-sm">
            Gestiona fotos, videos y plantillas para tus clientes
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filter Bar */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            {/* Search Input */}
            <div className="flex-1">
              <label
                className="block text-sm font-sans font-medium mb-2"
                style={{ color: '#2A1F1A' }}
              >
                Buscar assets
              </label>
              <div className="relative">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-40"
                  style={{ color: '#2A1F1A' }}
                />
                <input
                  type="text"
                  placeholder="Nombre del asset..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border font-sans backdrop-blur"
                  style={{
                    background: 'rgba(255,248,243,0.7)',
                    borderColor: 'rgba(255,181,200,0.3)',
                    color: '#2A1F1A',
                  }}
                />
              </div>
            </div>

            {/* Type Filter */}
            <div className="flex-1">
              <label
                className="block text-sm font-sans font-medium mb-2"
                style={{ color: '#2A1F1A' }}
              >
                Tipo de archivo
              </label>
              <select
                value={selectedType}
                onChange={(e) =>
                  setSelectedType(e.target.value as AssetType | 'all')
                }
                className="w-full px-4 py-3 rounded-2xl border font-sans backdrop-blur"
                style={{
                  background: 'rgba(255,248,243,0.7)',
                  borderColor: 'rgba(255,181,200,0.3)',
                  color: '#2A1F1A',
                }}
              >
                <option value="all">Todos los tipos</option>
                <option value="photo">Foto</option>
                <option value="video">Video</option>
                <option value="template">Plantilla</option>
                <option value="kit">Kit</option>
              </select>
            </div>

            {/* Client Filter */}
            <div className="flex-1">
              <label
                className="block text-sm font-sans font-medium mb-2"
                style={{ color: '#2A1F1A' }}
              >
                Cliente
              </label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border font-sans backdrop-blur"
                style={{
                  background: 'rgba(255,248,243,0.7)',
                  borderColor: 'rgba(255,181,200,0.3)',
                  color: '#2A1F1A',
                }}
                disabled={clientsLoading}
              >
                <option value="all">Todos los clientes</option>
                {clients?.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* View Toggle & Results Count */}
          <div className="flex items-center justify-between">
            <p
              className="text-sm font-sans"
              style={{ color: '#2A1F1A', opacity: 0.7 }}
            >
              {filteredAssets.length} asset{filteredAssets.length !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-2 rounded-2xl p-1" style={{ background: 'rgba(255,181,200,0.1)' }}>
              <button
                onClick={() => setViewMode('grid')}
                className="p-2 rounded-xl transition-colors"
                style={{
                  background:
                    viewMode === 'grid'
                      ? 'rgba(255,181,200,0.3)'
                      : 'transparent',
                  color: '#2A1F1A',
                }}
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className="p-2 rounded-xl transition-colors"
                style={{
                  background:
                    viewMode === 'list'
                      ? 'rgba(255,181,200,0.3)'
                      : 'transparent',
                  color: '#2A1F1A',
                }}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Assets Display */}
        {filteredAssets.length === 0 ? (
          <div
            className="rounded-2xl border border-white/40 p-12 text-center backdrop-blur"
            style={{ background: 'rgba(255,248,243,0.7)' }}
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: 'rgba(255,181,200,0.2)' }}>
              <ImageIcon className="w-8 h-8" style={{ color: '#FF8FAD' }} />
            </div>
            <h3
              className="text-lg font-serif font-semibold mb-2"
              style={{ color: '#2A1F1A' }}
            >
              No se encontraron assets
            </h3>
            <p style={{ color: '#2A1F1A', opacity: 0.6 }} className="text-sm">
              {searchQuery || selectedType !== 'all' || selectedClient !== 'all'
                ? 'Intenta cambiar tus filtros'
                : 'Comienza subiendo tu primer asset'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          // Grid View
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                className="rounded-2xl border border-white/40 overflow-hidden shadow-sm hover:shadow-md transition-shadow group cursor-pointer"
                style={{ background: 'rgba(255,248,243,0.7)', backdropFilter: 'blur(16px)' }}
              >
                {/* Thumbnail */}
                <div
                  className="w-full h-48 bg-gradient-to-br flex items-center justify-center overflow-hidden"
                  style={{
                    background: asset.file_url
                      ? `url(${asset.file_url}) center/cover`
                      : 'linear-gradient(135deg, rgba(255,181,200,0.2), rgba(232,213,255,0.2))',
                  }}
                >
                  {!asset.file_url && (
                    <div
                      className="text-4xl opacity-40"
                      style={{ color: '#FF8FAD' }}
                    >
                      {asset.file_type === 'photo' && '📸'}
                      {asset.file_type === 'video' && '🎬'}
                      {asset.file_type === 'template' && '📐'}
                      {asset.file_type === 'kit' && '📦'}
                      {!asset.file_type && '📁'}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  {/* Type Badge */}
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans font-medium"
                      style={{
                        background: 'rgba(255,181,200,0.2)',
                        color: '#FF8FAD',
                      }}
                    >
                      {getAssetIcon(asset.file_type)}
                      {getAssetTypeLabel(asset.file_type)}
                    </span>
                  </div>

                  {/* Asset Name */}
                  <h3
                    className="font-serif font-semibold text-sm truncate"
                    style={{ color: '#2A1F1A' }}
                    title={asset.name}
                  >
                    {asset.name}
                  </h3>

                  {/* Metadata */}
                  <div
                    className="space-y-1 text-xs"
                    style={{ color: '#2A1F1A', opacity: 0.6 }}
                  >
                    <p>{formatFileSize(asset.file_size)}</p>
                    {asset.dimensions && <p>{asset.dimensions}</p>}
                    <p className="text-xs mt-2 font-sans" style={{ color: '#FF8FAD' }}>
                      {getClientNameById(asset.client_id, clients || [])}
                    </p>
                  </div>

                  {/* Upload Date */}
                  <p
                    className="text-xs font-sans"
                    style={{ color: '#2A1F1A', opacity: 0.5 }}
                  >
                    {formatDate(asset.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // List View
          <div className="space-y-3">
            {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                className="rounded-2xl border border-white/40 p-4 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer group"
                style={{ background: 'rgba(255,248,243,0.7)', backdropFilter: 'blur(16px)' }}
              >
                {/* Thumbnail */}
                <div
                  className="w-20 h-20 rounded-xl flex-shrink-0 flex items-center justify-center"
                  style={{
                    background: asset.file_url
                      ? `url(${asset.file_url}) center/cover`
                      : 'linear-gradient(135deg, rgba(255,181,200,0.2), rgba(232,213,255,0.2))',
                  }}
                >
                  {!asset.file_url && (
                    <span className="text-2xl opacity-40">
                      {asset.file_type === 'photo' && '📸'}
                      {asset.file_type === 'video' && '🎬'}
                      {asset.file_type === 'template' && '📐'}
                      {asset.file_type === 'kit' && '📦'}
                      {!asset.file_type && '📁'}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3
                    className="font-serif font-semibold truncate"
                    style={{ color: '#2A1F1A' }}
                  >
                    {asset.name}
                  </h3>
                  <div
                    className="flex items-center gap-4 text-sm mt-1"
                    style={{ color: '#2A1F1A', opacity: 0.6 }}
                  >
                    <span className="font-sans">
                      {getAssetTypeLabel(asset.file_type)}
                    </span>
                    <span className="font-sans">{formatFileSize(asset.file_size)}</span>
                    {asset.dimensions && (
                      <span className="font-sans">{asset.dimensions}</span>
                    )}
                    <span className="font-sans">
                      {getClientNameById(asset.client_id, clients || [])}
                    </span>
                  </div>
                </div>

                {/* Date */}
                <p
                  className="text-sm font-sans flex-shrink-0"
                  style={{ color: '#2A1F1A', opacity: 0.5 }}
                >
                  {formatDate(asset.created_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
