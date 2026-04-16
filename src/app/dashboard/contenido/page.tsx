'use client';

import React, { useState, useMemo } from 'react';
import { useClients, usePosts, useCurrentUser, usePostComments, updatePost, createPostComment, uploadAndAttachAsset } from '@/lib/hooks';
import { POST_TYPE_CONFIG, FORMAT_CONFIG } from '@/types';
import type { Post, Client, PostType, PostFormat, ApprovalStatus } from '@/types';
import { getWorkflowStage, WORKFLOW_CONFIG } from '@/lib/workflow';
import { KanbanBoard } from '@/components/contenido/KanbanBoard';
import { EmptyState } from '@/components/ui/EmptyState';
import { TipBanner } from '@/components/ui/TipBanner';
import {
  Palette, LayoutGrid, Columns3, ChevronLeft, ChevronRight,
  Upload, Download, RefreshCw, MessageSquare, ChevronDown, ChevronUp,
  Send, FileEdit, Search, Clock, CheckCircle2, Inbox,
} from 'lucide-react';

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
            <div key={c.id} className="p-2 rounded-lg text-xs" style={{ background: c.is_client_comment ? 'rgba(255,143,173,0.08)' : 'var(--bg)', color: 'var(--text-mid)' }}>
              <span className="font-semibold" style={{ color: 'var(--text-dark)' }}>{c.author_name || 'Usuario'}</span>
              <span className="mx-1">·</span>
              <span className="text-[10px]" style={{ color: 'var(--text-light)' }}>
                {c.created_at ? new Date(c.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
              {c.is_client_comment && <span className="ml-1 text-[10px] px-1 py-px rounded" style={{ background: 'rgba(255,143,173,0.15)', color: '#FF8FAD' }}>cliente</span>}
              <p className="mt-1">{c.content}</p>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddComment()} placeholder="Agregar comentario..." className="flex-1 px-3 py-1.5 rounded-lg text-xs border outline-none" style={{ background: 'white', borderColor: 'var(--glass-border)', color: 'var(--text-dark)' }} />
        <button onClick={handleAddComment} disabled={!newComment.trim() || isSending} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50 flex items-center gap-1" style={{ background: 'var(--gradient)' }}>
          <Send className="w-3 h-3" />
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
    <div className="rounded-2xl border overflow-hidden card-hover" style={{ background: 'white', borderColor: 'var(--glass-border)' }}>
      <input ref={fileInputRef} type="file" accept="image/*,video/*,.pdf" className="hidden" onChange={handleAssetUpload} />

      {/* Asset Preview */}
      {post.image_url ? (
        <div className="relative group">
          <img src={post.image_url} alt={post.name || 'Post'} className="w-full h-48 object-cover" />
          {isClient ? (
            <button onClick={handleDownloadAsset} className="absolute bottom-2 right-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-black/50 hover:bg-black/70 transition flex items-center gap-1">
              <Download className="w-3 h-3" /> Descargar
            </button>
          ) : (
            <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
              {isUploading ? <><RefreshCw className="w-3 h-3 animate-spin" /> Subiendo...</> : <><Upload className="w-3 h-3" /> Cambiar asset</>}
            </button>
          )}
        </div>
      ) : !isClient ? (
        <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-full h-32 flex flex-col items-center justify-center gap-2 hover:opacity-80 cursor-pointer" style={{ background: `${typeConfig?.color || '#D0D0D0'}08` }}>
          {isUploading ? (
            <><RefreshCw className="w-5 h-5 animate-spin" style={{ color: 'var(--text-mid)' }} /><span className="text-xs font-semibold" style={{ color: 'var(--text-mid)' }}>Subiendo...</span></>
          ) : (
            <><Upload className="w-5 h-5" style={{ color: typeConfig?.color || '#D0D0D0' }} /><span className="text-xs font-semibold" style={{ color: 'var(--text-mid)' }}>Agregar asset</span></>
          )}
        </button>
      ) : (
        <div className="w-full h-32 flex items-center justify-center" style={{ background: 'rgba(200,200,200,0.06)' }}>
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
          <span className="text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1" style={{ background: stageConfig.bg, color: stageConfig.text }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stageConfig.dotColor }} />
            {stageConfig.label}
          </span>
        </div>

        {post.name && <h4 className="text-sm font-serif font-bold" style={{ color: 'var(--text-dark)' }}>{post.name}</h4>}
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-mid)' }}>{post.copy || '(sin contenido)'}</p>
        {post.cta && <p className="text-xs font-semibold" style={{ color: 'var(--primary-deep)' }}>CTA: {post.cta}</p>}

        {/* Meta tags */}
        <div className="flex flex-wrap gap-1.5">
          {typeConfig && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${typeConfig.color}15`, color: typeConfig.color }}>
              {typeConfig.label}
            </span>
          )}
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
          {(isCreative || isAdmin) && stage === 'editing' && (
            <button onClick={() => handleWorkflowAction('in_production')} disabled={isUpdating} className="w-full py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-1.5" style={{ background: 'rgba(167,139,250,0.12)', color: '#5B21B6' }}>
              <FileEdit className="w-3.5 h-3.5" /> Listo para revisión interna
            </button>
          )}
          {isAdmin && stage === 'internal_review' && (
            <button onClick={() => handleWorkflowAction('scheduled')} disabled={isUpdating} className="w-full py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-1.5" style={{ background: 'rgba(16,185,129,0.12)', color: '#065F46' }}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Aprobación interna
            </button>
          )}
          {isClient && stage === 'client_ready' && (
            <button onClick={() => handleWorkflowAction('published', 'approved')} disabled={isUpdating} className="w-full py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-1.5" style={{ background: 'rgba(16,185,129,0.12)', color: '#065F46' }}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Aprobar
            </button>
          )}
          {isAdmin && stage === 'client_ready' && (
            <button onClick={() => handleWorkflowAction('published', 'approved')} disabled={isUpdating} className="w-full py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-1.5" style={{ background: 'rgba(16,185,129,0.12)', color: '#065F46' }}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Marcar como aprobado por cliente
            </button>
          )}
        </div>

        {/* Comments */}
        <button onClick={() => setShowComments(!showComments)} className="text-xs font-semibold w-full text-left flex items-center gap-1" style={{ color: 'var(--primary-deep)' }}>
          <MessageSquare className="w-3 h-3" />
          {showComments ? 'Ocultar comentarios' : 'Comentarios'}
          {showComments ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
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
  const [view, setView] = useState<'grid' | 'kanban'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('sg_contenido_view') as 'grid' | 'kanban') || 'grid';
    }
    return 'grid';
  });

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

  const weekPosts = useMemo(() => {
    const startKey = formatDateKey(currentWeekStart);
    const endKey = formatDateKey(weekEnd);
    return (posts || []).filter((p) => {
      if (!p.scheduled_date) return false;
      if (selectedClientId && p.client_id !== selectedClientId) return false;
      const key = formatDateKey(parseLocalDate(p.scheduled_date));
      if (key < startKey || key > endKey) return false;
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

  const toggleView = (v: 'grid' | 'kanban') => {
    setView(v);
    localStorage.setItem('sg_contenido_view', v);
  };

  return (
    <div className="space-y-6">
      {/* Sticky Header */}
      <div className="sticky-header sticky top-0 z-50 -mx-8 px-8 pt-7 pb-4" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5" style={{ color: 'var(--primary-deep)' }} />
              <h1 className="text-2xl font-serif font-bold" style={{ color: 'var(--text-dark)' }}>Contenido</h1>
            </div>
            <p className="text-sm mt-1" style={{ color: 'var(--text-mid)' }}>
              {isClient ? 'Revisa y aprueba el contenido de tu marca' : 'Gestiona el flujo de aprobación de contenido'}
            </p>
          </div>

          {/* View toggle */}
          {!isClient && (
            <div className="flex items-center gap-1 p-1 rounded-xl border" style={{ borderColor: 'var(--glass-border)', background: 'white' }}>
              <button
                onClick={() => toggleView('grid')}
                className="p-2 rounded-lg transition-all"
                style={{ background: view === 'grid' ? 'var(--gradient)' : 'transparent', color: view === 'grid' ? 'white' : 'var(--text-light)' }}
                title="Vista cuadrícula"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => toggleView('kanban')}
                className="p-2 rounded-lg transition-all"
                style={{ background: view === 'kanban' ? 'var(--gradient)' : 'transparent', color: view === 'kanban' ? 'white' : 'var(--text-light)' }}
                title="Vista Kanban"
              >
                <Columns3 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
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
          <button onClick={goToPreviousWeek} className="p-2 rounded-xl hover:opacity-70 transition" style={{ background: 'white', border: '1px solid var(--glass-border)' }}>
            <ChevronLeft className="w-4 h-4" style={{ color: 'var(--text-mid)' }} />
          </button>
          <h2 className="text-base font-serif font-semibold min-w-[200px] text-center" style={{ color: 'var(--text-dark)' }}>{formatWeekRange(currentWeekStart)}</h2>
          <button onClick={goToNextWeek} className="p-2 rounded-xl hover:opacity-70 transition" style={{ background: 'white', border: '1px solid var(--glass-border)' }}>
            <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-mid)' }} />
          </button>
        </div>
        <select value={selectedClientId || ''} onChange={(e) => setSelectedClientId(e.target.value || null)} className="px-3 py-2 rounded-xl text-sm border outline-none" style={{ background: 'white', borderColor: 'var(--glass-border)', color: 'var(--text-dark)' }}>
          <option value="">Todos los clientes</option>
          {(clients || []).map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
        </select>
      </div>

      {/* Stats */}
      <div className={`grid gap-3 ${isClient ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-5'}`}>
        <StatCard label="Total" value={stats.total} icon={<Inbox className="w-4 h-4" />} color="var(--text-dark)" />
        {!isClient && <>
          <StatCard label="En edición" value={stats.editing} icon={<FileEdit className="w-4 h-4" />} color="#666" />
          <StatCard label="Revisión interna" value={stats.inReview} icon={<Search className="w-4 h-4" />} color="#5B21B6" />
          <StatCard label="Con cliente" value={stats.clientReady} icon={<Clock className="w-4 h-4" />} color="#D97706" />
        </>}
        <StatCard label="Aprobados" value={stats.approved} icon={<CheckCircle2 className="w-4 h-4" />} color="#059669" />
      </div>

      {/* Tip for kanban */}
      {view === 'kanban' && !isClient && weekPosts.length > 0 && (
        <TipBanner dismissible>
          Arrastra las tarjetas entre columnas para cambiar su estado en el flujo de aprobación.
        </TipBanner>
      )}

      {/* Content */}
      {weekPosts.length === 0 ? (
        <EmptyState
          icon={<Inbox className="w-10 h-10" />}
          title={isClient ? 'No hay contenido pendiente esta semana' : 'No hay posts esta semana'}
          description={isClient ? 'Cuando tu agencia suba contenido para revisión, aparecerá aquí.' : 'Crea posts desde Planificación para verlos aquí.'}
        />
      ) : view === 'kanban' && !isClient ? (
        <KanbanBoard posts={weekPosts} clientMap={clientMap} role={role} onStatusChange={refetchPosts} />
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

// ─── Stat Card ─────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="p-3 rounded-2xl border text-center" style={{ background: 'white', borderColor: 'var(--glass-border)' }}>
      <div className="flex items-center justify-center gap-1.5 mb-1" style={{ color }}>
        {icon}
        <p className="text-xs font-semibold" style={{ color: 'var(--text-mid)' }}>{label}</p>
      </div>
      <p className="text-xl font-serif font-bold" style={{ color }}>{value}</p>
    </div>
  );
}
