'use client';

import React, { useState, useMemo } from 'react';
import { useClients, usePosts, updatePost, createPostComment, usePostComments, useCurrentUser } from '@/lib/hooks';
import { POST_TYPE_CONFIG, FORMAT_CONFIG } from '@/types';
import type { Post, Client, PostType, PostFormat, ApprovalStatus } from '@/types';

const parseLocalDate = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d);
};

const APPROVAL_CONFIG: Record<ApprovalStatus, { label: string; bg: string; text: string; emoji: string }> = {
  pending: { label: 'Pendiente', bg: 'rgba(255, 180, 50, 0.15)', text: '#92400E', emoji: '🕐' },
  approved: { label: 'Aprobado', bg: 'rgba(16, 185, 129, 0.15)', text: '#065F46', emoji: '✅' },
  approved_with_changes: { label: 'Con cambios', bg: 'rgba(59, 130, 246, 0.15)', text: '#1E40AF', emoji: '📝' },
  rejected: { label: 'Rechazado', bg: 'rgba(239, 68, 68, 0.15)', text: '#991B1B', emoji: '❌' },
  review_1_1: { label: 'Revisión 1:1', bg: 'rgba(167, 139, 250, 0.15)', text: '#5B21B6', emoji: '🤝' },
};

function PortalPostCard({ post, client, onUpdate }: { post: Post; client?: Client; onUpdate: () => void }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const { data: comments, refetch: refetchComments } = usePostComments(showComments ? post.id : null);
  const { data: currentUser } = useCurrentUser();
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);

  const typeConfig = POST_TYPE_CONFIG[post.post_type as PostType];
  const formatConfig = FORMAT_CONFIG[post.format as PostFormat];
  const approvalConfig = APPROVAL_CONFIG[post.approval_status as ApprovalStatus] || APPROVAL_CONFIG.pending;

  const handleApproval = async (status: ApprovalStatus) => {
    setIsUpdating(true);
    try {
      await updatePost(post.id, {
        approval_status: status,
        ...(status === 'approved' ? { approved_at: new Date().toISOString() } : {}),
      });
      onUpdate();
      // Fire-and-forget notification
      fetch('/api/notify-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: post.id, new_status: status,
          post_name: post.name, client_name: client?.name,
          changed_by: currentUser?.member?.full_name,
        }),
      }).catch(() => {});
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleComment = async () => {
    if (!newComment.trim()) return;
    setSending(true);
    try {
      await createPostComment({
        post_id: post.id,
        content: newComment.trim(),
        is_client_comment: true,
        author_name: currentUser?.member?.full_name || null,
        author_email: null,
        author_member_id: currentUser?.member?.id || null,
      });
      setNewComment('');
      await refetchComments();
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)' }}>
      {/* Image */}
      {post.image_url && (
        <img src={post.image_url} alt={post.name || 'Post'} className="w-full h-56 object-cover" />
      )}

      <div className="p-5 space-y-4">
        {/* Status + platform */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {typeConfig && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{ background: `${typeConfig.color}20`, color: typeConfig.color }}>
                {typeConfig.label}
              </span>
            )}
            {formatConfig && (
              <span className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: 'var(--glass-border)', color: 'var(--text-mid)' }}>
                {formatConfig.label}
              </span>
            )}
            <span className="text-[10px] px-2 py-0.5 rounded-full capitalize"
              style={{ background: 'var(--glass-border)', color: 'var(--text-mid)' }}>
              {post.platform}
            </span>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: approvalConfig.bg, color: approvalConfig.text }}>
            {approvalConfig.emoji} {approvalConfig.label}
          </span>
        </div>

        {/* Title */}
        {post.name && (
          <h3 className="text-base font-serif font-bold" style={{ color: 'var(--text-dark)' }}>{post.name}</h3>
        )}

        {/* Copy */}
        <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-mid)' }}>
          {post.copy || '(sin contenido)'}
        </p>

        {/* CTA */}
        {post.cta && (
          <p className="text-sm font-semibold" style={{ color: 'var(--primary-deep)' }}>CTA: {post.cta}</p>
        )}

        {/* Date */}
        {post.scheduled_date && (
          <p className="text-xs" style={{ color: 'var(--text-light)' }}>
            📅 {parseLocalDate(post.scheduled_date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            {post.scheduled_time ? ` a las ${post.scheduled_time}` : ''}
          </p>
        )}

        {/* Approval Buttons */}
        <div className="flex flex-wrap gap-2 pt-3 border-t" style={{ borderColor: 'var(--glass-border)' }}>
          <button onClick={() => handleApproval('approved')} disabled={isUpdating || post.approval_status === 'approved'}
            className="flex-1 min-h-[48px] py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
            style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#065F46' }}>
            ✅ Aprobar
          </button>
          <button onClick={() => handleApproval('approved_with_changes')} disabled={isUpdating}
            className="flex-1 min-h-[48px] py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
            style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#1E40AF' }}>
            📝 Con cambios
          </button>
          <button onClick={() => handleApproval('rejected')} disabled={isUpdating}
            className="flex-1 min-h-[48px] py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
            style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#991B1B' }}>
            ❌ Rechazar
          </button>
        </div>

        {/* Comments */}
        <button onClick={() => setShowComments(!showComments)}
          className="text-xs font-semibold w-full text-left" style={{ color: 'var(--primary-deep)' }}>
          {showComments ? '▾ Ocultar comentarios' : '▸ Comentarios'}
        </button>

        {showComments && (
          <div className="space-y-2">
            {comments && comments.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {comments.map((c) => (
                  <div key={c.id} className="p-2 rounded-lg text-xs" style={{ background: 'var(--bg)', color: 'var(--text-mid)' }}>
                    <span className="font-semibold" style={{ color: 'var(--text-dark)' }}>{c.author_name || 'Usuario'}</span>
                    <span className="mx-1">·</span>
                    <span className="text-[10px]" style={{ color: 'var(--text-light)' }}>
                      {c.created_at ? new Date(c.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                    {c.is_client_comment && <span className="ml-1 text-[10px] px-1 rounded" style={{ background: 'var(--primary)', color: 'white' }}>cliente</span>}
                    <p className="mt-1">{c.content}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                placeholder="Escribe tu comentario..." className="flex-1 px-3 py-2 rounded-lg text-sm border"
                style={{ background: 'var(--bg)', borderColor: 'var(--glass-border)', color: 'var(--text-dark)' }} />
              <button onClick={handleComment} disabled={!newComment.trim() || sending}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: 'var(--gradient)' }}>
                {sending ? '...' : 'Enviar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ClientPortalPage() {
  const { data: clients, loading: clientsLoading } = useClients();
  const { data: posts, loading: postsLoading, refetch } = usePosts();
  const { data: currentUser } = useCurrentUser();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const clientMap = useMemo(() => new Map((clients || []).map((c) => [c.id, c])), [clients]);

  const filteredPosts = useMemo(() => {
    let result = posts || [];
    if (filter === 'pending') result = result.filter((p) => p.approval_status === 'pending' || p.approval_status === 'approved_with_changes');
    else if (filter === 'approved') result = result.filter((p) => p.approval_status === 'approved');
    else if (filter === 'rejected') result = result.filter((p) => p.approval_status === 'rejected');
    return result.sort((a, b) => {
      if (!a.scheduled_date) return 1;
      if (!b.scheduled_date) return -1;
      return a.scheduled_date.localeCompare(b.scheduled_date);
    });
  }, [posts, filter]);

  const stats = useMemo(() => ({
    total: (posts || []).length,
    pending: (posts || []).filter((p) => p.approval_status === 'pending' || p.approval_status === 'approved_with_changes').length,
    approved: (posts || []).filter((p) => p.approval_status === 'approved').length,
  }), [posts]);

  const clientNames = useMemo(() => {
    const names = new Set((clients || []).map((c) => c.name));
    return Array.from(names).join(', ');
  }, [clients]);

  if (clientsLoading || postsLoading) {
    return (
      <div className="space-y-6 animate-pulse max-w-3xl mx-auto px-4 pt-8">
        <div className="h-10 rounded-xl" style={{ background: 'var(--glass-border)' }} />
        <div className="h-64 rounded-xl" style={{ background: 'var(--glass-border)' }} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="pt-7 pb-2">
        <h1 className="text-2xl font-serif font-bold" style={{ color: 'var(--text-dark)' }}>
          Hola, {currentUser?.member?.full_name || 'Cliente'} 👋
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-mid)' }}>
          {clientNames ? `Revisa y aprueba el contenido de ${clientNames}` : 'Revisa y aprueba tu contenido'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => setFilter('all')}
          className={`p-3 rounded-2xl border text-center transition-all ${filter === 'all' ? 'ring-2' : ''}`}
          style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)', '--tw-ring-color': 'var(--primary)' } as React.CSSProperties}>
          <p className="text-xs font-semibold" style={{ color: 'var(--text-mid)' }}>Total</p>
          <p className="text-xl font-serif font-bold" style={{ color: 'var(--text-dark)' }}>{stats.total}</p>
        </button>
        <button onClick={() => setFilter('pending')}
          className={`p-3 rounded-2xl border text-center transition-all ${filter === 'pending' ? 'ring-2' : ''}`}
          style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)', '--tw-ring-color': '#D97706' } as React.CSSProperties}>
          <p className="text-xs font-semibold" style={{ color: 'var(--text-mid)' }}>Por revisar</p>
          <p className="text-xl font-serif font-bold" style={{ color: '#D97706' }}>{stats.pending}</p>
        </button>
        <button onClick={() => setFilter('approved')}
          className={`p-3 rounded-2xl border text-center transition-all ${filter === 'approved' ? 'ring-2' : ''}`}
          style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)', '--tw-ring-color': '#059669' } as React.CSSProperties}>
          <p className="text-xs font-semibold" style={{ color: 'var(--text-mid)' }}>Aprobados</p>
          <p className="text-xl font-serif font-bold" style={{ color: '#059669' }}>{stats.approved}</p>
        </button>
      </div>

      {/* Posts */}
      {filteredPosts.length === 0 ? (
        <div className="p-12 rounded-2xl border text-center" style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)' }}>
          <p className="text-4xl mb-3">📭</p>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-mid)' }}>
            {filter === 'all' ? 'No hay posts asignados' : `No hay posts ${filter === 'pending' ? 'pendientes' : filter === 'approved' ? 'aprobados' : 'rechazados'}`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <PortalPostCard key={post.id} post={post} client={clientMap.get(post.client_id)} onUpdate={refetch} />
          ))}
        </div>
      )}
    </div>
  );
}
