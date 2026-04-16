'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useClients, usePosts, useCurrentUser, usePostComments, createPost, updatePost, createPostComment, uploadAndAttachAsset } from '@/lib/hooks';
import { useOrganization } from '@/lib/hooks';
import { POST_TYPE_CONFIG, FORMAT_CONFIG } from '@/types';
import type { Client, Post, PostType, PostFormat, Platform } from '@/types';
import { AIToolbar } from '@/components/ai/AIToolbar';
import { CalendarDays, Download } from 'lucide-react';

// ─── Helpers ───────────────────────────────────────────────────────────────

const parseLocalDate = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d);
};

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
};

const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const generateCalendarDays = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - ((startDate.getDay() + 6) % 7));
  const days: { date: Date; isCurrentMonth: boolean }[] = [];
  const current = new Date(startDate);
  for (let i = 0; i < 42; i++) {
    days.push({ date: new Date(current), isCurrentMonth: current.getMonth() === month });
    current.setDate(current.getDate() + 1);
  }
  while (days.length > 35 && days.slice(-7).every((d) => !d.isCurrentMonth)) {
    days.splice(-7, 7);
  }
  return days;
};

const getPostTypeColor = (type: string): string =>
  POST_TYPE_CONFIG[type as PostType]?.color || '#D0D0D0';

// ─── New Post Modal ────────────────────────────────────────────────────────

interface NewPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  defaultDate: string;
  orgId: string | null;
  onPostCreated: () => void;
}

function NewPostModal({ isOpen, onClose, clients, defaultDate, orgId, onPostCreated }: NewPostModalProps) {
  const [clientId, setClientId] = useState('');
  const [name, setName] = useState('');
  const [scheduledDate, setScheduledDate] = useState(defaultDate);
  const [explanation, setExplanation] = useState('');
  const [inspoUrl, setInspoUrl] = useState('');
  const [postType, setPostType] = useState<PostType>('educativo');
  const [format, setFormat] = useState<PostFormat>('reel');
  const [platform, setPlatform] = useState<Platform>('instagram');
  const [cta, setCta] = useState('');
  const [copy, setCopy] = useState('');
  const [scheduledTime, setScheduledTime] = useState('10:00');
  const [assetFile, setAssetFile] = useState<File | null>(null);
  const [assetPreview, setAssetPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setAssetFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setAssetPreview(url);
    } else {
      setAssetPreview(null);
    }
  };

  React.useEffect(() => {
    if (defaultDate) setScheduledDate(defaultDate);
  }, [defaultDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) { setError('Selecciona un cliente'); return; }
    setIsSaving(true);
    setError(null);
    try {
      const newPost = await createPost({
        client_id: clientId,
        name: name.trim() || null,
        copy: copy.trim() || null,
        cta: cta.trim() || null,
        explanation: explanation.trim() || null,
        inspo_url: inspoUrl.trim() || null,
        post_type: postType,
        format,
        platform,
        scheduled_date: scheduledDate || null,
        scheduled_time: scheduledTime || null,
        status: scheduledDate ? 'planned' : 'draft',
        approval_status: 'pending',
        ai_score: null,
        ai_insights: [] as Record<string, unknown>[],
        image_url: null,
        media_urls: [] as string[],
        internal_comments: null,
        assigned_to: null,
        approval_token: null,
        approval_comments: null,
        approved_at: null,
        approved_by: null,
        likes: 0,
        comments_count: 0,
        shares: 0,
        saves: 0,
        impressions: 0,
        reach: 0,
        canva_design_id: null,
        canva_page_number: null,
        published_url: null,
        published_at: null,
        publish_error: null,
      });

      // Upload asset if selected
      if (assetFile && orgId && newPost?.id) {
        await uploadAndAttachAsset(assetFile, orgId, newPost.id);
      }

      // Reset & close
      setClientId(''); setName(''); setCopy(''); setCta(''); setExplanation(''); setInspoUrl('');
      setPostType('educativo'); setFormat('reel'); setPlatform('instagram'); setScheduledTime('10:00');
      setAssetFile(null); setAssetPreview(null);
      onPostCreated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear post');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const inputStyle = { background: 'var(--surface)', borderColor: 'var(--glass-border)', color: 'var(--text-dark)' };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60]" onClick={onClose} />
      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" style={{ border: '1px solid rgba(148,163,184,0.25)' }}>
          <div className="sticky top-0 bg-white px-6 py-4 border-b flex items-center justify-between z-10" style={{ borderColor: 'rgba(148,163,184,0.15)' }}>
            <h2 className="font-serif text-lg font-bold" style={{ color: '#0F172A' }}>Nuevo Post Planeado</h2>
            <button onClick={onClose} className="text-xl hover:opacity-60">×</button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && <div className="p-3 rounded-xl text-sm text-red-800" style={{ background: 'rgba(255,100,100,0.15)' }}>{error}</div>}

            {/* Cliente */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#334155' }}>Cliente *</label>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} required className="w-full px-3 py-2 rounded-xl text-sm border" style={inputStyle}>
                <option value="">Seleccionar cliente...</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
              </select>
            </div>

            {/* Nombre del post */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#334155' }}>Nombre del post</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="ej: Promo Mayo, Tip #3..." className="w-full px-3 py-2 rounded-xl text-sm border" style={inputStyle} />
            </div>

            {/* Fecha + Hora */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#334155' }}>Fecha</label>
                <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="w-full px-3 py-2 rounded-xl text-sm border" style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#334155' }}>Hora</label>
                <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="w-full px-3 py-2 rounded-xl text-sm border" style={inputStyle} />
              </div>
            </div>

            {/* Explicación / Contexto */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#334155' }}>Explicación / Contexto</label>
              <textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2} placeholder="Nota interna sobre el propósito..." className="w-full px-3 py-2 rounded-xl text-sm border resize-none" style={inputStyle} />
            </div>

            {/* Link de inspo */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#334155' }}>Link de inspiración</label>
              <input type="text" value={inspoUrl} onChange={(e) => setInspoUrl(e.target.value)} placeholder="link o referencia de inspiración" className="w-full px-3 py-2 rounded-xl text-sm border" style={inputStyle} />
            </div>

            {/* Tipo + Formato + Plataforma */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#334155' }}>Tipo</label>
                <select value={postType} onChange={(e) => setPostType(e.target.value as PostType)} className="w-full px-2 py-2 rounded-xl text-xs border" style={inputStyle}>
                  {(Object.entries(POST_TYPE_CONFIG) as [PostType, (typeof POST_TYPE_CONFIG)[PostType]][]).map(([key, config]) => (
                    <option key={key} value={key}>{config.letter} {config.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#334155' }}>Formato</label>
                <select value={format} onChange={(e) => setFormat(e.target.value as PostFormat)} className="w-full px-2 py-2 rounded-xl text-xs border" style={inputStyle}>
                  {(Object.entries(FORMAT_CONFIG) as [PostFormat, (typeof FORMAT_CONFIG)[PostFormat]][]).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#334155' }}>Plataforma</label>
                <select value={platform} onChange={(e) => setPlatform(e.target.value as Platform)} className="w-full px-2 py-2 rounded-xl text-xs border" style={inputStyle}>
                  {(['instagram', 'tiktok', 'facebook', 'linkedin', 'twitter', 'youtube'] as Platform[]).map((p) => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* CTA */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#334155' }}>CTA (Call to Action)</label>
              <input type="text" value={cta} onChange={(e) => setCta(e.target.value)} placeholder="ej: Agenda tu cita hoy" className="w-full px-3 py-2 rounded-xl text-sm border" style={inputStyle} />
            </div>

            {/* Copy */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#334155' }}>Copy</label>
              <textarea value={copy} onChange={(e) => setCopy(e.target.value)} rows={4} placeholder="Escribe el texto del post..." className="w-full px-3 py-2 rounded-xl text-sm border resize-none" style={inputStyle} />
              <p className="text-xs mt-1" style={{ color: '#64748B' }}>{copy.length} caracteres</p>
              <div className="mt-2">
                <AIToolbar copy={copy} onCopyChange={setCopy} platform={platform} postType={postType} clientId={clientId} />
              </div>
            </div>

            {/* Asset Upload */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#334155' }}>Asset (imagen o video)</label>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:text-white file:cursor-pointer"
                style={{ color: '#334155' }}
              />
              {assetPreview && (
                <div className="mt-2 relative">
                  <img src={assetPreview} alt="Preview" className="w-full max-h-40 object-cover rounded-xl" />
                  <button type="button" onClick={() => { setAssetFile(null); setAssetPreview(null); }} className="absolute top-1 right-1 w-6 h-6 bg-black/50 text-white rounded-full text-xs flex items-center justify-center">×</button>
                </div>
              )}
            </div>

            {/* Submit */}
            <button type="submit" disabled={isSaving || !clientId} className="w-full py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #6366F1, #A78BFA)' }}>
              {isSaving ? 'Creando...' : 'Crear Post'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

// ─── Post Review Modal (for client_viewer) ─────────────────────────────────

interface PostReviewModalProps {
  post: Post | null;
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (postId: string) => void;
  onSave: (postId: string, data: Partial<Post>) => Promise<void>;
  orgId: string | null;
  currentUser: { name: string | null; email: string | null; memberId: string | null; role: string | null };
}

function PostReviewModal({ post, client, isOpen, onClose, onApprove, onSave, orgId, currentUser }: PostReviewModalProps) {
  const { data: comments, refetch: refetchComments } = usePostComments(post?.id ?? null);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const isClientViewer = currentUser.role === 'client_viewer';
  const canEdit = !isClientViewer;

  // Share approval link state
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const handleGenerateShareLink = async () => {
    if (!post) return;
    setShareLoading(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/generate-token`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setShareUrl(data.share_url);
        navigator.clipboard.writeText(data.share_url);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 3000);
      }
    } catch (err) {
      console.error('Share link error:', err);
    } finally {
      setShareLoading(false);
    }
  };

  // Editable fields
  const [editName, setEditName] = useState('');
  const [editCopy, setEditCopy] = useState('');
  const [editCta, setEditCta] = useState('');
  const [editExplanation, setEditExplanation] = useState('');
  const [editPostType, setEditPostType] = useState<PostType>('educativo');
  const [editPlatform, setEditPlatform] = useState<Platform>('instagram');
  const [saving, setSaving] = useState(false);
  const [assetFile, setAssetFile] = useState<File | null>(null);

  // Sync fields when post changes
  React.useEffect(() => {
    if (post) {
      setEditName(post.name || '');
      setEditCopy(post.copy || '');
      setEditCta(post.cta || '');
      setEditExplanation(post.explanation || '');
      setEditPostType((post.post_type as PostType) || 'educativo');
      setEditPlatform(post.platform || 'instagram');
      setAssetFile(null);
    }
  }, [post]);

  if (!isOpen || !post) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(post.id, {
        name: editName.trim() || null,
        copy: editCopy.trim() || null,
        cta: editCta.trim() || null,
        explanation: editExplanation.trim() || null,
        post_type: editPostType,
        platform: editPlatform,
      });
      if (assetFile && orgId) {
        await uploadAndAttachAsset(assetFile, orgId, post.id);
      }
      onClose();
    } catch (err) {
      console.error('Error saving post:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || !post) return;
    setSending(true);
    try {
      await createPostComment({
        post_id: post.id,
        author_name: currentUser.name || (isClientViewer ? 'Cliente' : 'Equipo'),
        author_email: currentUser.email,
        author_member_id: currentUser.memberId,
        content: newComment.trim(),
        is_client_comment: isClientViewer,
      });
      setNewComment('');
      await refetchComments();
    } catch (err) {
      console.error('Error sending comment:', err);
    } finally {
      setSending(false);
    }
  };

  const handleDownloadAsset = () => {
    if (post.image_url) {
      const a = document.createElement('a');
      a.href = post.image_url;
      a.download = post.name || 'asset';
      a.target = '_blank';
      a.click();
    }
  };

  const inputStyle = { background: '#FAFAFA', borderColor: 'rgba(148,163,184,0.25)', color: '#0F172A' };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60]" onClick={onClose} />
      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" style={{ border: '1px solid rgba(148,163,184,0.25)' }}>
          <div className="sticky top-0 bg-white px-6 py-4 border-b flex items-center justify-between z-10" style={{ borderColor: 'rgba(148,163,184,0.15)' }}>
            <h2 className="font-serif text-lg font-bold" style={{ color: '#0F172A' }}>
              {client?.emoji} {post.name || 'Post'}
            </h2>
            <div className="flex items-center gap-2">
              {canEdit && (
                shareUrl ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(16,185,129,0.1)', color: '#059669' }}>
                    <span className="font-semibold">{shareCopied ? '¡Link copiado!' : 'Link generado'}</span>
                    <button onClick={() => { navigator.clipboard.writeText(shareUrl); setShareCopied(true); setTimeout(() => setShareCopied(false), 2000); }} className="underline hover:opacity-70">Copiar</button>
                  </div>
                ) : (
                  <button onClick={handleGenerateShareLink} disabled={shareLoading} className="px-3 py-1.5 rounded-lg text-xs font-semibold border hover:opacity-80 transition disabled:opacity-50 flex items-center gap-1" style={{ borderColor: 'rgba(148,163,184,0.3)', color: '#6366F1' }}>
                    {shareLoading ? '...' : '🔗 Compartir para aprobación'}
                  </button>
                )
              )}
              <button onClick={onClose} className="text-xl hover:opacity-60">×</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            {/* Left: Asset preview */}
            <div className="p-6 border-r" style={{ borderColor: 'rgba(148,163,184,0.15)' }}>
              {post.image_url ? (
                <div className="space-y-3">
                  <img src={post.image_url} alt={post.name || 'Asset'} className="w-full rounded-xl object-cover max-h-[400px]" />
                  <button onClick={handleDownloadAsset} className="w-full py-2 rounded-xl text-sm font-medium border hover:opacity-80 transition" style={{ color: '#6366F1', borderColor: '#6366F1' }}>
                    <Download className="w-3.5 h-3.5 inline" /> Descargar asset
                  </button>
                </div>
              ) : (
                <div className="w-full h-48 rounded-xl flex items-center justify-center" style={{ background: 'rgba(148,163,184,0.1)' }}>
                  <p className="text-sm" style={{ color: '#64748B' }}>Sin asset cargado</p>
                </div>
              )}
              {/* Upload/change asset (non-client only) */}
              {canEdit && (
                <div className="mt-3">
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#64748B' }}>
                    {post.image_url ? 'Cambiar asset' : 'Subir asset'}
                  </label>
                  <input type="file" accept="image/*,video/*" onChange={(e) => setAssetFile(e.target.files?.[0] ?? null)} className="w-full text-xs" />
                  {assetFile && <p className="text-xs mt-1" style={{ color: '#10B981' }}>Archivo seleccionado: {assetFile.name}</p>}
                </div>
              )}
            </div>

            {/* Right: Info + actions */}
            <div className="p-6 space-y-4">
              {/* Editable or read-only fields */}
              {canEdit ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: '#64748B' }}>Nombre</label>
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-3 py-1.5 rounded-lg text-sm border" style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: '#64748B' }}>Explicación</label>
                    <textarea value={editExplanation} onChange={(e) => setEditExplanation(e.target.value)} rows={2} className="w-full px-3 py-1.5 rounded-lg text-sm border resize-none" style={inputStyle} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ color: '#64748B' }}>Tipo</label>
                      <select value={editPostType} onChange={(e) => setEditPostType(e.target.value as PostType)} className="w-full px-2 py-1.5 rounded-lg text-xs border" style={inputStyle}>
                        {(Object.entries(POST_TYPE_CONFIG) as [PostType, (typeof POST_TYPE_CONFIG)[PostType]][]).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ color: '#64748B' }}>Plataforma</label>
                      <select value={editPlatform} onChange={(e) => setEditPlatform(e.target.value as Platform)} className="w-full px-2 py-1.5 rounded-lg text-xs border" style={inputStyle}>
                        {(['instagram', 'tiktok', 'facebook', 'linkedin', 'twitter', 'youtube'] as Platform[]).map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: '#64748B' }}>CTA</label>
                    <input type="text" value={editCta} onChange={(e) => setEditCta(e.target.value)} className="w-full px-3 py-1.5 rounded-lg text-sm border" style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: '#64748B' }}>Copy</label>
                    <textarea value={editCopy} onChange={(e) => setEditCopy(e.target.value)} rows={3} className="w-full px-3 py-1.5 rounded-lg text-sm border resize-none" style={inputStyle} />
                    <div className="mt-2">
                      <AIToolbar copy={editCopy} onCopyChange={setEditCopy} platform={post?.platform} postType={post?.post_type || undefined} clientId={post?.client_id} />
                    </div>
                  </div>
                  <button onClick={handleSave} disabled={saving} className="w-full py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #6366F1, #A78BFA)' }}>
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              ) : (
                /* Read-only for client_viewer */
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold" style={{ color: '#64748B' }}>Fecha</p>
                    <p className="text-sm" style={{ color: '#0F172A' }}>{post.scheduled_date || '—'}</p>
                  </div>
                  {post.explanation && <div>
                    <p className="text-xs font-semibold" style={{ color: '#64748B' }}>Explicación</p>
                    <p className="text-sm" style={{ color: '#0F172A' }}>{post.explanation}</p>
                  </div>}
                  <div className="flex gap-4">
                    <div>
                      <p className="text-xs font-semibold" style={{ color: '#64748B' }}>Tipo</p>
                      <p className="text-sm" style={{ color: '#0F172A' }}>{POST_TYPE_CONFIG[post.post_type as PostType]?.label || post.post_type}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: '#64748B' }}>Plataforma</p>
                      <p className="text-sm capitalize" style={{ color: '#0F172A' }}>{post.platform}</p>
                    </div>
                  </div>
                  {post.cta && <div>
                    <p className="text-xs font-semibold" style={{ color: '#64748B' }}>CTA</p>
                    <p className="text-sm" style={{ color: '#0F172A' }}>{post.cta}</p>
                  </div>}
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(148,163,184,0.08)' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: '#64748B' }}>Copy</p>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: '#0F172A' }}>{post.copy || '(sin copy)'}</p>
                  </div>
                  <button onClick={() => { onApprove(post.id); onClose(); }} className="w-full py-2.5 rounded-xl font-semibold text-sm text-white" style={{ background: '#10B981' }}>
                    ✓ Aprobar
                  </button>
                </div>
              )}

              {/* Comments section */}
              <div className="border-t pt-4" style={{ borderColor: 'rgba(148,163,184,0.15)' }}>
                <p className="text-xs font-semibold mb-3" style={{ color: '#64748B' }}>Comentarios</p>
                <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
                  {comments.length === 0 ? (
                    <p className="text-xs" style={{ color: '#94A3B8' }}>Sin comentarios aún</p>
                  ) : (
                    comments.map((c) => (
                      <div key={c.id} className="p-2 rounded-lg text-xs" style={{ background: c.is_client_comment ? 'rgba(99,102,241,0.1)' : 'rgba(200,200,200,0.15)' }}>
                        <span className="font-semibold" style={{ color: '#0F172A' }}>{c.author_name || 'Anónimo'}</span>
                        <span className="mx-1" style={{ color: '#94A3B8' }}>·</span>
                        <span style={{ color: '#94A3B8' }}>{new Date(c.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        <p className="mt-1" style={{ color: '#334155' }}>{c.content}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Escribe un comentario..." className="flex-1 px-3 py-2 rounded-xl text-sm border" style={{ background: '#FAFAFA', borderColor: 'rgba(148,163,184,0.25)', color: '#0F172A' }} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }} />
                  <button onClick={handleSendComment} disabled={sending || !newComment.trim()} className="px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #6366F1, #A78BFA)' }}>
                    {sending ? '...' : 'Enviar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Calendar Day Cell ─────────────────────────────────────────────────────

interface DayCellProps {
  date: Date;
  isCurrentMonth: boolean;
  posts: Post[];
  isSelected: boolean;
  onClick: (date: Date) => void;
}

function DayCell({ date, isCurrentMonth, posts, isSelected, onClick }: DayCellProps) {
  const today = isToday(date);
  return (
    <button
      onClick={() => onClick(date)}
      className="min-h-[56px] p-1 rounded-lg border transition-all text-left relative"
      style={{
        background: isSelected ? 'rgba(99,102,241,0.15)' : isCurrentMonth ? 'var(--surface)' : 'transparent',
        borderColor: isSelected ? 'var(--primary)' : today ? 'var(--primary-deep)' : 'var(--glass-border)',
        opacity: isCurrentMonth ? 1 : 0.4,
        borderWidth: today || isSelected ? '2px' : '1px',
      }}
    >
      <div className="text-[10px] font-semibold mb-0.5" style={{ color: today ? 'var(--primary-deep)' : 'var(--text-dark)' }}>
        {date.getDate()}
      </div>
      <div className="flex flex-wrap gap-px">
        {posts.slice(0, 3).map((post) => (
          <div
            key={post.id}
            className="w-3 h-3 rounded-sm flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: getPostTypeColor(post.post_type || 'otro'), fontSize: '7px' }}
          >
            {POST_TYPE_CONFIG[post.post_type as PostType]?.letter || '?'}
          </div>
        ))}
        {posts.length > 3 && <span className="text-[8px] font-bold" style={{ color: 'var(--text-light)' }}>+{posts.length - 3}</span>}
      </div>
    </button>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function PlanningPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedClientFilter, setSelectedClientFilter] = useState<string | null>(null);
  const [newPostOpen, setNewPostOpen] = useState(false);
  const [reviewPost, setReviewPost] = useState<Post | null>(null);

  const { data: currentUser } = useCurrentUser();
  const { data: org } = useOrganization();
  const role = currentUser?.member?.role;
  const isClientViewer = role === 'client_viewer';

  const { data: clients, loading: clientsLoading } = useClients();
  const { data: posts, loading: postsLoading, refetch: refetchPosts } = usePosts();

  const monthYear = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const calendarDays = useMemo(() => generateCalendarDays(currentDate), [currentDate]);

  // Group posts by date
  const postsByDate = useMemo(() => {
    const map: Record<string, Post[]> = {};
    (posts || []).forEach((p) => {
      if (!p.scheduled_date) return;
      if (selectedClientFilter && p.client_id !== selectedClientFilter) return;
      const key = formatDateKey(parseLocalDate(p.scheduled_date));
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    return map;
  }, [posts, selectedClientFilter]);

  // Posts for current month (for the table)
  const monthPosts = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return (posts || [])
      .filter((p) => {
        if (!p.scheduled_date) return false;
        if (selectedClientFilter && p.client_id !== selectedClientFilter) return false;
        const d = parseLocalDate(p.scheduled_date);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .sort((a, b) => (a.scheduled_date || '').localeCompare(b.scheduled_date || ''));
  }, [posts, currentDate, selectedClientFilter]);

  const monthStats = useMemo(() => ({
    total: monthPosts.length,
    pending: monthPosts.filter((p) => p.approval_status === 'pending').length,
    approved: monthPosts.filter((p) => p.approval_status === 'approved' || p.approval_status === 'approved_with_changes').length,
  }), [monthPosts]);

  const handlePostCreated = useCallback(() => { refetchPosts(); }, [refetchPosts]);

  const handleApprove = async (postId: string) => {
    try {
      await updatePost(postId, { approval_status: 'approved', approved_at: new Date().toISOString() });
      refetchPosts();
    } catch (err) { console.error('Error approving:', err); }
  };

  const goToPreviousMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const goToNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const dayHeaders = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const clientMap = new Map((clients || []).map((c) => [c.id, c]));

  return (
    <div className="space-y-6">
      {/* Sticky Header */}
      <div className="sticky-header sticky top-0 z-50 -mx-8 px-8 pt-7 pb-4" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-bold flex items-center gap-2" style={{ color: 'var(--text-dark)' }}><CalendarDays className="w-5 h-5" style={{ color: 'var(--primary-deep)' }} /> Planificación</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-mid)' }}>
              {isClientViewer ? 'Revisa y aprueba el contenido planeado' : 'Crea posts y planifica tu contenido'}
            </p>
          </div>
          {!isClientViewer && (
            <button onClick={() => setNewPostOpen(true)} className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white hover:shadow-lg transition" style={{ background: 'linear-gradient(135deg, #6366F1, #A78BFA)' }}>
              + Nuevo Post Planeado
            </button>
          )}
        </div>
      </div>

      {clientsLoading || postsLoading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-96 rounded-2xl" style={{ background: 'var(--glass-border)' }} />
        </div>
      ) : (
      <>

      {/* Month Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Posts planeados', value: monthStats.total, color: 'var(--text-dark)' },
          { label: 'Pendientes por aprobar', value: monthStats.pending, color: 'var(--primary)' },
          { label: 'Aprobados', value: monthStats.approved, color: 'var(--primary-deep)' },
        ].map((stat) => (
          <div key={stat.label} className="p-3 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)' }}>
            <p className="text-xs font-semibold" style={{ color: 'var(--text-mid)' }}>{stat.label}</p>
            <p className="text-2xl font-serif font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Client filter */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-semibold" style={{ color: 'var(--text-mid)' }}>Filtrar:</label>
        <select
          value={selectedClientFilter || ''}
          onChange={(e) => setSelectedClientFilter(e.target.value || null)}
          className="px-3 py-1.5 rounded-xl text-sm border"
          style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)', color: 'var(--text-dark)' }}
        >
          <option value="">Todos los clientes</option>
          {(clients || []).map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
        </select>
      </div>

      {/* Main Layout: Calendar (left) | Posts Table (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,4fr)] gap-6">

        {/* Left: Calendar (75% size) */}
        <div className="rounded-2xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)' }}>
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={goToPreviousMonth} className="p-1.5 rounded-lg hover:opacity-70" style={{ background: 'var(--bg)' }}>◀</button>
            <h3 className="text-sm font-serif font-semibold capitalize" style={{ color: 'var(--text-dark)' }}>{monthYear}</h3>
            <button onClick={goToNextMonth} className="p-1.5 rounded-lg hover:opacity-70" style={{ background: 'var(--bg)' }}>▶</button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {dayHeaders.map((day) => (
              <div key={day} className="text-center text-[10px] font-semibold py-0.5" style={{ color: 'var(--primary-deep)' }}>{day}</div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const key = formatDateKey(day.date);
              return (
                <DayCell
                  key={key}
                  date={day.date}
                  isCurrentMonth={day.isCurrentMonth}
                  posts={postsByDate[key] || []}
                  isSelected={selectedDate !== null && isSameDay(selectedDate, day.date)}
                  onClick={setSelectedDate}
                />
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t" style={{ borderColor: 'var(--glass-border)' }}>
            {Object.entries(POST_TYPE_CONFIG).map(([key, config]) => (
              <div key={key} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: config.color }} />
                <span className="text-[9px] font-medium" style={{ color: 'var(--text-mid)' }}>{config.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Posts Table */}
        <div className="rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)' }}>
          <div className="p-4 border-b" style={{ borderColor: 'var(--glass-border)' }}>
            <h3 className="text-sm font-serif font-bold" style={{ color: 'var(--text-dark)' }}>
              Posts del mes ({monthPosts.length})
            </h3>
          </div>

          <div className="overflow-y-auto max-h-[500px]">
            {monthPosts.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm" style={{ color: 'var(--text-light)' }}>No hay posts planeados para este mes</p>
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--glass-border)', background: 'var(--bg)' }}>
                    <th className="text-left py-2 px-3 font-semibold" style={{ color: 'var(--text-mid)' }}>Fecha</th>
                    <th className="text-left py-2 px-3 font-semibold" style={{ color: 'var(--text-mid)' }}>Cliente</th>
                    <th className="text-center py-2 px-3 font-semibold" style={{ color: 'var(--text-mid)' }}>Tipo</th>
                    <th className="text-center py-2 px-3 font-semibold" style={{ color: 'var(--text-mid)' }}>Formato</th>
                    <th className="text-center py-2 px-3 font-semibold" style={{ color: 'var(--text-mid)' }}>Plataforma</th>
                    <th className="text-center py-2 px-3 font-semibold" style={{ color: 'var(--text-mid)' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {monthPosts.map((post) => {
                    const client = clientMap.get(post.client_id);
                    const typeConfig = POST_TYPE_CONFIG[post.post_type as PostType];
                    const formatConfig = FORMAT_CONFIG[post.format as PostFormat];
                    const isApproved = post.approval_status === 'approved' || post.approval_status === 'approved_with_changes';
                    return (
                      <tr
                        key={post.id}
                        className="border-b hover:bg-[rgba(99,102,241,0.05)] transition-colors cursor-pointer"
                        style={{ borderColor: 'var(--glass-border)' }}
                        onClick={() => setReviewPost(post)}
                      >
                        <td className="py-2 px-3" style={{ color: 'var(--text-dark)' }}>
                          {post.scheduled_date ? parseLocalDate(post.scheduled_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : '—'}
                        </td>
                        <td className="py-2 px-3">
                          <span style={{ color: 'var(--text-dark)' }}>{client?.emoji} {client?.name || '—'}</span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="inline-block px-1.5 py-0.5 rounded text-white font-bold" style={{ backgroundColor: typeConfig?.color || '#D0D0D0', fontSize: '9px' }}>
                            {typeConfig?.letter || '?'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center" style={{ color: 'var(--text-mid)' }}>
                          {formatConfig?.label || post.format || '—'}
                        </td>
                        <td className="py-2 px-3 text-center capitalize" style={{ color: 'var(--text-mid)' }}>
                          {post.platform}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                            {isApproved ? (
                              <span className="text-green-500 text-sm" title="Aprobado">✅</span>
                            ) : (
                              <button
                                onClick={() => handleApprove(post.id)}
                                className="text-green-500 hover:text-green-600 text-sm"
                                title="Aprobar"
                              >
                                ☑
                              </button>
                            )}
                            <button
                              onClick={() => setReviewPost(post)}
                              className="hover:opacity-70 text-sm"
                              style={{ color: 'var(--primary)' }}
                              title="Ver / Comentar"
                            >
                              💬
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* New Post Modal */}
      <NewPostModal
        isOpen={newPostOpen}
        onClose={() => setNewPostOpen(false)}
        clients={clients || []}
        defaultDate={selectedDate ? formatDateKey(selectedDate) : formatDateKey(new Date())}
        orgId={org?.id ?? null}
        onPostCreated={handlePostCreated}
      />

      {/* Post Review Modal */}
      <PostReviewModal
        post={reviewPost}
        client={reviewPost ? clientMap.get(reviewPost.client_id) ?? null : null}
        isOpen={!!reviewPost}
        onClose={() => setReviewPost(null)}
        onApprove={handleApprove}
        onSave={async (postId, data) => { await updatePost(postId, data); refetchPosts(); }}
        orgId={org?.id ?? null}
        currentUser={{
          name: currentUser?.member?.full_name ?? null,
          email: currentUser?.user?.email ?? null,
          memberId: currentUser?.member?.id ?? null,
          role: role ?? null,
        }}
      />
      </>
      )}
    </div>
  );
}
