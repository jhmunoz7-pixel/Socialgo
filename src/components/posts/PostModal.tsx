'use client';

import React, { useState, useEffect } from 'react';
import { Post, Client, PostType, PostFormat, Platform, POST_TYPE_CONFIG, FORMAT_CONFIG, ApprovalStatus } from '@/types';
import { usePostComments, createPostComment, updatePost, useMembers } from '@/lib/hooks';

interface PostModalProps {
  post: Post | null;
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (postId: string, data: Partial<Post>) => void;
  mode?: 'edit' | 'create';
}

interface EditState {
  name: string;
  explanation: string;
  copy: string;
  cta: string;
  post_type: PostType | null;
  format: PostFormat | null;
  platform: Platform;
  inspo_url: string;
  internal_comments: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  assigned_to: string;
  approval_status: ApprovalStatus;
  approval_comments: string;
}

const APPROVAL_STATUS_CONFIG: Record<ApprovalStatus, { label: string; bg: string; text: string }> = {
  pending: { label: 'Pendiente', bg: '#FFE5B0', text: '#6B4423' },
  approved: { label: 'Aprobado', bg: '#B8E8C8', text: '#1F4D2F' },
  approved_with_changes: { label: 'Aprobado con cambios', bg: '#D0E8FF', text: '#0F3B5B' },
  rejected: { label: 'Rechazado', bg: '#FFD0D8', text: '#5B1322' },
  review_1_1: { label: 'Revisión 1:1', bg: '#E8D5FF', text: '#3B1D5B' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Borrador', color: '#D0D0D0' },
  planned: { label: 'Planificado', color: '#FFB347' },
  approved: { label: 'Aprobado', color: '#4CAF82' },
  approved_with_changes: { label: 'Aprobado con cambios', color: '#93C5FD' },
  rejected: { label: 'Rechazado', color: '#FF7070' },
  review_1_1: { label: 'Revisión 1:1', color: '#A78BFA' },
  in_production: { label: 'En producción', color: '#FFB347' },
  scheduled: { label: 'Programado', color: '#4CAF82' },
  published: { label: 'Publicado', color: '#4CAF82' },
  archived: { label: 'Archivado', color: '#B0B0B0' },
};

const getAIScoreColor = (score: number): string => {
  if (score >= 80) return '#4CAF82';
  if (score >= 60) return '#FFB347';
  return '#FF7070';
};

const AIScorePanel: React.FC<{ score: number | null }> = ({ score }) => {
  if (score === null || score === undefined) {
    return (
      <div className="mt-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: 'var(--text-mid)' }}>✦ AI Score</span>
        </div>
        <p className="text-sm mt-2" style={{ color: 'var(--text-light)' }}>No disponible</p>
      </div>
    );
  }

  const color = getAIScoreColor(score);

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-baseline gap-3">
        <span className="text-sm font-medium" style={{ color: 'var(--text-mid)' }}>✦ AI Score</span>
        <span className="text-[36px] font-bold" style={{ color }}>
          {score}
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--text-light)', opacity: 0.2 }}>
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${Math.min(score, 100)}%`,
            background: `linear-gradient(90deg, ${color}, ${color}aa)`,
          }}
        />
      </div>
    </div>
  );
};

export const PostModal: React.FC<PostModalProps> = ({
  post,
  client,
  isOpen,
  onClose,
  onSave,
  mode = 'edit',
}) => {
  const [activeTab, setActiveTab] = useState<'contenido' | 'programacion' | 'aprobacion'>('contenido');
  const [editState, setEditState] = useState<EditState>({
    name: '',
    explanation: '',
    copy: '',
    cta: '',
    post_type: null,
    format: null,
    platform: 'instagram',
    inspo_url: '',
    internal_comments: '',
    scheduled_date: '',
    scheduled_time: '',
    status: 'draft',
    assigned_to: '',
    approval_status: 'pending',
    approval_comments: '',
  });
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set());
  const [newComment, setNewComment] = useState('');
  const [savingComment, setSavingComment] = useState(false);

  const { data: comments, refetch: refetchComments } = usePostComments(post?.id || null);
  const { data: members } = useMembers();

  // Initialize edit state
  useEffect(() => {
    if (post) {
      setEditState({
        name: post.name || '',
        explanation: post.explanation || '',
        copy: post.copy || '',
        cta: post.cta || '',
        post_type: post.post_type,
        format: post.format,
        platform: post.platform || 'instagram',
        inspo_url: post.inspo_url || '',
        internal_comments: post.internal_comments || '',
        scheduled_date: post.scheduled_date?.split('T')[0] || '',
        scheduled_time: post.scheduled_time || '',
        status: post.status || 'draft',
        assigned_to: post.assigned_to || '',
        approval_status: post.approval_status || 'pending',
        approval_comments: post.approval_comments || '',
      });
      setChangedFields(new Set());
    } else if (mode === 'create') {
      setEditState({
        name: '',
        explanation: '',
        copy: '',
        cta: '',
        post_type: null,
        format: null,
        platform: 'instagram',
        inspo_url: '',
        internal_comments: '',
        scheduled_date: '',
        scheduled_time: '',
        status: 'draft',
        assigned_to: '',
        approval_status: 'pending',
        approval_comments: '',
      });
      setChangedFields(new Set());
    }
  }, [post, isOpen, mode]);

  const handleFieldChange = (field: string, value: any) => {
    setEditState((prev) => ({ ...prev, [field]: value }));
    setChangedFields((prev) => new Set(prev).add(field));
  };

  const handleSave = () => {
    if (!post && mode === 'edit') return;

    const saveData: Partial<Post> = {};
    changedFields.forEach((field) => {
      saveData[field as keyof Post] = (editState as any)[field];
    });

    if (post) {
      onSave(post.id, saveData);
    } else {
      onSave('', saveData);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !post) return;
    setSavingComment(true);
    try {
      await createPostComment({
        post_id: post.id,
        author_name: 'Team Member',
        author_email: null,
        author_member_id: null,
        content: newComment,
        is_client_comment: false,
      });
      setNewComment('');
      await refetchComments();
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setSavingComment(false);
    }
  };

  const handleApprovalAction = async (status: ApprovalStatus) => {
    if (!post) return;
    await updatePost(post.id, { approval_status: status });
    onSave(post.id, { approval_status: status });
  };

  if (!isOpen || (!post && mode === 'edit')) return null;

  const formattedDate = post?.created_at
    ? new Date(post.created_at).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })
    : 'Sin fecha';

  const PLATFORM_EMOJIS: Record<Platform, string> = {
    instagram: '📸',
    tiktok: '🎵',
    facebook: '📘',
    linkedin: '💼',
    twitter: '𝕏',
    youtube: '▶️',
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-lg"
      style={{ backgroundColor: 'rgba(42,31,26,0.45)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="rounded-3xl w-full max-w-[960px] max-h-[90vh] overflow-hidden shadow-2xl border flex flex-col"
        style={{
          background: 'var(--surface)',
          backdropFilter: 'blur(16px)',
          borderColor: 'var(--glass-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 border-b px-8 py-6 flex items-start justify-between z-10"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--glass-border)',
          }}
        >
          <div className="flex-1">
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-dark)' }}>
              {mode === 'create' ? 'Crear Post' : `Post · ${formattedDate}`}
            </h2>
            {post && client && (
              <p className="text-sm mt-1" style={{ color: 'var(--text-mid)' }}>
                {client.name} · {post.post_type || 'Sin tipo'}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ml-4 hover:opacity-70 transition-opacity"
            style={{ background: 'rgba(255, 255, 255, 0.1)' }}
            aria-label="Cerrar"
          >
            <span className="text-xl" style={{ color: 'var(--text-mid)' }}>×</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-[40%_60%] gap-8">
          {/* Left Column */}
          <div className="flex flex-col">
            <div
              className="w-full aspect-square rounded-2xl overflow-hidden flex items-center justify-center flex-shrink-0"
              style={{
                background: 'var(--gradient, linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%))',
              }}
            >
              {post?.image_url ? (
                <img
                  src={post.image_url}
                  alt="Post"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-6xl">📸</span>
              )}
            </div>
            <AIScorePanel score={post?.ai_score ?? null} />
          </div>

          {/* Right Column - Tabs */}
          <div className="flex flex-col">
            {/* Tab Navigation */}
            <div className="flex gap-1 border-b mb-6" style={{ borderColor: 'var(--glass-border)' }}>
              {(['contenido', 'programacion', 'aprobacion'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="px-4 py-3 text-sm font-medium transition-all"
                  style={{
                    color: activeTab === tab ? 'var(--text-dark)' : 'var(--text-light)',
                    borderBottom: activeTab === tab ? '2px solid var(--primary)' : 'none',
                    paddingBottom: activeTab === tab ? 'calc(0.75rem - 2px)' : '0.75rem',
                  }}
                >
                  {tab === 'contenido' && 'Contenido'}
                  {tab === 'programacion' && 'Programación'}
                  {tab === 'aprobacion' && 'Aprobación'}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">
              {/* CONTENIDO TAB */}
              {activeTab === 'contenido' && (
                <div className="space-y-6 pr-4">
                  <div>
                    <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text-mid)' }}>
                      Nombre del Post
                    </label>
                    <input
                      type="text"
                      value={editState.name}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                      placeholder="Ej: Promo de verano"
                      className="w-full mt-2 px-3 py-2 rounded-lg border"
                      style={{
                        background: 'var(--bg)',
                        borderColor: 'var(--glass-border)',
                        color: 'var(--text-dark)',
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text-mid)' }}>
                      Explicación/Objetivo
                    </label>
                    <input
                      type="text"
                      value={editState.explanation}
                      onChange={(e) => handleFieldChange('explanation', e.target.value)}
                      placeholder="¿Cuál es el propósito?"
                      className="w-full mt-2 px-3 py-2 rounded-lg border"
                      style={{
                        background: 'var(--bg)',
                        borderColor: 'var(--glass-border)',
                        color: 'var(--text-dark)',
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text-mid)' }}>
                      Copy
                    </label>
                    <textarea
                      value={editState.copy}
                      onChange={(e) => handleFieldChange('copy', e.target.value)}
                      placeholder="Contenido del post..."
                      className="w-full mt-2 px-3 py-2 rounded-lg border resize-none"
                      rows={4}
                      style={{
                        background: 'var(--bg)',
                        borderColor: 'var(--glass-border)',
                        color: 'var(--text-dark)',
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text-mid)' }}>
                      CTA (Call-to-Action)
                    </label>
                    <input
                      type="text"
                      value={editState.cta}
                      onChange={(e) => handleFieldChange('cta', e.target.value)}
                      placeholder="Ej: Haz clic aquí"
                      className="w-full mt-2 px-3 py-2 rounded-lg border"
                      style={{
                        background: 'var(--bg)',
                        borderColor: 'var(--glass-border)',
                        color: 'var(--text-dark)',
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text-mid)' }}>
                      Tipo de Contenido
                    </label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {(Object.entries(POST_TYPE_CONFIG) as Array<[PostType, any]>).map(([type, config]) => (
                        <button
                          key={type}
                          onClick={() => handleFieldChange('post_type', type)}
                          className="p-2 rounded-lg border transition-all text-xs font-medium"
                          style={{
                            background: editState.post_type === type ? config.color : 'var(--bg)',
                            borderColor: editState.post_type === type ? config.color : 'var(--glass-border)',
                            color: editState.post_type === type ? '#fff' : 'var(--text-dark)',
                          }}
                        >
                          {config.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text-mid)' }}>
                      Formato
                    </label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {(Object.entries(FORMAT_CONFIG) as Array<[PostFormat, any]>).map(([format, config]) => (
                        <button
                          key={format}
                          onClick={() => handleFieldChange('format', format)}
                          className="p-2 rounded-lg border transition-all text-xs font-medium"
                          style={{
                            background: editState.format === format ? 'var(--primary)' : 'var(--bg)',
                            borderColor: 'var(--glass-border)',
                            color: editState.format === format ? '#fff' : 'var(--text-dark)',
                          }}
                        >
                          {config.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text-mid)' }}>
                      Plataforma
                    </label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {(Object.entries(PLATFORM_EMOJIS) as Array<[Platform, string]>).map(([platform, emoji]) => (
                        <button
                          key={platform}
                          onClick={() => handleFieldChange('platform', platform)}
                          className="p-3 rounded-lg border transition-all text-2xl"
                          style={{
                            background: editState.platform === platform ? 'var(--primary)' : 'var(--bg)',
                            borderColor: editState.platform === platform ? 'var(--primary)' : 'var(--glass-border)',
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text-mid)' }}>
                      Inspo / Referencia
                    </label>
                    <input
                      type="url"
                      value={editState.inspo_url}
                      onChange={(e) => handleFieldChange('inspo_url', e.target.value)}
                      placeholder="https://..."
                      className="w-full mt-2 px-3 py-2 rounded-lg border"
                      style={{
                        background: 'var(--bg)',
                        borderColor: 'var(--glass-border)',
                        color: 'var(--text-dark)',
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text-mid)' }}>
                      Comentarios Internos
                    </label>
                    <textarea
                      value={editState.internal_comments}
                      onChange={(e) => handleFieldChange('internal_comments', e.target.value)}
                      placeholder="Notas internas..."
                      className="w-full mt-2 px-3 py-2 rounded-lg border resize-none"
                      rows={3}
                      style={{
                        background: 'var(--bg)',
                        borderColor: 'var(--glass-border)',
                        color: 'var(--text-dark)',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* PROGRAMACION TAB */}
              {activeTab === 'programacion' && (
                <div className="space-y-6 pr-4">
                  <div>
                    <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text-mid)' }}>
                      Fecha de Publicación
                    </label>
                    <input
                      type="date"
                      value={editState.scheduled_date}
                      onChange={(e) => handleFieldChange('scheduled_date', e.target.value)}
                      className="w-full mt-2 px-3 py-2 rounded-lg border"
                      style={{
                        background: 'var(--bg)',
                        borderColor: 'var(--glass-border)',
                        color: 'var(--text-dark)',
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text-mid)' }}>
                      Hora
                    </label>
                    <input
                      type="time"
                      value={editState.scheduled_time}
                      onChange={(e) => handleFieldChange('scheduled_time', e.target.value)}
                      className="w-full mt-2 px-3 py-2 rounded-lg border"
                      style={{
                        background: 'var(--bg)',
                        borderColor: 'var(--glass-border)',
                        color: 'var(--text-dark)',
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text-mid)' }}>
                      Estado
                    </label>
                    <select
                      value={editState.status}
                      onChange={(e) => handleFieldChange('status', e.target.value)}
                      className="w-full mt-2 px-3 py-2 rounded-lg border"
                      style={{
                        background: 'var(--bg)',
                        borderColor: 'var(--glass-border)',
                        color: 'var(--text-dark)',
                      }}
                    >
                      {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                        <option key={status} value={status}>
                          {config.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text-mid)' }}>
                      Asignado a
                    </label>
                    <select
                      value={editState.assigned_to}
                      onChange={(e) => handleFieldChange('assigned_to', e.target.value)}
                      className="w-full mt-2 px-3 py-2 rounded-lg border"
                      style={{
                        background: 'var(--bg)',
                        borderColor: 'var(--glass-border)',
                        color: 'var(--text-dark)',
                      }}
                    >
                      <option value="">Sin asignar</option>
                      {members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.full_name || 'Sin nombre'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* APROBACION TAB */}
              {activeTab === 'aprobacion' && post && (
                <div className="space-y-6 pr-4">
                  <div>
                    <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text-mid)' }}>
                      Estado de Aprobación
                    </label>
                    <div
                      className="mt-2 px-4 py-3 rounded-lg text-center font-bold"
                      style={{
                        background: APPROVAL_STATUS_CONFIG[editState.approval_status].bg,
                        color: APPROVAL_STATUS_CONFIG[editState.approval_status].text,
                      }}
                    >
                      {APPROVAL_STATUS_CONFIG[editState.approval_status].label}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text-mid)' }}>
                      Acciones
                    </label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <button
                        onClick={() => handleApprovalAction('approved')}
                        className="px-3 py-2 rounded-lg text-xs font-medium text-white transition-all"
                        style={{ background: '#4CAF82' }}
                      >
                        ✓ Aprobar
                      </button>
                      <button
                        onClick={() => handleApprovalAction('approved_with_changes')}
                        className="px-3 py-2 rounded-lg text-xs font-medium text-white transition-all"
                        style={{ background: '#FFB347' }}
                      >
                        ⟳ Con cambios
                      </button>
                      <button
                        onClick={() => handleApprovalAction('rejected')}
                        className="px-3 py-2 rounded-lg text-xs font-medium text-white transition-all"
                        style={{ background: '#FF7070' }}
                      >
                        ✕ Rechazar
                      </button>
                      <button
                        onClick={() => handleApprovalAction('review_1_1')}
                        className="px-3 py-2 rounded-lg text-xs font-medium text-white transition-all"
                        style={{ background: '#A78BFA' }}
                      >
                        ◉ Revisión 1:1
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text-mid)' }}>
                      Comentarios ({comments.length})
                    </label>
                    <div className="mt-2 space-y-3 max-h-48 overflow-y-auto rounded-lg p-3" style={{ background: 'var(--bg)' }}>
                      {comments.length === 0 ? (
                        <p className="text-xs" style={{ color: 'var(--text-light)' }}>Sin comentarios</p>
                      ) : (
                        comments.map((comment) => (
                          <div
                            key={comment.id}
                            className="p-2 rounded text-xs"
                            style={{
                              background: comment.is_client_comment ? 'rgba(100, 200, 255, 0.1)' : 'rgba(200, 200, 200, 0.1)',
                            }}
                          >
                            <div className="font-medium" style={{ color: 'var(--text-dark)' }}>
                              {comment.author_name || 'Anónimo'}
                            </div>
                            <div style={{ color: 'var(--text-light)' }}>
                              {new Date(comment.created_at).toLocaleDateString('es-MX')}
                            </div>
                            <div className="mt-1" style={{ color: 'var(--text-mid)' }}>{comment.content}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Agregar comentario..."
                      className="w-full px-3 py-2 rounded-lg border resize-none"
                      rows={2}
                      style={{
                        background: 'var(--bg)',
                        borderColor: 'var(--glass-border)',
                        color: 'var(--text-dark)',
                      }}
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || savingComment}
                      className="mt-2 w-full px-3 py-2 rounded-lg text-xs font-medium text-white transition-all disabled:opacity-50"
                      style={{ background: 'var(--primary)' }}
                    >
                      {savingComment ? 'Guardando...' : 'Enviar comentario'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="border-t px-8 py-4 flex gap-3 justify-end"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--glass-border)',
          }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium rounded-lg transition-all"
            style={{
              color: 'var(--text-dark)',
              background: 'var(--bg)',
              border: `1px solid var(--glass-border)`,
            }}
          >
            Cerrar
          </button>
          <button
            onClick={handleSave}
            disabled={changedFields.size === 0}
            className="px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--primary)' }}
          >
            {mode === 'create' ? 'Crear Post' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostModal;
