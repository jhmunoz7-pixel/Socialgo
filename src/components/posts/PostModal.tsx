'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Post, Client } from '@/types';

interface PostModalProps {
  post: Post | null;
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (postId: string, data: Partial<Post>) => void;
}

interface EditState {
  internal_comments: string;
  inspo_url: string;
}

const getAIScoreColor = (score: number): string => {
  if (score >= 80) return '#4CAF82'; // green
  if (score >= 60) return '#FFB347'; // amber
  return '#FF7070'; // red
};

const AIScorePanel: React.FC<{
  score: number | null;
  isLoading: boolean;
}> = ({ score, isLoading }) => {
  if (isLoading) {
    return (
      <div className="mt-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">✦ AI Score</span>
          <div className="w-8 h-8 rounded-full border-2 border-rose-deep border-t-transparent animate-spin" />
        </div>
        <p className="text-sm text-gray-500">Analizando...</p>
      </div>
    );
  }

  if (score === null || score === undefined) {
    return (
      <div className="mt-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">✦ AI Score</span>
        </div>
        <p className="text-sm text-gray-500 mt-2">No disponible</p>
      </div>
    );
  }

  const color = getAIScoreColor(score);
  const insights = [
    'Alta relevancia en narrativa',
    'Conexión emocional clara',
    'Visual muy atractivo',
  ];

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-baseline gap-3">
        <span className="text-sm font-medium text-gray-600">✦ AI Score</span>
        <span
          className="text-[36px] font-fraunces font-bold"
          style={{ color }}
        >
          {score}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${Math.min(score, 100)}%`,
            background: `linear-gradient(90deg, ${color}, ${color}aa)`,
          }}
        />
      </div>

      {/* Insights */}
      <div className="space-y-2">
        {insights.map((insight, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <span className="text-rose-deep text-sm font-bold mt-0.5">▸</span>
            <span className="text-xs leading-relaxed text-gray-700">{insight}</span>
          </div>
        ))}
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
}) => {
  const [editState, setEditState] = useState<EditState>({
    internal_comments: '',
    inspo_url: '',
  });

  const [changedFields, setChangedFields] = useState<Set<keyof EditState>>(
    new Set()
  );

  // Initialize edit state from post
  useEffect(() => {
    if (post) {
      setEditState({
        internal_comments: post.internal_comments || '',
        inspo_url: post.inspo_url || '',
      });
      setChangedFields(new Set());
    }
  }, [post, isOpen]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleFieldChange = (
    field: keyof EditState,
    value: string
  ) => {
    setEditState((prev) => ({ ...prev, [field]: value }));
    setChangedFields((prev) => new Set(prev).add(field));
  };

  const handleSave = () => {
    if (!post) return;

    const saveData: Partial<Post> = {};
    changedFields.forEach((field) => {
      saveData[field as keyof Post] = editState[field] as any;
    });

    onSave(post.id, saveData);
  };

  if (!isOpen || !post) return null;

  const formattedDate = post.created_at
    ? new Date(post.created_at).toLocaleDateString('es-ES', {
        month: 'short',
        day: 'numeric',
      })
    : 'Sin fecha';

  const contentTypeColor = 'bg-rose-light';

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 flex items-center justify-center z-500 backdrop-blur-lg"
        style={{
          backgroundColor: 'rgba(42,31,26,0.45)',
        }}
        onClick={handleOverlayClick}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Container */}
        <div
          className="bg-warm-white rounded-3xl max-w-[820px] w-full max-h-[90vh] overflow-y-auto shadow-lg border border-gray-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header - Sticky */}
          <div className="sticky top-0 bg-warm-white border-b border-gray-100 px-8 py-6 flex items-start justify-between z-10 rounded-t-3xl">
            <div className="flex-1">
              <h2 className="text-xl font-fraunces font-bold text-gray-900">
                Post · {formattedDate}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {client?.name} · {post.post_type || 'Sin tipo'}
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ml-4"
              style={{
                background:
                  'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(10px)',
              }}
              aria-label="Cerrar modal"
            >
              <span className="text-xl text-gray-600">×</span>
            </button>
          </div>

          {/* Modal Body - 2 Column Grid */}
          <div className="p-8 grid grid-cols-[1fr_1.2fr] gap-8">
            {/* Left Column */}
            <div className="flex flex-col">
              {/* Image Area */}
              <div
                className="w-full aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-rose-100 to-amber-100 flex items-center justify-center flex-shrink-0"
              >
                {post.image_url ? (
                  <img
                    src={post.image_url}
                    alt={post.objective || 'Post'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-6xl">📸</span>
                )}
              </div>

              {/* AI Score Panel */}
              <AIScorePanel
                score={post.ai_score ?? null}
                isLoading={false}
              />
            </div>

            {/* Right Column */}
            <div className="flex flex-col gap-6">
              {/* Objetivo del Post */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                  Objetivo del Post
                </label>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 min-h-10">
                  {post.objective || '—'}
                </p>
              </div>

              {/* Tipo de Contenido */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                  Tipo de Contenido
                </label>
                <div className="inline-flex">
                  <span className={`${contentTypeColor} text-xs font-semibold px-3 py-1 rounded-full text-gray-800`}>
                    {post.post_type || 'Sin tipo'}
                  </span>
                </div>
              </div>

              {/* Copy */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                  Copy
                </label>
                <p
                  className="text-xs text-gray-700 bg-gray-50 rounded-lg p-3 leading-[1.65]"
                  style={{ lineHeight: '1.65' }}
                >
                  {post.copy || '—'}
                </p>
              </div>

              {/* Inspo/Referencia */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                  Inspo / Referencia
                </label>
                {editState.inspo_url ? (
                  <a
                    href={editState.inspo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-rose-deep underline hover:opacity-70"
                  >
                    {editState.inspo_url}
                  </a>
                ) : (
                  <input
                    type="url"
                    placeholder="Agregar URL de referencia"
                    value={editState.inspo_url}
                    onChange={(e) => handleFieldChange('inspo_url', e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-deep focus:border-transparent"
                  />
                )}
              </div>

              {/* Comentarios Internos */}
              <div className="flex-1 flex flex-col">
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                  Comentarios Internos
                </label>
                <textarea
                  value={editState.internal_comments}
                  onChange={(e) => handleFieldChange('internal_comments', e.target.value)}
                  placeholder="Agregar notas internas..."
                  className="flex-1 text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-deep focus:border-transparent resize-none"
                />
              </div>

              {/* Button Group */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cerrar
                </button>
                <button
                  onClick={handleSave}
                  disabled={changedFields.size === 0}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-rose-deep rounded-lg hover:bg-rose-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
