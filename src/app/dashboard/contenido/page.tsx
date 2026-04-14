'use client';

import React, { useState, useMemo } from 'react';
import { useClients, usePosts, updatePost, createPostComment, usePostComments, uploadAndAttachAsset } from '@/lib/hooks';
import { POST_TYPE_CONFIG, FORMAT_CONFIG } from '@/types';
import type { Post, Client, PostType, PostFormat, ApprovalStatus } from '@/types';

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Parse a date string as local time (avoids UTC offset issues with date-only strings) */
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

const APPROVAL_CONFIG: Record<ApprovalStatus, { label: string; bg: string; text: string; emoji: string }> = {
  pending: { label: 'Pendiente', bg: 'rgba(255, 180, 50, 0.15)', text: '#92400E', emoji: '🕐' },
  approved: { label: 'Aprobado', bg: 'rgba(16, 185, 129, 0.15)', text: '#065F46', emoji: '✅' },
  approved_with_changes: { label: 'Con cambios', bg: 'rgba(59, 130, 246, 0.15)', text: '#1E40AF', emoji: '📝' },
  rejected: { label: 'Rechazado', bg: 'rgba(239, 68, 68, 0.15)', text: '#991B1B', emoji: '❌' },
  review_1_1: { label: 'Revisión 1:1', bg: 'rgba(167, 139, 250, 0.15)', text: '#5B21B6', emoji: '🤝' },
};

// ─── Comment Section ───────────────────────────────────────────────────────

interface CommentSectionProps {
  postId: string;
}

function CommentSection({ postId }: CommentSectionProps) {
  const { data: comments, refetch: refetchComments } = usePostComments(postId);
  const [newComment, setNewComment] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setIsSending(true);
    try {
      await createPostComment({
        post_id: postId,
        content: newComment.trim(),
        is_client_comment: false,
        author_name: null,
        author_email: null,
        author_member_id: null,
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
      {/* Existing comments */}
      {comments && comments.length > 0 && (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {comments.map((c) => (
            <div
              key={c.id}
              className="p-2 rounded-lg text-xs"
              style={{ background: 'var(--bg)', color: 'var(--text-mid)' }}
            >
              <span className="font-semibold" style={{ color: 'var(--text-dark)' }}>
                {c.author_name || 'Usuario'}
              </span>
              <span className="mx-1">·</span>
              <span className="text-[10px]" style={{ color: 'var(--text-light)' }}>
                {c.created_at ? new Date(c.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
              <p className="mt-1">{c.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* New comment input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
          placeholder="Agregar comentario..."
          className="flex-1 px-3 py-1.5 rounded-lg text-xs border focus:outline-none focus:ring-2 transition-all"
          style={{ background: 'var(--bg)', borderColor: 'var(--glass-border)', color: 'var(--text-dark)' }}
        />
        <button
          onClick={handleAddComment}
          disabled={!newComment.trim() || isSending}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50 transition-all"
          style={{ background: 'var(--gradient)' }}
        >
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
  onStatusChange: () => void;
}

function PostCard({ post, client, onStatusChange }: PostCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const typeConfig = POST_TYPE_CONFIG[post.post_type as PostType];
  const formatConfig = FORMAT_CONFIG[post.format as PostFormat];
  const approvalConfig = APPROVAL_CONFIG[post.approval_status as ApprovalStatus] || APPROVAL_CONFIG.pending;

  const handleAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      await uploadAndAttachAsset(file, post.org_id, post.id);
      onStatusChange(); // refetch to show new image
    } catch (err) {
      console.error('Error uploading asset:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleApproval = async (status: ApprovalStatus) => {
    setIsUpdating(true);
    try {
      await updatePost(post.id, {
        approval_status: status,
        ...(status === 'approved' ? { approved_at: new Date().toISOString() } : {}),
      });
      onStatusChange();
    } catch (err) {
      console.error('Error updating approval:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div
      className="rounded-2xl border overflow-hidden transition-all"
      style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)' }}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,.pdf"
        className="hidden"
        onChange={handleAssetUpload}
      />

      {/* Post Image / Asset Preview */}
      {post.image_url ? (
        <div className="relative group">
          <img
            src={post.image_url}
            alt={post.name || 'Post'}
            className="w-full h-48 object-cover"
          />
          {/* Replace asset overlay */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1"
          >
            {isUploading ? '⏳ Subiendo...' : '🔄 Cambiar asset'}
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full h-32 flex flex-col items-center justify-center gap-2 transition-all hover:opacity-80 cursor-pointer"
          style={{ background: `${typeConfig?.color || '#D0D0D0'}15` }}
        >
          {isUploading ? (
            <>
              <span className="text-2xl animate-pulse">⏳</span>
              <span className="text-xs font-semibold" style={{ color: 'var(--text-mid)' }}>Subiendo asset...</span>
            </>
          ) : (
            <>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: typeConfig?.color || '#D0D0D0' }}
              >
                +
              </div>
              <span className="text-xs font-semibold" style={{ color: 'var(--text-mid)' }}>Agregar asset</span>
            </>
          )}
        </button>
      )}

      <div className="p-4 space-y-3">
        {/* Header: client + approval status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">{client?.emoji || '📱'}</span>
            <span className="text-xs font-semibold" style={{ color: 'var(--text-dark)' }}>
              {client?.name || 'Cliente'}
            </span>
          </div>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: approvalConfig.bg, color: approvalConfig.text }}
          >
            {approvalConfig.emoji} {approvalConfig.label}
          </span>
        </div>

        {/* Post name */}
        {post.name && (
          <h4 className="text-sm font-serif font-bold" style={{ color: 'var(--text-dark)' }}>
            {post.name}
          </h4>
        )}

        {/* Copy */}
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-mid)' }}>
          {post.copy || '(sin contenido)'}
        </p>

        {/* CTA */}
        {post.cta && (
          <p className="text-xs font-semibold" style={{ color: 'var(--primary-deep)' }}>
            CTA: {post.cta}
          </p>
        )}

        {/* Meta: type, format, platform, date */}
        <div className="flex flex-wrap gap-2">
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{ background: `${typeConfig?.color || '#D0D0D0'}20`, color: typeConfig?.color || '#666' }}
          >
            {typeConfig?.label || post.post_type}
          </span>
          {formatConfig && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: 'var(--glass-border)', color: 'var(--text-mid)' }}
            >
              {formatConfig.label}
            </span>
          )}
          <span
            className="text-[10px] px-2 py-0.5 rounded-full capitalize"
            style={{ background: 'var(--glass-border)', color: 'var(--text-mid)' }}
          >
            {post.platform}
          </span>
          {post.scheduled_date && (
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--glass-border)', color: 'var(--text-mid)' }}>
              {parseLocalDate(post.scheduled_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              {post.scheduled_time ? ` ${post.scheduled_time}` : ''}
            </span>
          )}
        </div>

        {/* Approval Actions — visible to everyone */}
        <div className="flex flex-wrap gap-2 pt-2 border-t" style={{ borderColor: 'var(--glass-border)' }}>
          <button
            onClick={() => handleApproval('approved')}
            disabled={isUpdating || post.approval_status === 'approved'}
            className="flex-1 min-h-[44px] py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
            style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#065F46' }}
          >
            ✅ Aprobar
          </button>
          <button
            onClick={() => handleApproval('approved_with_changes')}
            disabled={isUpdating}
            className="flex-1 min-h-[44px] py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
            style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#1E40AF' }}
          >
            📝 Con cambios
          </button>
          <button
            onClick={() => handleApproval('rejected')}
            disabled={isUpdating}
            className="flex-1 min-h-[44px] py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
            style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#991B1B' }}
          >
            ❌ Rechazar
          </button>
        </div>

        {/* Comments toggle */}
        <button
          onClick={() => setShowComments(!showComments)}
          className="text-xs font-semibold transition-all w-full text-left"
          style={{ color: 'var(--primary-deep)' }}
        >
          {showComments ? '▾ Ocultar comentarios' : '▸ Comentarios'}
        </button>

        {showComments && <CommentSection postId={post.id} />}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function ContenidoPage() {
  const [currentWeekStart, setCurrentWeekStart] = useState(getMondayOfWeek(new Date()));
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const { data: clients, loading: clientsLoading } = useClients();
  const { data: posts, loading: postsLoading, refetch: refetchPosts } = usePosts();

  const weekEnd = useMemo(() => {
    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() + 6);
    return end;
  }, [currentWeekStart]);

  // Filter posts for the current week
  const weekPosts = useMemo(() => {
    const startKey = formatDateKey(currentWeekStart);
    const endKey = formatDateKey(weekEnd);
    return (posts || []).filter((p) => {
      if (!p.scheduled_date) return false;
      if (selectedClientId && p.client_id !== selectedClientId) return false;
      const key = formatDateKey(parseLocalDate(p.scheduled_date));
      return key >= startKey && key <= endKey;
    });
  }, [posts, currentWeekStart, weekEnd, selectedClientId]);

  const clientMap = useMemo(() => new Map((clients || []).map((c) => [c.id, c])), [clients]);

  // Stats
  const stats = useMemo(() => ({
    total: weekPosts.length,
    pending: weekPosts.filter((p) => p.approval_status === 'pending' || p.approval_status === 'approved_with_changes').length,
    approved: weekPosts.filter((p) => p.approval_status === 'approved').length,
    rejected: weekPosts.filter((p) => p.approval_status === 'rejected').length,
  }), [weekPosts]);

  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(getMondayOfWeek(newDate));
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(getMondayOfWeek(newDate));
  };

  return (
    <div className="space-y-6">
      {/* Sticky Header */}
      <div className="sticky-header sticky top-0 z-50 -mx-8 px-8 pt-7 pb-4" style={{ backgroundColor: 'var(--bg)' }}>
        <h1 className="text-2xl font-serif font-bold" style={{ color: 'var(--text-dark)' }}>
          🎨 Contenido
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-mid)' }}>
          Revisa, aprueba y comenta los posts de la semana
        </p>
      </div>

      {(clientsLoading || postsLoading) ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-10 rounded-xl" style={{ background: 'var(--glass-border)' }} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 rounded-xl" style={{ background: 'var(--glass-border)' }} />
            ))}
          </div>
        </div>
      ) : (
      <>

      {/* Week navigation + Client filter */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={goToPreviousWeek}
            className="p-2 rounded-lg transition-all hover:opacity-70"
            style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}
          >
            ◀
          </button>
          <h2
            className="text-base font-serif font-semibold min-w-[200px] text-center"
            style={{ color: 'var(--text-dark)' }}
          >
            {formatWeekRange(currentWeekStart)}
          </h2>
          <button
            onClick={goToNextWeek}
            className="p-2 rounded-lg transition-all hover:opacity-70"
            style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}
          >
            ▶
          </button>
        </div>

        <select
          value={selectedClientId || ''}
          onChange={(e) => setSelectedClientId(e.target.value || null)}
          className="px-3 py-1.5 rounded-xl text-sm border focus:outline-none focus:ring-2 transition-all"
          style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)', color: 'var(--text-dark)' }}
        >
          <option value="">Todos los clientes</option>
          {(clients || []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji} {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'var(--text-dark)' },
          { label: 'Pendientes', value: stats.pending, color: '#D97706' },
          { label: 'Aprobados', value: stats.approved, color: '#059669' },
          { label: 'Rechazados', value: stats.rejected, color: '#DC2626' },
        ].map((s) => (
          <div
            key={s.label}
            className="p-3 rounded-2xl border text-center"
            style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)' }}
          >
            <p className="text-xs font-semibold" style={{ color: 'var(--text-mid)' }}>{s.label}</p>
            <p className="text-xl font-serif font-bold mt-0.5" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Posts Grid */}
      {weekPosts.length === 0 ? (
        <div
          className="p-12 rounded-2xl border text-center"
          style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)' }}
        >
          <p className="text-lg mb-2" style={{ color: 'var(--text-mid)' }}>
            📭
          </p>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-mid)' }}>
            No hay posts programados para esta semana
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-light)' }}>
            Ve a Planificación para crear contenido nuevo
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {weekPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              client={clientMap.get(post.client_id)}
              onStatusChange={refetchPosts}
            />
          ))}
        </div>
      )}
      </>
      )}
    </div>
  );
}
