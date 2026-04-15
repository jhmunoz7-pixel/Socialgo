'use client';

import React, { useState, useMemo } from 'react';
import { useClients, usePosts, useCurrentUser, usePostComments, updatePost, createPostComment, uploadAndAttachAsset } from '@/lib/hooks';
import { POST_TYPE_CONFIG, FORMAT_CONFIG } from '@/types';
import type { Post, Client, PostType, PostFormat, ApprovalStatus } from '@/types';

// ─── Helpers ───────────────────────────────────────────────────────────────

const parseLocalDate = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d);
};

const getMondayOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatWeekRange = (start: Date): string => {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const s = start.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  const e = end.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${s} – ${e}`;
};

// Workflow stages for the content pipeline
type WorkflowStage = 'editing' | 'ready_for_review' | 'internal_review' | 'client_ready' | 'client_approved';

function getWorkflowStage(post: Post): WorkflowStage {
  if (post.approval_status === 'approved') return 'client_approved';
  if (post.status === 'scheduled') return 'client_ready'; // internally approved, visible to client
  if (post.status === 'review_1_1' || post.status === 'in_production') return 'internal_review';
  return 'editing';
}

const WORKFLOW_CONFIG: Record<WorkflowStage, { label: string; bg: string; text: string; emoji: string }> = {
  editing: { label: 'En edición', bg: 'rgba(158,158,158,0.15)', text: '#666', emoji: '✏️' },
  ready_for_review: { label: 'Listo para revisión', bg: 'rgba(59,130,246,0.15)', text: '#1E40AF', emoji: '📋' },
  internal_review: { label: 'En revisión interna', bg: 'rgba(167,139,250,0.15)', text: '#5B21B6', emoji: '🔍' },
  client_ready: { label: 'Pendiente aprobación cliente', bg: 'rgba(255,180,50,0.15)', text: '#92400E', emoji: '🕐' },
  client_approved: { label: 'Aprobado', bg: 'rgba(16,185,129,0.15)', text: '#065F46', emoji: '✅' },
};

// ─── Comment Section ───────────────────────────────────────────────────────

function CommentSection({ postId, isClient }: { postId: string; isClient: boolean }) {
  const { data: comments, refetch: refetchComments } = usePostComments(postId);
  const { data: currentUserData } = useCurrentUser();
  const [newComment, setNewComment] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setIsSending(true);
    try {
      await createPostComment({
        post_id: postId,
        content: newComment.trim(),
        is_client_comment: isClient,
        author_name: currentUserData?.member?.full_name || (isClient ? 'Cliente' : 'Equipo'),
        author_email: null,
        author_member_id: currentUserData?.member?.id || null,
      });
      setNewComment('');
      await refetchComments();
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-2">
      {comments && comments.length > 0 && (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {comments.map((c) => (
            <div key={c.id} className="p-2 rounded-lg text-xs" style={{ background: c.is_client_comment ? 'rgba(255,143,173,0.1)' : 'var(--bg)', color: 'var(--text-mid)' }}>
              <span className="font-semibold" style={{ color: 'var(--text-dark)' }}>{c.author_name || 'Usuario'}</span>
              <span className="mx-1">·</span>
              <span className="text-[10px]" style={{ color: 'var(--text-light)' }}>
                {c.created_at ? new Date(c.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
              {c.is_client_comment && <span className="ml-1 text-[10px] px-1 py-px rounded" style={{ background: 'rgba(255,143,173,0.2)', color: '#FF8FAD' }}>cliente</span>}
              <p className="mt-1">{c.content}</p>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddComment()} placeholder="Agregar comentario..." className="flex-1 px-3 py-1.5 rounded-lg text-xs border" style={{ background: 'var(--bg)', borderColor: 'var(--glass-border)', color: 'var(--text-dark)' }} />
        <button onClick={handleAddComment} disabled={!newComment.trim() || isSending} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50" style={{ background: 'var(--gradient)' }}>
          {isSending ? '...' : 'Enviar'}
        </button>
      </div>
    </div>
  );
}

// ─── Post Card ─────────────────────────────────────────────────────────────

interface PostCardProps {
  post: Post;
  client: Client | undefined;
  role: string | null;
  onStatusChange: () => void;
}

function PostCard({ post, client, role, onStatusChange }: PostCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const typeConfig = POST_TYPE_CONFIG[post.post_type as PostType];
  const formatConfig = FORMAT_CONFIG[post.format as PostFormat];
  const stage = getWorkflowStage(post);
  const stageConfig = WORKFLOW_CONFIG[stage];

  const isClient = role === 'client_viewer';
  const isCreative = role === 'creative';
  const isAdmin = role === 'owner' || role === 'admin' || role === 'member';

  const handleAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      await uploadAndAttachAsset(file, post.org_id, post.id);
      onStatusChange();
    } catch (err) {
      console.error('Error uploading asset:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleWorkflowAction = async (newStatus: string, newApproval?: ApprovalStatus) => {
    setIsUpdating(true);
    try {
      const update: Partial<Post> = { status: newStatus as Post['status'] };
      if (newApproval) {
        update.approval_status = newApproval;
        if (newApproval === 'approved') update.approved_at = new Date().toISOString();
      }
      await updatePost(post.id, update);
      onStatusChange();
    } catch (err) {
      console.error('Error updating post:', err);
    } finally {
      setIsUpdating(false);
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

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)' }}>
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*,video/*,.pdf" className="hidden" onChange={handleAssetUpload} />

      {/* Asset Preview */}
      {post.image_url ? (
        <div className="relative group">
          <img src={post.image_url} alt={post.name || 'Post'} className="w-full h-48 object-cover" />
          {/* Download for clients, replace for team */}
          {isClient ? (
            <button onClick={handleDownloadAsset} className="absolute bottom-2 right-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-black/50 hover:bg-black/70 transition">
              ⬇ Descargar
            </button>
          ) : (
            <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
              {isUploading ? '⏳ Subiendo...' : '🔄 Cambiar asset'}
            </button>
          )}
        </div>
      ) : !isClient ? (
        <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-full h-32 flex flex-col items-center justify-center gap-2 hover:opacity-80 cursor-pointer" style={{ background: `${typeConfig?.color || '#D0D0D0'}15` }}>
          {isUploading ? (
            <><span className="text-2xl animate-pulse">⏳</span><span className="text-xs font-semibold" style={{ color: 'var(--text-mid)' }}>Subiendo...</span></>
          ) : (
            <><div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: typeConfig?.color || '#D0D0D0' }}>+</div><span className="text-xs font-semibold" style={{ color: 'var(--text-mid)' }}>Agregar asset</span></>
          )}
        </button>
      ) : (
        <div className="w-full h-32 flex items-center justify-center" style={{ background: 'rgba(200,200,200,0.1)' }}>
          <p className="text-xs" style={{ color: 'var(--text-light)' }}>Sin asset</p>
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Header: client + workflow stage */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">{client?.emoji || '📱'}</span>
            <span className="text-xs font-semibold" style={{ color: 'var(--text-dark)' }}>{client?.name || 'Cliente'}</span>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: stageConfig.bg, color: stageConfig.text }}>
            {stageConfig.emoji} {stageConfig.label}
          </span>
        </div>

        {/* Post name */}
        {post.name && <h4 className="text-sm font-serif font-bold" style={{ color: 'var(--text-dark)' }}>{post.name}</h4>}

        {/* Copy */}
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-mid)' }}>{post.copy || '(sin contenido)'}</p>

        {/* CTA */}
        {post.cta && <p className="text-xs font-semibold" style={{ color: 'var(--primary-deep)' }}>CTA: {post.cta}</p>}

        {/* Meta tags */}
        <div className="flex flex-wrap gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${typeConfig?.color || '#D0D0D0'}20`, color: typeConfig?.color || '#666' }}>
            {typeConfig?.label || post.post_type}
          </span>
          {formatConfig && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--glass-border)', color: 'var(--text-mid)' }}>{formatConfig.label}</span>}
          <span className="text-[10px] px-2 py-0.5 rounded-full capitalize" style={{ background: 'var(--glass-border)', color: 'var(--text-mid)' }}>{post.platform}</span>
          {post.scheduled_date && (
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--glass-border)', color: 'var(--text-mid)' }}>
              {parseLocalDate(post.scheduled_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>

        {/* Workflow Actions */}
        <div className="pt-2 border-t space-y-2" style={{ borderColor: 'var(--glass-border)' }}>

          {/* Creative: mark as ready for internal review */}
          {(isCreative || isAdmin) && stage === 'editing' && (
            <button onClick={() => handleWorkflowAction('in_production')} disabled={isUpdating} className="w-full py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-40" style={{ background: 'rgba(59,130,246,0.15)', color: '#1E40AF' }}>
              📋 Listo para revisión interna
            </button>
          )}

          {/* Admin: approve internally → makes it visible to client */}
          {isAdmin && stage === 'internal_review' && (
            <button onClick={() => handleWorkflowAction('scheduled')} disabled={isUpdating} className="w-full py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-40" style={{ background: 'rgba(16,185,129,0.15)', color: '#065F46' }}>
              ✓ Aprobación interna
            </button>
          )}

          {/* Client: approve or comment */}
          {isClient && stage === 'client_ready' && (
            <button onClick={() => handleWorkflowAction('published', 'approved')} disabled={isUpdating} className="w-full py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-40" style={{ background: 'rgba(16,185,129,0.15)', color: '#065F46' }}>
              ✅ Aprobar
            </button>
          )}

          {/* Admin can also approve on behalf of client */}
          {isAdmin && stage === 'client_ready' && (
            <button onClick={() => handleWorkflowAction('published', 'approved')} disabled={isUpdating} className="w-full py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-40" style={{ background: 'rgba(16,185,129,0.15)', color: '#065F46' }}>
              ✅ Marcar como aprobado por cliente
            </button>
          )}
        </div>

        {/* Comments toggle */}
        <button onClick={() => setShowComments(!showComments)} className="text-xs font-semibold w-full text-left" style={{ color: 'var(--primary-deep)' }}>
          {showComments ? '▾ Ocultar comentarios' : '▸ Comentarios'}
        </button>
        {showComments && <CommentSection postId={post.id} isClient={isClient} />}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function ContenidoPage() {
  const [currentWeekStart, setCurrentWeekStart] = useState(getMondayOfWeek(new Date()));
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const { data: currentUser } = useCurrentUser();
  const role = currentUser?.member?.role ?? null;
  const isClient = role === 'client_viewer';

  const { data: clients, loading: clientsLoading } = useClients();
  const { data: posts, loading: postsLoading, refetch: refetchPosts } = usePosts();

  const weekEnd = useMemo(() => {
    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() + 6);
    return end;
  }, [currentWeekStart]);

  // Filter posts for the current week
  // Client viewers only see posts that have been internally approved (status = 'scheduled' or 'published')
  const weekPosts = useMemo(() => {
    const startKey = formatDateKey(currentWeekStart);
    const endKey = formatDateKey(weekEnd);
    return (posts || []).filter((p) => {
      if (!p.scheduled_date) return false;
      if (selectedClientId && p.client_id !== selectedClientId) return false;
      const key = formatDateKey(parseLocalDate(p.scheduled_date));
      if (key < startKey || key > endKey) return false;
      // Clients only see internally approved posts
      if (isClient && p.status !== 'scheduled' && p.status !== 'published' && p.approval_status !== 'approved') return false;
      return true;
    });
  }, [posts, currentWeekStart, weekEnd, selectedClientId, isClient]);

  const clientMap = useMemo(() => new Map((clients || []).map((c) => [c.id, c])), [clients]);

  const stats = useMemo(() => ({
    total: weekPosts.length,
    editing: weekPosts.filter((p) => getWorkflowStage(p) === 'editing').length,
    inReview: weekPosts.filter((p) => getWorkflowStage(p) === 'internal_review').length,
    clientReady: weekPosts.filter((p) => getWorkflowStage(p) === 'client_ready').length,
    approved: weekPosts.filter((p) => getWorkflowStage(p) === 'client_approved').length,
  }), [weekPosts]);

  const goToPreviousWeek = () => { const d = new Date(currentWeekStart); d.setDate(d.getDate() - 7); setCurrentWeekStart(getMondayOfWeek(d)); };
  const goToNextWeek = () => { const d = new Date(currentWeekStart); d.setDate(d.getDate() + 7); setCurrentWeekStart(getMondayOfWeek(d)); };

  return (
    <div className="space-y-6">
      {/* Sticky Header */}
      <div className="sticky-header sticky top-0 z-50 -mx-8 px-8 pt-7 pb-4" style={{ backgroundColor: 'var(--bg)' }}>
        <h1 className="text-2xl font-serif font-bold" style={{ color: 'var(--text-dark)' }}>🎨 Contenido</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-mid)' }}>
          {isClient ? 'Revisa y aprueba el contenido de tu marca' : 'Gestiona el flujo de aprobación de contenido'}
        </p>
      </div>

      {(clientsLoading || postsLoading) ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-10 rounded-xl" style={{ background: 'var(--glass-border)' }} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-64 rounded-xl" style={{ background: 'var(--glass-border)' }} />)}
          </div>
        </div>
      ) : (
      <>
      {/* Week navigation + Client filter */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={goToPreviousWeek} className="p-2 rounded-lg hover:opacity-70" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>◀</button>
          <h2 className="text-base font-serif font-semibold min-w-[200px] text-center" style={{ color: 'var(--text-dark)' }}>{formatWeekRange(currentWeekStart)}</h2>
          <button onClick={goToNextWeek} className="p-2 rounded-lg hover:opacity-70" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>▶</button>
        </div>
        <select value={selectedClientId || ''} onChange={(e) => setSelectedClientId(e.target.value || null)} className="px-3 py-1.5 rounded-xl text-sm border" style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)', color: 'var(--text-dark)' }}>
          <option value="">Todos los clientes</option>
          {(clients || []).map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
        </select>
      </div>

      {/* Stats */}
      <div className={`grid gap-3 ${isClient ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-5'}`}>
        <div className="p-3 rounded-2xl border text-center" style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)' }}>
          <p className="text-xs font-semibold" style={{ color: 'var(--text-mid)' }}>Total</p>
          <p className="text-xl font-serif font-bold mt-0.5" style={{ color: 'var(--text-dark)' }}>{stats.total}</p>
        </div>
        {!isClient && <>
          <div className="p-3 rounded-2xl border text-center" style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)' }}>
            <p className="text-xs font-semibold" style={{ color: 'var(--text-mid)' }}>En edición</p>
            <p className="text-xl font-serif font-bold mt-0.5" style={{ color: '#666' }}>{stats.editing}</p>
          </div>
          <div className="p-3 rounded-2xl border text-center" style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)' }}>
            <p className="text-xs font-semibold" style={{ color: 'var(--text-mid)' }}>Revisión interna</p>
            <p className="text-xl font-serif font-bold mt-0.5" style={{ color: '#5B21B6' }}>{stats.inReview}</p>
          </div>
          <div className="p-3 rounded-2xl border text-center" style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)' }}>
            <p className="text-xs font-semibold" style={{ color: 'var(--text-mid)' }}>Con cliente</p>
            <p className="text-xl font-serif font-bold mt-0.5" style={{ color: '#D97706' }}>{stats.clientReady}</p>
          </div>
        </>}
        <div className="p-3 rounded-2xl border text-center" style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)' }}>
          <p className="text-xs font-semibold" style={{ color: 'var(--text-mid)' }}>Aprobados</p>
          <p className="text-xl font-serif font-bold mt-0.5" style={{ color: '#059669' }}>{stats.approved}</p>
        </div>
      </div>

      {/* Posts Grid */}
      {weekPosts.length === 0 ? (
        <div className="p-12 rounded-2xl border text-center" style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)' }}>
          <p className="text-lg mb-2" style={{ color: 'var(--text-mid)' }}>📭</p>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-mid)' }}>
            {isClient ? 'No hay contenido pendiente de revisión esta semana' : 'No hay posts programados para esta semana'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {weekPosts.map((post) => (
            <PostCard key={post.id} post={post} client={clientMap.get(post.client_id)} role={role} onStatusChange={refetchPosts} />
          ))}
        </div>
      )}
      </>
      )}
    </div>
  );
}
