'use client';

import React, { useState } from 'react';
import { Send, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';
import type { Post } from '@/types';

interface PublishButtonProps {
  post: Post;
  clientId: string;
  onPublished: () => void;
}

/**
 * Button to publish a post directly to Instagram or Facebook via Meta Graph API.
 * Only visible when:
 *  - Post is in 'scheduled' or has approval_status 'approved'
 *  - Platform is 'instagram' or 'facebook'
 */
export function PublishButton({ post, clientId: _clientId, onPublished }: PublishButtonProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [result, setResult] = useState<{ url?: string; error?: string } | null>(null);

  // Only show for IG/FB posts that are ready
  const isPublishable =
    ['instagram', 'facebook'].includes(post.platform) &&
    (post.status === 'scheduled' || post.status === 'published' || post.approval_status === 'approved');

  if (!isPublishable) return null;

  // Already published
  if (post.published_url) {
    return (
      <a
        href={post.published_url}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
        style={{ background: 'rgba(16,185,129,0.12)', color: '#065F46' }}
      >
        <ExternalLink className="w-3.5 h-3.5" />
        Ver publicación
      </a>
    );
  }

  const handlePublish = async () => {
    setIsPublishing(true);
    setResult(null);

    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: post.id }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setResult({ error: data.error || 'Error desconocido al publicar' });
        return;
      }

      setResult({ url: data.published_url });
      onPublished();
    } catch (err) {
      setResult({ error: 'Error de red al publicar' });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <button
        onClick={handlePublish}
        disabled={isPublishing}
        className="w-full py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
        style={{
          background: post.platform === 'instagram'
            ? 'linear-gradient(135deg, #833AB4, #FD1D1D, #F77737)'
            : 'rgba(24,119,242,0.12)',
          color: post.platform === 'instagram' ? 'white' : '#1877F2',
        }}
      >
        {isPublishing ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Publicando...</>
        ) : (
          <><Send className="w-3.5 h-3.5" /> Publicar en {post.platform === 'instagram' ? 'Instagram' : 'Facebook'}</>
        )}
      </button>

      {result?.error && (
        <div className="flex items-start gap-1.5 p-2 rounded-lg text-[10px]" style={{ background: 'rgba(239,68,68,0.08)', color: '#DC2626' }}>
          <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>{result.error}</span>
        </div>
      )}

      {result?.url && (
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 p-2 rounded-lg text-[10px] font-semibold"
          style={{ background: 'rgba(16,185,129,0.08)', color: '#065F46' }}
        >
          <ExternalLink className="w-3 h-3" />
          Publicado correctamente — ver publicación
        </a>
      )}
    </div>
  );
}
