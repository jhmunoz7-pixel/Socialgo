'use client';

import React, { useMemo } from 'react';
import { Post, PostType, POST_TYPE_CONFIG } from '@/types';

interface FeedPreviewProps {
  clientId: string;
  posts: Post[];
}

export default function FeedPreview({ clientId: _clientId, posts }: FeedPreviewProps) {
  // Calculate stats
  const stats = useMemo(() => {
    const typeBreakdown: Record<string, number> = {};
    let totalAiScore = 0;
    let scoredPosts = 0;

    posts.forEach((post) => {
      if (post.post_type) {
        typeBreakdown[post.post_type] = (typeBreakdown[post.post_type] || 0) + 1;
      }
      if (post.ai_score !== null) {
        totalAiScore += post.ai_score;
        scoredPosts += 1;
      }
    });

    return {
      totalPosts: posts.length,
      typeBreakdown,
      averageAiScore: scoredPosts > 0 ? (totalAiScore / scoredPosts).toFixed(1) : null,
    };
  }, [posts]);

  // Get gradient color for placeholder
  const getPlaceholderColor = (postType: PostType | null): string => {
    if (!postType || !POST_TYPE_CONFIG[postType]) {
      return 'linear-gradient(135deg, #93C5FD 0%, #C7D2FE 100%)';
    }
    const color = POST_TYPE_CONFIG[postType].color;
    return `linear-gradient(135deg, ${color}33 0%, ${color}66 100%)`;
  };

  // Format scheduled date
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Sin fecha';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-MX', {
        month: 'short',
        day: 'numeric',
        year: '2-digit',
      });
    } catch {
      return 'Sin fecha';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header with profile info */}
      <div
        style={{
          background: 'var(--surface)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--glass-border)',
          borderRadius: '16px',
          padding: '20px 24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <div
            style={{
              fontSize: '48px',
              lineHeight: '1',
            }}
          >
            📸
          </div>
          <div style={{ flex: 1 }}>
            <h2
              style={{
                margin: '0 0 4px 0',
                color: 'var(--text-dark)',
                fontSize: '20px',
                fontWeight: '600',
              }}
            >
              Preview del Feed
            </h2>
            <p
              style={{
                margin: 0,
                color: 'var(--text-mid)',
                fontSize: '14px',
              }}
            >
              Cómo se verá el Instagram con los posts planeados
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px',
          }}
        >
          <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
            <div style={{ color: 'var(--text-light)', fontSize: '12px', marginBottom: '4px' }}>
              Posts
            </div>
            <div style={{ color: 'var(--text-dark)', fontSize: '20px', fontWeight: '600' }}>
              {stats.totalPosts}
            </div>
          </div>

          <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
            <div style={{ color: 'var(--text-light)', fontSize: '12px', marginBottom: '4px' }}>
              Score IA
            </div>
            <div style={{ color: 'var(--text-dark)', fontSize: '20px', fontWeight: '600' }}>
              {stats.averageAiScore ? `${stats.averageAiScore}/10` : '—'}
            </div>
          </div>

          {Object.entries(stats.typeBreakdown).map(([type, count]) => (
            <div key={type} style={{ padding: '12px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
              <div style={{ color: 'var(--text-light)', fontSize: '12px', marginBottom: '4px' }}>
                {POST_TYPE_CONFIG[type as PostType]?.label || type}
              </div>
              <div style={{ color: 'var(--text-dark)', fontSize: '20px', fontWeight: '600' }}>
                {count}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Feed Grid */}
      {posts.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '12px',
          }}
        >
          {posts.map((post) => (
            <div
              key={post.id}
              style={{
                position: 'relative',
                aspectRatio: '1',
                borderRadius: '8px',
                overflow: 'hidden',
                background: post.image_url
                  ? `url(${post.image_url}) center/cover`
                  : getPlaceholderColor(post.post_type),
                cursor: 'pointer',
                transition: 'transform 0.2s',
                group: 'hover',
              } as React.CSSProperties}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.transform = 'scale(1)';
              }}
            >
              {/* Overlay on hover */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0, 0, 0, 0)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px',
                  opacity: 0,
                  transition: 'all 0.2s',
                  pointerEvents: 'none',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = 'rgba(0, 0, 0, 0.7)';
                  el.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = 'rgba(0, 0, 0, 0)';
                  el.style.opacity = '0';
                }}
              >
                {/* Type badge */}
                {post.post_type && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      background: POST_TYPE_CONFIG[post.post_type].color,
                      borderRadius: '4px',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: '600',
                      textAlign: 'center',
                    }}
                  >
                    {POST_TYPE_CONFIG[post.post_type].letter}
                  </div>
                )}

                {/* Platform badge */}
                {post.platform && (
                  <div
                    style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      background: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: '500',
                      textTransform: 'capitalize',
                    }}
                  >
                    {post.platform}
                  </div>
                )}

                {/* Scheduled date */}
                {post.scheduled_date && (
                  <div
                    style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      background: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: '#ffffff',
                      fontSize: '10px',
                      fontWeight: '500',
                    }}
                  >
                    {formatDate(post.scheduled_date)}
                  </div>
                )}

                {/* AI Score */}
                {post.ai_score !== null && (
                  <div
                    style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      background: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: '#ffffff',
                      fontSize: '10px',
                      fontWeight: '500',
                    }}
                  >
                    ⭐ {post.ai_score.toFixed(1)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            background: 'var(--surface)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border)',
            borderRadius: '16px',
            padding: '48px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: '48px' }}>📭</div>
          <div>
            <h3
              style={{
                margin: '0 0 8px 0',
                color: 'var(--text-dark)',
                fontSize: '18px',
                fontWeight: '600',
              }}
            >
              Sin posts planificados
            </h3>
            <p
              style={{
                margin: 0,
                color: 'var(--text-mid)',
                fontSize: '14px',
              }}
            >
              Crea y planifica posts para ver el preview del feed
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
