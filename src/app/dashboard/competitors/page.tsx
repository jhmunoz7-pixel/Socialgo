'use client';

import { useState } from 'react';
import {
  useClients,
  useCompetitors,
  createCompetitor,
  updateCompetitor,
  deleteCompetitor,
} from '@/lib/hooks';
import type { Competitor, Client } from '@/types';
import { EmptyState } from '@/components/ui/EmptyState';
import { TipBanner } from '@/components/ui/TipBanner';
import {
  Target,
  Plus,
  Pencil,
  Trash2,
  X,
  Sparkles,
  Globe,
  Loader2,
  ExternalLink,
  Shield,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ChevronDown,
  Camera,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────
interface CompetitorFormData {
  name: string;
  instagram_handle: string;
  facebook_url: string;
  tiktok_handle: string;
  linkedin_url: string;
  website: string;
  notes: string;
}

interface AnalysisResult {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  content_gaps: string[];
  recommendations: string[];
}

const emptyForm: CompetitorFormData = {
  name: '',
  instagram_handle: '',
  facebook_url: '',
  tiktok_handle: '',
  linkedin_url: '',
  website: '',
  notes: '',
};

// ── Main Page ──────────────────────────────────────────────────
export default function CompetitorsPage() {
  const { data: clients, loading: clientsLoading } = useClients();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const { data: competitors, loading: competitorsLoading, refetch } = useCompetitors(selectedClientId);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompetitor, setEditingCompetitor] = useState<Competitor | null>(null);
  const [formData, setFormData] = useState<CompetitorFormData>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // AI analysis
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Helpers
  const selectedClient = clients.find((c: Client) => c.id === selectedClientId) || null;

  const openCreateModal = () => {
    setEditingCompetitor(null);
    setFormData(emptyForm);
    setSaveError(null);
    setTimeout(() => setIsModalOpen(true), 0);
  };

  const openEditModal = (comp: Competitor) => {
    setEditingCompetitor(comp);
    setFormData({
      name: comp.name,
      instagram_handle: comp.instagram_handle || '',
      facebook_url: comp.facebook_url || '',
      tiktok_handle: comp.tiktok_handle || '',
      linkedin_url: comp.linkedin_url || '',
      website: comp.website || '',
      notes: comp.notes || '',
    });
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      const payload = {
        client_id: selectedClientId,
        name: formData.name,
        instagram_handle: formData.instagram_handle || null,
        facebook_url: formData.facebook_url || null,
        tiktok_handle: formData.tiktok_handle || null,
        linkedin_url: formData.linkedin_url || null,
        website: formData.website || null,
        notes: formData.notes || null,
      };

      if (editingCompetitor) {
        await updateCompetitor(editingCompetitor.id, payload);
      } else {
        await createCompetitor(payload);
      }

      setIsModalOpen(false);
      setEditingCompetitor(null);
      setFormData(emptyForm);
      await refetch();
    } catch (err) {
      console.error('Error saving competitor:', err);
      setSaveError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setIsDeleting(confirmDeleteId);
    setConfirmDeleteId(null);
    try {
      await deleteCompetitor(confirmDeleteId);
      await refetch();
    } catch (err) {
      console.error('Error deleting competitor:', err);
      setSaveError(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setIsDeleting(null);
    }
  };

  const runAnalysis = async () => {
    if (!selectedClientId || competitors.length === 0) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    try {
      const res = await fetch('/api/ai/competitor-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: selectedClientId,
          competitor_ids: competitors.map((c) => c.id),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al generar el análisis');
      setAnalysisResult(json.data);
    } catch (err) {
      console.error('Analysis error:', err);
      setAnalysisError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="pb-12">
      {/* Sticky Header */}
      <div
        className="sticky-header sticky top-0 z-20 border-b border-gray-100 -mx-8 px-8 pt-7 pb-4 flex items-center justify-between"
        style={{ background: 'var(--bg)', backdropFilter: 'blur(10px)' }}
      >
        <h1 className="text-2xl font-serif font-bold" style={{ color: 'var(--text-dark)' }}>
          <span className="flex items-center gap-2">
            <Target className="w-5 h-5" style={{ color: 'var(--primary-deep)' }} />
            Análisis Competitivo
          </span>
        </h1>
        {selectedClientId && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl font-sans text-sm font-medium text-white transition-transform hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #FF8FAD 0%, #FFBA8A 100%)' }}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Agregar competidor</span>
            <span className="sm:hidden">+ Nuevo</span>
          </button>
        )}
      </div>

      <div className="p-6 md:p-8 space-y-6">
        {/* Tip Banner */}
        <TipBanner dismissible>
          Agrega los competidores de cada cliente para obtener un análisis SWOT generado por IA con recomendaciones accionables.
        </TipBanner>

        {/* Client Selector */}
        <div className="card p-4">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-dark)' }}>
            Selecciona un cliente
          </label>
          <div className="relative">
            <select
              value={selectedClientId || ''}
              onChange={(e) => {
                setSelectedClientId(e.target.value || null);
                setAnalysisResult(null);
                setAnalysisError(null);
              }}
              className="w-full px-4 py-2.5 rounded-xl border appearance-none pr-10 text-sm"
              style={{
                background: 'var(--bg)',
                borderColor: 'var(--border)',
                color: 'var(--text-dark)',
              }}
            >
              <option value="">
                {clientsLoading ? 'Cargando clientes...' : '-- Selecciona un cliente --'}
              </option>
              {clients.map((client: Client) => (
                <option key={client.id} value={client.id}>
                  {client.emoji} {client.name}
                </option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: 'var(--text-light)' }}
            />
          </div>
        </div>

        {/* Error */}
        {saveError && (
          <div className="p-4 rounded-2xl text-sm font-sans text-red-800" style={{ background: 'rgba(255,200,200,0.5)' }}>
            {saveError}
          </div>
        )}

        {/* No client selected */}
        {!selectedClientId && (
          <EmptyState
            icon={<Target className="w-12 h-12" />}
            title="Selecciona un cliente"
            description="Elige un cliente del selector para ver y gestionar sus competidores."
          />
        )}

        {/* Competitors List */}
        {selectedClientId && !competitorsLoading && competitors.length === 0 && (
          <EmptyState
            icon={<Target className="w-12 h-12" />}
            title="Sin competidores"
            description={`Agrega competidores de ${selectedClient?.name || 'este cliente'} para empezar el análisis.`}
            action={{ label: 'Agregar competidor', onClick: openCreateModal }}
          />
        )}

        {selectedClientId && competitorsLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--primary)' }} />
          </div>
        )}

        {selectedClientId && competitors.length > 0 && (
          <>
            {/* Competitor Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {competitors.map((comp) => (
                <div key={comp.id} className="card p-5 space-y-3 relative group">
                  {/* Actions */}
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditModal(comp)}
                      className="p-1.5 rounded-lg hover:bg-black/5 transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" style={{ color: 'var(--text-light)' }} />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(comp.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      title="Eliminar"
                      disabled={isDeleting === comp.id}
                    >
                      {isDeleting === comp.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      )}
                    </button>
                  </div>

                  {/* Name */}
                  <h3 className="text-base font-semibold pr-16" style={{ color: 'var(--text-dark)' }}>
                    {comp.name}
                  </h3>

                  {/* Social handles */}
                  <div className="space-y-1.5 text-xs" style={{ color: 'var(--text-light)' }}>
                    {comp.instagram_handle && (
                      <div className="flex items-center gap-2">
                        <Camera className="w-3.5 h-3.5" />
                        <span>@{comp.instagram_handle.replace(/^@/, '')}</span>
                      </div>
                    )}
                    {comp.tiktok_handle && (
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 flex items-center justify-center text-[10px] font-bold">TT</span>
                        <span>@{comp.tiktok_handle.replace(/^@/, '')}</span>
                      </div>
                    )}
                    {comp.facebook_url && (
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 flex items-center justify-center text-[10px] font-bold">FB</span>
                        <a href={comp.facebook_url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                          Facebook <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    )}
                    {comp.linkedin_url && (
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 flex items-center justify-center text-[10px] font-bold">in</span>
                        <a href={comp.linkedin_url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                          LinkedIn <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    )}
                    {comp.website && (
                      <div className="flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5" />
                        <a href={comp.website} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                          {comp.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {comp.notes && (
                    <p className="text-xs italic pt-1" style={{ color: 'var(--text-light)' }}>
                      {comp.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* AI Analysis Section */}
            <div className="card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-serif font-bold flex items-center gap-2" style={{ color: 'var(--text-dark)' }}>
                  <Sparkles className="w-5 h-5" style={{ color: 'var(--primary-deep)' }} />
                  Análisis IA
                </h2>
                <button
                  onClick={runAnalysis}
                  disabled={isAnalyzing || competitors.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-sans text-sm font-medium text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  style={{ background: 'linear-gradient(135deg, #FF8FAD 0%, #FFBA8A 100%)' }}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analizando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generar análisis competitivo
                    </>
                  )}
                </button>
              </div>

              {analysisError && (
                <div className="p-4 rounded-2xl text-sm text-red-800" style={{ background: 'rgba(255,200,200,0.5)' }}>
                  {analysisError}
                </div>
              )}

              {analysisResult && <AnalysisDisplay data={analysisResult} />}
            </div>
          </>
        )}
      </div>

      {/* ── Add/Edit Modal ──────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-lg rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--bg)' }}
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-2">
              <h2 className="text-lg font-serif font-bold" style={{ color: 'var(--text-dark)' }}>
                {editingCompetitor ? 'Editar competidor' : 'Agregar competidor'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:bg-black/5">
                <X className="w-5 h-5" style={{ color: 'var(--text-light)' }} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
              {saveError && (
                <div className="p-3 rounded-xl text-sm text-red-700" style={{ background: 'rgba(255,200,200,0.4)' }}>
                  {saveError}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-dark)' }}>Nombre *</label>
                <input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border text-sm"
                  style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-dark)' }}
                  placeholder="Nombre del competidor"
                />
              </div>

              {/* Instagram */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-dark)' }}>Instagram</label>
                <input
                  value={formData.instagram_handle}
                  onChange={(e) => setFormData((p) => ({ ...p, instagram_handle: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border text-sm"
                  style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-dark)' }}
                  placeholder="@handle"
                />
              </div>

              {/* TikTok */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-dark)' }}>TikTok</label>
                <input
                  value={formData.tiktok_handle}
                  onChange={(e) => setFormData((p) => ({ ...p, tiktok_handle: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border text-sm"
                  style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-dark)' }}
                  placeholder="@handle"
                />
              </div>

              {/* Facebook */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-dark)' }}>Facebook URL</label>
                <input
                  value={formData.facebook_url}
                  onChange={(e) => setFormData((p) => ({ ...p, facebook_url: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border text-sm"
                  style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-dark)' }}
                  placeholder="https://facebook.com/..."
                />
              </div>

              {/* LinkedIn */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-dark)' }}>LinkedIn URL</label>
                <input
                  value={formData.linkedin_url}
                  onChange={(e) => setFormData((p) => ({ ...p, linkedin_url: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border text-sm"
                  style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-dark)' }}
                  placeholder="https://linkedin.com/company/..."
                />
              </div>

              {/* Website */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-dark)' }}>Sitio web</label>
                <input
                  value={formData.website}
                  onChange={(e) => setFormData((p) => ({ ...p, website: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border text-sm"
                  style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-dark)' }}
                  placeholder="https://..."
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-dark)' }}>Notas</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border text-sm resize-none"
                  style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-dark)' }}
                  rows={3}
                  placeholder="Observaciones sobre este competidor..."
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium border"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-dark)' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !formData.name.trim()}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #FF8FAD 0%, #FFBA8A 100%)' }}
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingCompetitor ? 'Guardar cambios' : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ─────────────────────────────────── */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl shadow-2xl p-6 space-y-4" style={{ background: 'var(--bg)' }}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-100">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="font-semibold" style={{ color: 'var(--text-dark)' }}>Eliminar competidor</h3>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-light)' }}>
              Esta acción no se puede deshacer. El competidor será eliminado permanentemente.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium border"
                style={{ borderColor: 'var(--border)', color: 'var(--text-dark)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Analysis Display ───────────────────────────────────────────
function AnalysisDisplay({ data }: { data: AnalysisResult }) {
  return (
    <div className="space-y-6">
      {/* SWOT Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SwotCard
          title="Fortalezas"
          items={data.strengths}
          icon={<Shield className="w-4 h-4" />}
          bgColor="rgba(34, 197, 94, 0.08)"
          borderColor="rgba(34, 197, 94, 0.2)"
          iconColor="#16a34a"
        />
        <SwotCard
          title="Debilidades"
          items={data.weaknesses}
          icon={<AlertTriangle className="w-4 h-4" />}
          bgColor="rgba(234, 179, 8, 0.08)"
          borderColor="rgba(234, 179, 8, 0.2)"
          iconColor="#ca8a04"
        />
        <SwotCard
          title="Oportunidades"
          items={data.opportunities}
          icon={<TrendingUp className="w-4 h-4" />}
          bgColor="rgba(59, 130, 246, 0.08)"
          borderColor="rgba(59, 130, 246, 0.2)"
          iconColor="#2563eb"
        />
        <SwotCard
          title="Amenazas"
          items={data.threats}
          icon={<AlertTriangle className="w-4 h-4" />}
          bgColor="rgba(239, 68, 68, 0.08)"
          borderColor="rgba(239, 68, 68, 0.2)"
          iconColor="#dc2626"
        />
      </div>

      {/* Content Gaps */}
      <div className="card p-5 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-dark)' }}>
          <Lightbulb className="w-4 h-4" style={{ color: 'var(--primary-deep)' }} />
          Brechas de contenido
        </h3>
        <ul className="space-y-2">
          {data.content_gaps.map((gap, i) => (
            <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-light)' }}>
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--primary)' }} />
              {gap}
            </li>
          ))}
        </ul>
      </div>

      {/* Recommendations */}
      <div className="card p-5 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-dark)' }}>
          <Sparkles className="w-4 h-4" style={{ color: 'var(--primary-deep)' }} />
          Recomendaciones
        </h3>
        <ol className="space-y-2">
          {data.recommendations.map((rec, i) => (
            <li key={i} className="flex items-start gap-3 text-sm" style={{ color: 'var(--text-light)' }}>
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #FF8FAD, #FFBA8A)' }}
              >
                {i + 1}
              </span>
              {rec}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

// ── SWOT Card ──────────────────────────────────────────────────
function SwotCard({
  title,
  items,
  icon,
  bgColor,
  borderColor,
  iconColor,
}: {
  title: string;
  items: string[];
  icon: React.ReactNode;
  bgColor: string;
  borderColor: string;
  iconColor: string;
}) {
  return (
    <div
      className="rounded-2xl p-4 space-y-2"
      style={{ background: bgColor, border: `1px solid ${borderColor}` }}
    >
      <h4 className="text-sm font-semibold flex items-center gap-2" style={{ color: iconColor }}>
        {icon}
        {title}
      </h4>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="text-xs flex items-start gap-2" style={{ color: 'var(--text-dark)' }}>
            <span className="mt-1 w-1 h-1 rounded-full flex-shrink-0" style={{ background: iconColor }} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
