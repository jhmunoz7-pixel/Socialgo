'use client';

import React, { useState } from 'react';
import { useClients, usePosts } from '@/lib/hooks';
import { Post, Client, PostType, POST_TYPE_COLORS, Platform } from '@/types';

// ─── Types ──────────────────────────────────────────────────────────────────
interface ScoreResult {
  score: number;
  insights: string[];
}

// ─── AI Studio Page ─────────────────────────────────────────────────────────
export default function AIStudioPage() {
  const { data: clients, loading: clientsLoading } = useClients();
  const { data: posts, loading: postsLoading } = usePosts();

  // Form state
  const [selectedClient, setSelectedClient] = useState('');
  const [postType, setPostType] = useState<PostType>('educativo');
  const [platform, setPlatform] = useState<Platform>('instagram');
  const [objective, setObjective] = useState('');
  const [copy, setCopy] = useState('');

  // Result state
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [scoring, setScoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Recent scores from posts
  const recentScored = (posts || [])
    .filter((p) => p.ai_score !== null && p.ai_score !== undefined)
    .sort((a, b) => (b.ai_score ?? 0) - (a.ai_score ?? 0))
    .slice(0, 8);

  const clientMap = new Map((clients || []).map((c) => [c.id, c]));

  const handleScore = async () => {
    if (!copy.trim()) {
      setError('Escribe el copy del post para analizar');
      return;
    }
    if (copy.trim().length < 10) {
      setError('El copy debe tener al menos 10 caracteres');
      return;
    }

    const clientName =
      clients?.find((c) => c.id === selectedClient)?.name || 'Sin cliente';

    try {
      setScoring(true);
      setError(null);
      setResult(null);

      const res = await fetch('/api/ai-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: null, // ad-hoc scoring, no post saved yet
          copy: copy.trim(),
          objective: objective.trim() || 'Engagement general',
          post_type: postType,
          platform,
          client_name: clientName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al analizar el contenido');
      }

      setResult({ score: data.score, insights: data.insights });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setScoring(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#4CAF82';
    if (score >= 60) return '#FFB347';
    return '#FF7070';
  };

  const postTypes: PostType[] = [
    'educativo',
    'producto',
    'fun',
    'social',
    'behind_the_scenes',
    'ugc',
    'promo',
  ];

  const platforms: Platform[] = [
    'instagram',
    'tiktok',
    'facebook',
    'linkedin',
    'twitter',
    'youtube',
  ];

  const platformEmoji: Record<Platform, string> = {
    instagram: '📸',
    tiktok: '🎵',
    facebook: '👤',
    linkedin: '💼',
    twitter: '🐦',
    youtube: '▶️',
  };

  return (
    <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif font-bold" style={{ color: '#2A1F1A' }}>
          ⚡ AI Studio
        </h1>
        <p className="text-sm mt-1" style={{ color: '#7A6560' }}>
          Analiza y optimiza tu contenido con inteligencia artificial
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
        {/* Left: Scoring Form */}
        <div
          className="rounded-2xl border border-white/40 shadow-sm p-6 space-y-6"
          style={{
            background: 'rgba(255,248,243,0.7)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <h2 className="text-lg font-serif font-semibold" style={{ color: '#2A1F1A' }}>
            Analizar contenido
          </h2>

          {/* Client + Post Type row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#7A6560' }}>
                Cliente
              </label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full text-sm px-3 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-rose-300 transition-all"
                style={{
                  borderColor: 'rgba(255,180,150,0.3)',
                  background: 'rgba(255,255,255,0.6)',
                  color: '#2A1F1A',
                }}
              >
                <option value="">Seleccionar cliente</option>
                {(clients || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#7A6560' }}>
                Tipo de contenido
              </label>
              <select
                value={postType}
                onChange={(e) => setPostType(e.target.value as PostType)}
                className="w-full text-sm px-3 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-rose-300 transition-all"
                style={{
                  borderColor: 'rgba(255,180,150,0.3)',
                  background: 'rgba(255,255,255,0.6)',
                  color: '#2A1F1A',
                }}
              >
                {postTypes.map((pt) => (
                  <option key={pt} value={pt}>
                    {pt.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Platform + Objective row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#7A6560' }}>
                Plataforma
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform)}
                className="w-full text-sm px-3 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-rose-300 transition-all"
                style={{
                  borderColor: 'rgba(255,180,150,0.3)',
                  background: 'rgba(255,255,255,0.6)',
                  color: '#2A1F1A',
                }}
              >
                {platforms.map((p) => (
                  <option key={p} value={p}>
                    {platformEmoji[p]} {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#7A6560' }}>
                Objetivo
              </label>
              <input
                type="text"
                placeholder="ej. Generar engagement"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                className="w-full text-sm px-3 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-rose-300 transition-all"
                style={{
                  borderColor: 'rgba(255,180,150,0.3)',
                  background: 'rgba(255,255,255,0.6)',
                  color: '#2A1F1A',
                }}
              />
            </div>
          </div>

          {/* Copy textarea */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#7A6560' }}>
              Copy del post
            </label>
            <textarea
              value={copy}
              onChange={(e) => setCopy(e.target.value)}
              placeholder="Pega o escribe el copy que quieres analizar..."
              rows={6}
              className="w-full text-sm px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none transition-all"
              style={{
                borderColor: 'rgba(255,180,150,0.3)',
                background: 'rgba(255,255,255,0.6)',
                color: '#2A1F1A',
                lineHeight: '1.7',
              }}
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs" style={{ color: '#B8A9A4' }}>
                {copy.length} caracteres
              </span>
              <span className="text-xs" style={{ color: '#B8A9A4' }}>
                Mínimo 10 caracteres
              </span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(255,112,112,0.1)', color: '#D44' }}>
              {error}
            </div>
          )}

          {/* Score Button */}
          <button
            onClick={handleScore}
            disabled={scoring || copy.trim().length < 10}
            className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg active:scale-[0.98]"
            style={{
              background: scoring
                ? '#ccc'
                : 'linear-gradient(135deg, #FF8FAD 0%, #FFBA8A 100%)',
            }}
          >
            {scoring ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Analizando con AI...
              </span>
            ) : (
              '⚡ Analizar contenido'
            )}
          </button>

          {/* Result */}
          {result && (
            <div
              className="rounded-2xl border p-6 space-y-4 animate-[fadeIn_0.4s_ease-out]"
              style={{
                borderColor: 'rgba(255,180,150,0.3)',
                background: 'rgba(255,255,255,0.5)',
              }}
            >
              {/* Score Display */}
              <div className="flex items-baseline gap-4">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#7A6560' }}>
                  AI Score
                </span>
                <span
                  className="text-[48px] font-serif font-bold leading-none"
                  style={{ color: getScoreColor(result.score) }}
                >
                  {result.score}
                </span>
                <span className="text-sm" style={{ color: '#B8A9A4' }}>/ 100</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.06)' }}>
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${Math.min(result.score, 100)}%`,
                    background: `linear-gradient(90deg, ${getScoreColor(result.score)}, ${getScoreColor(result.score)}99)`,
                  }}
                />
              </div>

              {/* Insights */}
              <div className="space-y-2.5 pt-2">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#7A6560' }}>
                  Insights
                </span>
                {result.insights.map((insight, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-sm font-bold mt-0.5" style={{ color: '#FF8FAD' }}>
                      ▸
                    </span>
                    <span className="text-sm leading-relaxed" style={{ color: '#2A1F1A' }}>
                      {insight}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Leaderboard */}
        <div className="space-y-6">
          {/* Top Scored Posts */}
          <div
            className="rounded-2xl border border-white/40 shadow-sm p-6"
            style={{
              background: 'rgba(255,248,243,0.7)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <h3 className="text-base font-serif font-semibold mb-4" style={{ color: '#2A1F1A' }}>
              Top AI Scores
            </h3>

            {recentScored.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: '#B8A9A4' }}>
                Aún no hay posts con AI Score
              </p>
            ) : (
              <div className="space-y-3">
                {recentScored.map((post, idx) => {
                  const client = clientMap.get(post.client_id);
                  const score = post.ai_score ?? 0;
                  const typeColors = post.post_type
                    ? POST_TYPE_COLORS[post.post_type]
                    : { bg: '#eee', text: '#666' };

                  return (
                    <div
                      key={post.id}
                      className="flex items-center gap-3 p-3 rounded-xl transition-all hover:shadow-sm"
                      style={{ background: 'rgba(255,255,255,0.4)' }}
                    >
                      {/* Rank */}
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{
                          background:
                            idx === 0
                              ? 'linear-gradient(135deg, #FFD700, #FFA500)'
                              : idx === 1
                              ? 'linear-gradient(135deg, #C0C0C0, #A0A0A0)'
                              : idx === 2
                              ? 'linear-gradient(135deg, #CD7F32, #B87333)'
                              : 'rgba(0,0,0,0.06)',
                          color: idx < 3 ? '#fff' : '#7A6560',
                        }}
                      >
                        {idx + 1}
                      </span>

                      {/* Client emoji */}
                      <span className="text-lg flex-shrink-0">
                        {client?.emoji || '📄'}
                      </span>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate" style={{ color: '#2A1F1A' }}>
                          {client?.name || 'Sin cliente'}
                        </div>
                        {post.post_type && (
                          <span
                            className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5"
                            style={{
                              background: typeColors.bg,
                              color: typeColors.text,
                            }}
                          >
                            {post.post_type.replace('_', ' ')}
                          </span>
                        )}
                      </div>

                      {/* Score */}
                      <span
                        className="text-lg font-serif font-bold flex-shrink-0"
                        style={{ color: getScoreColor(score) }}
                      >
                        {score}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Tips */}
          <div
            className="rounded-2xl border border-white/40 shadow-sm p-6"
            style={{
              background: 'rgba(232,213,255,0.25)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <h3 className="text-base font-serif font-semibold mb-3" style={{ color: '#2A1F1A' }}>
              Tips para mejor score
            </h3>
            <div className="space-y-3">
              {[
                { emoji: '🎯', tip: 'Define un objetivo claro y específico para cada post' },
                { emoji: '💬', tip: 'Incluye un CTA que invite a la acción (comenta, guarda, comparte)' },
                { emoji: '🧠', tip: 'Usa hooks emocionales en las primeras líneas del copy' },
                { emoji: '📐', tip: 'Adapta el tono y formato a cada plataforma' },
                { emoji: '📊', tip: 'Los posts educativos y de valor tienden a tener mejor score' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <span className="text-base flex-shrink-0">{item.emoji}</span>
                  <span className="text-xs leading-relaxed" style={{ color: '#5A4A45' }}>
                    {item.tip}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
