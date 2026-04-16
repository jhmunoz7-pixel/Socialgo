'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, MessageSquare, Send, Clock, Image, Eye, EyeOff } from 'lucide-react';
import { PlatformPreviewSelector } from '@/components/posts/PlatformPreviewSelector';

interface PostData {
  id: string;
  name: string | null;
  copy: string | null;
  cta: string | null;
  image_url: string | null;
  platform: string;
  post_type: string | null;
  format: string | null;
  scheduled_date: string | null;
  approval_status: string;
  client: { name: string; emoji: string; color: string } | null;
}

interface Comment {
  id: string;
  content: string;
  author_name: string | null;
  is_client_comment: boolean;
  created_at: string;
}

export function ClientApprovalView({ post, token }: { post: PostData; token: string }) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done'>(
    post.approval_status === 'approved' ? 'done' : 'idle'
  );
  const [approvalChoice, setApprovalChoice] = useState<string | null>(
    post.approval_status !== 'pending' ? post.approval_status : null
  );
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [clientName, setClientName] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Fetch existing comments
  useEffect(() => {
    fetch(`/api/share/${token}/comments`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setComments(d.comments); })
      .catch(() => {});
  }, [token]);

  const handleApprove = async (choice: 'approved' | 'approved_with_changes' | 'rejected') => {
    setStatus('submitting');
    try {
      const res = await fetch(`/api/share/${token}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: choice,
          comments: feedbackText || null,
          approved_by: clientName || 'Cliente',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('done');
        setApprovalChoice(choice);
      } else {
        setStatus('idle');
      }
    } catch {
      setStatus('idle');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setIsSending(true);
    try {
      const res = await fetch(`/api/share/${token}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim(), author_name: clientName || 'Cliente' }),
      });
      const data = await res.json();
      if (data.success && data.comment) {
        setComments((prev) => [...prev, data.comment]);
        setNewComment('');
      }
    } catch {
    } finally {
      setIsSending(false);
    }
  };

  const alreadyDecided = post.approval_status !== 'pending';

  return (
    <div className="min-h-screen" style={{ background: '#F8FAFC' }}>
      {/* Header */}
      <header className="border-b px-6 py-4 flex items-center justify-between" style={{ background: 'white', borderColor: 'rgba(148,163,184,0.2)' }}>
        <div className="flex items-center gap-3">
          <img src="/socialgo-wordmark-light-cropped.svg" alt="SocialGo" style={{ height: 24 }} />
          <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366F1' }}>
            Portal de Aprobación
          </span>
        </div>
        {post.client && (
          <span className="text-sm font-medium" style={{ color: '#64748B' }}>
            {post.client.emoji} {post.client.name}
          </span>
        )}
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Success banner */}
        {status === 'done' && (
          <div className="mb-6 p-4 rounded-2xl border flex items-center gap-3" style={{
            background: approvalChoice === 'approved' ? 'rgba(16,185,129,0.08)' : approvalChoice === 'rejected' ? 'rgba(255,100,100,0.08)' : 'rgba(255,180,50,0.08)',
            borderColor: approvalChoice === 'approved' ? 'rgba(16,185,129,0.3)' : approvalChoice === 'rejected' ? 'rgba(255,100,100,0.3)' : 'rgba(255,180,50,0.3)',
          }}>
            <CheckCircle2 className="w-5 h-5" style={{ color: approvalChoice === 'approved' ? '#059669' : '#D97706' }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>
                {approvalChoice === 'approved' ? 'Contenido aprobado' : approvalChoice === 'rejected' ? 'Contenido rechazado' : 'Aprobado con cambios'}
              </p>
              <p className="text-xs" style={{ color: '#64748B' }}>Tu respuesta ha sido registrada. Gracias por tu feedback.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Asset Preview */}
          <div className="space-y-3">
            {/* Vista Previa toggle */}
            <button
              onClick={() => setShowPreview((v) => !v)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: showPreview ? 'rgba(99,102,241,0.15)' : 'rgba(200,200,200,0.12)',
                color: showPreview ? '#6366F1' : '#64748B',
              }}
            >
              {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showPreview ? 'Ocultar Vista Previa' : 'Vista Previa'}
            </button>

            {showPreview ? (
              <div className="rounded-2xl border p-4 flex items-center justify-center" style={{ background: '#F9F6F3', borderColor: 'rgba(148,163,184,0.2)', minHeight: 400 }}>
                <PlatformPreviewSelector
                  imageUrl={post.image_url}
                  copy={post.copy}
                  cta={post.cta}
                  clientName={post.client?.name || 'Cliente'}
                  clientEmoji={post.client?.emoji || '📱'}
                  platform={post.platform}
                  format={post.format}
                />
              </div>
            ) : (
              <div className="rounded-2xl border overflow-hidden" style={{ background: 'white', borderColor: 'rgba(148,163,184,0.2)' }}>
                {post.image_url ? (
                  <img src={post.image_url} alt={post.name || 'Post'} className="w-full object-contain max-h-[500px]" />
                ) : (
                  <div className="w-full h-64 flex items-center justify-center" style={{ background: 'rgba(200,200,200,0.06)' }}>
                    <Image className="w-12 h-12" style={{ color: '#94A3B8' }} />
                  </div>
                )}
                {/* Platform frame badge */}
                <div className="px-4 py-3 border-t flex items-center gap-2" style={{ borderColor: 'rgba(148,163,184,0.15)' }}>
                  <span className="text-xs px-2 py-1 rounded-full capitalize font-semibold" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366F1' }}>
                    {post.platform}
                  </span>
                  {post.format && (
                    <span className="text-xs px-2 py-1 rounded-full capitalize" style={{ background: 'rgba(200,200,200,0.15)', color: '#64748B' }}>
                      {post.format}
                    </span>
                  )}
                  {post.scheduled_date && (
                    <span className="text-xs flex items-center gap-1 ml-auto" style={{ color: '#64748B' }}>
                      <Clock className="w-3 h-3" />
                      {new Date(post.scheduled_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: Content + Actions */}
          <div className="space-y-5">
            {/* Post details */}
            <div className="rounded-2xl border p-5 space-y-4" style={{ background: 'white', borderColor: 'rgba(148,163,184,0.2)' }}>
              {post.name && (
                <h2 className="text-lg font-bold" style={{ color: '#0F172A', fontFamily: 'Fraunces, Georgia, serif' }}>{post.name}</h2>
              )}
              {post.copy && (
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#64748B' }}>{post.copy}</p>
              )}
              {post.cta && (
                <div className="px-3 py-2 rounded-xl" style={{ background: 'rgba(99,102,241,0.08)' }}>
                  <p className="text-xs font-semibold" style={{ color: '#6366F1' }}>Call to Action</p>
                  <p className="text-sm font-medium" style={{ color: '#0F172A' }}>{post.cta}</p>
                </div>
              )}
            </div>

            {/* Approval actions */}
            {!alreadyDecided && status !== 'done' && (
              <div className="rounded-2xl border p-5 space-y-4" style={{ background: 'white', borderColor: 'rgba(148,163,184,0.2)' }}>
                <h3 className="text-sm font-semibold" style={{ color: '#0F172A' }}>Tu decisión</h3>

                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Tu nombre (opcional)"
                  className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                  style={{ borderColor: 'rgba(148,163,184,0.2)', color: '#0F172A' }}
                />

                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Comentarios o feedback (opcional)"
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl text-sm border outline-none resize-none"
                  style={{ borderColor: 'rgba(148,163,184,0.2)', color: '#0F172A' }}
                />

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleApprove('approved')}
                    disabled={status === 'submitting'}
                    className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
                  >
                    <CheckCircle2 className="w-4 h-4" /> Aprobar
                  </button>
                  <button
                    onClick={() => handleApprove('approved_with_changes')}
                    disabled={status === 'submitting'}
                    className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:opacity-90"
                    style={{ background: 'rgba(255,180,50,0.15)', color: '#92400E' }}
                  >
                    <MessageSquare className="w-4 h-4" /> Aprobar con cambios
                  </button>
                  <button
                    onClick={() => handleApprove('rejected')}
                    disabled={status === 'submitting'}
                    className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:opacity-90"
                    style={{ background: 'rgba(255,100,100,0.1)', color: '#8A1F35' }}
                  >
                    <XCircle className="w-4 h-4" /> Rechazar
                  </button>
                </div>
              </div>
            )}

            {/* Comments */}
            <div className="rounded-2xl border p-5 space-y-3" style={{ background: 'white', borderColor: 'rgba(148,163,184,0.2)' }}>
              <h3 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: '#0F172A' }}>
                <MessageSquare className="w-4 h-4" /> Comentarios
              </h3>

              {comments.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {comments.map((c) => (
                    <div key={c.id} className="p-2.5 rounded-xl text-xs" style={{ background: c.is_client_comment ? 'rgba(99,102,241,0.06)' : '#F8FAFC', color: '#64748B' }}>
                      <span className="font-semibold" style={{ color: '#0F172A' }}>{c.author_name || 'Usuario'}</span>
                      <span className="mx-1 text-[10px]">·</span>
                      <span className="text-[10px]" style={{ color: '#94A3B8' }}>
                        {new Date(c.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <p className="mt-1">{c.content}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                  placeholder="Agregar comentario..."
                  className="flex-1 px-3 py-2 rounded-xl text-xs border outline-none"
                  style={{ borderColor: 'rgba(148,163,184,0.2)', color: '#0F172A' }}
                />
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || isSending}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-50 flex items-center gap-1"
                  style={{ background: 'linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)' }}
                >
                  <Send className="w-3 h-3" /> Enviar
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-4 text-center" style={{ borderColor: 'rgba(148,163,184,0.15)' }}>
        <p className="text-xs" style={{ color: '#94A3B8' }}>
          Powered by <span className="font-semibold" style={{ color: '#6366F1' }}>SocialGo</span> — Gestión de contenido para agencias
        </p>
      </footer>
    </div>
  );
}
