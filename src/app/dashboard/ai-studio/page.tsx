'use client';

import React, { useState } from 'react';
import { useClients, usePosts } from '@/lib/hooks';
import { PostType, POST_TYPE_CONFIG, Platform } from '@/types';
import PermissionGate from '@/components/auth/PermissionGate';

// ─── Types ──────────────────────────────────────────────────────────────────
interface ScoreResult {
  score: number;
  insights: string[];
}

interface GeneratedCopy {
  id: string;
  text: string;
  tone: string;
  charCount: number;
}

type TabType = 'analizar' | 'generar' | 'hashtags';

// ─── Copy Generation Templates ──────────────────────────────────────────────
const generateCopyTemplates = (topic: string, tone: string): GeneratedCopy[] => {
  const toneMap: Record<string, { hook: string; benefit: string; cta: string }> = {
    profesional: {
      hook: 'Descubre cómo',
      benefit: 'mejora tu estrategia',
      cta: 'Conoce más aquí',
    },
    casual: {
      hook: 'Hey, te contamos',
      benefit: 'algo que te encantará',
      cta: 'Mira esto',
    },
    divertido: {
      hook: 'Spoiler:',
      benefit: 'te va a encantar',
      cta: 'Dale play',
    },
    inspiracional: {
      hook: 'Tu próximo logro empieza aquí',
      benefit: 'transforma tu vida',
      cta: 'Comienza hoy',
    },
    educativo: {
      hook: 'Aprende',
      benefit: 'habilidades que necesitas',
      cta: 'Descubre cómo',
    },
  };

  const toneConfig = toneMap[tone] || toneMap.profesional;

  const templates = [
    {
      id: '1',
      text: `${toneConfig.hook} ${topic}. Con nuestro sistema, podrás ${toneConfig.benefit} de manera efectiva. ${toneConfig.cta} 👉`,
      tone,
    },
    {
      id: '2',
      text: `📌 ${topic}\n\nSabemos que esto es lo que andas buscando. Hemos trabajado con miles de clientes que lograron resultados increíbles. ¿Quieres ser el próximo? ${toneConfig.cta} en el enlace.`,
      tone,
    },
    {
      id: '3',
      text: `Cuando ${topic}, todo cambia.\n\n✨ Descubre por qué más de 5000 personas confían en nosotros\n💪 Resultados probados en 30 días\n🚀 Soporte especializado\n\n${toneConfig.cta} hoy y obtén 20% de descuento.`,
      tone,
    },
  ];

  return templates.map((t) => ({
    ...t,
    charCount: t.text.length,
  }));
};

// ─── Hashtag Generator ──────────────────────────────────────────────────────
const generateHashtags = (topic: string) => {
  const keywords = topic.split(' ').filter((w) => w.length > 2);

  const popularHashtags = [
    '#FYP',
    '#ForYouPage',
    '#Trending',
    '#Viral',
    '#MustWatch',
  ];

  const nicheHashtags = keywords
    .slice(0, 3)
    .map((k) => `#${k.charAt(0).toUpperCase() + k.slice(1)}`)
    .concat([`#${topic.replace(/\s+/g, '')}`, '#ExpertoEnLa', '#LaúltimaVez']);

  const brandHashtags = [
    '#MarkaTuDiferencia',
    '#CreceConNosotros',
    '#SomosTúComunidad',
    '#JuntoSomosMás',
  ];

  return {
    populares: popularHashtags,
    nicho: nicheHashtags.filter((h) => h.length > 2).slice(0, 5),
    marca: brandHashtags,
  };
};

// ─── AI Studio Page ─────────────────────────────────────────────────────────
export default function AIStudioPage() {
  return (
    <PermissionGate requires="use_ai_studio">
      <AIStudioPageInner />
    </PermissionGate>
  );
}

function AIStudioPageInner() {
  const { data: clients } = useClients();
  const { data: posts } = usePosts();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('analizar');

  // Analizar Tab state
  const [selectedClient, setSelectedClient] = useState('');
  const [postType, setPostType] = useState<PostType>('educativo');
  const [platform, setPlatform] = useState<Platform>('instagram');
  const [objective, setObjective] = useState('');
  const [copy, setCopy] = useState('');
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [scoring, setScoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generar Tab state
  const [genClient, setGenClient] = useState('');
  const [genPostType, setGenPostType] = useState<PostType>('educativo');
  const [genPlatform, setGenPlatform] = useState<Platform>('instagram');
  const [genTone, setGenTone] = useState('profesional');
  const [genTopic, setGenTopic] = useState('');
  const [generatedCopies, setGeneratedCopies] = useState<GeneratedCopy[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Hashtags Tab state
  const [hashtagInput, setHashtagInput] = useState('');
  const [generatedHashtags, setGeneratedHashtags] = useState<ReturnType<typeof generateHashtags> | null>(null);
  const [copiedHashtag, setCopiedHashtag] = useState<string | null>(null);

  // Recent scores from posts
  const recentScored = (posts || [])
    .filter((p) => p.ai_score !== null && p.ai_score !== undefined)
    .sort((a, b) => (b.ai_score ?? 0) - (a.ai_score ?? 0))
    .slice(0, 8);

  const clientMap = new Map((clients || []).map((c) => [c.id, c]));

  // Calculate stats
  const stats = {
    totalScored: recentScored.length,
    avgScore:
      recentScored.length > 0
        ? Math.round(recentScored.reduce((sum, p) => sum + (p.ai_score || 0), 0) / recentScored.length)
        : 0,
    bestType: recentScored.length > 0
      ? recentScored.reduce(
          (best, p) => {
            if (!best || (p.ai_score || 0) > (best.ai_score || 0)) return p;
            return best;
          },
          recentScored[0]
        )?.post_type || null
      : null,
  };

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
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: null,
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

  const handleGenerate = async () => {
    if (!genTopic.trim()) {
      alert('Escribe el tema o producto para generar copy');
      return;
    }

    try {
      setIsGenerating(true);
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const generated = generateCopyTemplates(genTopic.trim(), genTone);
      setGeneratedCopies(generated);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseCopy = (copyText: string) => {
    setCopy(copyText);
    setActiveTab('analizar');
  };

  const handleGenerateHashtags = () => {
    if (!hashtagInput.trim()) {
      alert('Escribe un tema o copy para generar hashtags');
      return;
    }
    const hashtags = generateHashtags(hashtagInput.trim());
    setGeneratedHashtags(hashtags);
  };

  const handleCopyHashtag = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHashtag(text);
    setTimeout(() => setCopiedHashtag(null), 2000);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#4CAF82';
    if (score >= 60) return '#FFB347';
    return '#FF7070';
  };

  const postTypes: PostType[] = [
    'educativo',
    'ventas_promo',
    'fun_casual',
    'formal',
    'otro',
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

  const toneOptions = ['profesional', 'casual', 'divertido', 'inspiracional', 'educativo'];

  return (
    <div className="space-y-8">
      {/* Sticky Header */}
      <div className="sticky-header sticky top-0 z-50 -mx-8 px-8 pt-7 pb-4" style={{ backgroundColor: 'var(--bg)' }}>
        <h1 className="text-2xl font-serif font-bold" style={{ color: 'var(--text-dark)' }}>
          ⚡ AI Studio
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-mid)' }}>
          Analiza, genera y optimiza tu contenido con inteligencia artificial
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
        {/* Left: Main Content */}
        <div
          className="rounded-2xl border shadow-sm p-6"
          style={{
            background: 'var(--surface)',
            backdropFilter: 'blur(16px)',
            borderColor: 'var(--glass-border)',
          }}
        >
          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6 border-b" style={{ borderColor: 'var(--glass-border)' }}>
            {(['analizar', 'generar', 'hashtags'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-4 py-3 text-sm font-semibold uppercase tracking-wide border-b-2 transition-all duration-200"
                style={{
                  borderColor: activeTab === tab ? 'var(--primary-deep)' : 'transparent',
                  color: activeTab === tab ? 'var(--primary-deep)' : 'var(--text-mid)',
                }}
              >
                {tab === 'analizar' && '⚡ Analizar'}
                {tab === 'generar' && '✨ Generar'}
                {tab === 'hashtags' && '#️⃣ Hashtags'}
              </button>
            ))}
          </div>

          {/* Tab Content: Analizar */}
          {activeTab === 'analizar' && (
            <div className="space-y-6 animate-[fadeIn_0.2s]">
              <h2 className="text-lg font-serif font-semibold" style={{ color: 'var(--text-dark)' }}>
                Analizar contenido
              </h2>

              {/* Client + Post Type row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-mid)' }}>
                    Cliente
                  </label>
                  <select
                    value={selectedClient}
                    onChange={(e) => setSelectedClient(e.target.value)}
                    className="w-full text-sm px-3 py-2.5 rounded-xl border focus:outline-none focus:ring-2 transition-all"
                    style={{
                      borderColor: 'var(--glass-border)',
                      background: 'var(--bg)',
                      color: 'var(--text-dark)',
                      '--tw-ring-color': 'var(--primary)',
                    } as React.CSSProperties}
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
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-mid)' }}>
                    Tipo de contenido
                  </label>
                  <select
                    value={postType}
                    onChange={(e) => setPostType(e.target.value as PostType)}
                    className="w-full text-sm px-3 py-2.5 rounded-xl border focus:outline-none focus:ring-2 transition-all"
                    style={{
                      borderColor: 'var(--glass-border)',
                      background: 'var(--bg)',
                      color: 'var(--text-dark)',
                      '--tw-ring-color': 'var(--primary)',
                    } as React.CSSProperties}
                  >
                    {postTypes.map((pt) => (
                      <option key={pt} value={pt}>
                        {POST_TYPE_CONFIG[pt].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Platform + Objective row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-mid)' }}>
                    Plataforma
                  </label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as Platform)}
                    className="w-full text-sm px-3 py-2.5 rounded-xl border focus:outline-none focus:ring-2 transition-all"
                    style={{
                      borderColor: 'var(--glass-border)',
                      background: 'var(--bg)',
                      color: 'var(--text-dark)',
                      '--tw-ring-color': 'var(--primary)',
                    } as React.CSSProperties}
                  >
                    {platforms.map((p) => (
                      <option key={p} value={p}>
                        {platformEmoji[p]} {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-mid)' }}>
                    Objetivo
                  </label>
                  <input
                    type="text"
                    placeholder="ej. Generar engagement"
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    className="w-full text-sm px-3 py-2.5 rounded-xl border focus:outline-none focus:ring-2 transition-all"
                    style={{
                      borderColor: 'var(--glass-border)',
                      background: 'var(--bg)',
                      color: 'var(--text-dark)',
                      '--tw-ring-color': 'var(--primary)',
                    } as React.CSSProperties}
                  />
                </div>
              </div>

              {/* Copy textarea */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-mid)' }}>
                  Copy del post
                </label>
                <textarea
                  value={copy}
                  onChange={(e) => setCopy(e.target.value)}
                  placeholder="Pega o escribe el copy que quieres analizar..."
                  rows={6}
                  className="w-full text-sm px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 resize-none transition-all"
                  style={{
                    borderColor: 'var(--glass-border)',
                    background: 'var(--bg)',
                    color: 'var(--text-dark)',
                    lineHeight: '1.7',
                    '--tw-ring-color': 'var(--primary)',
                  } as React.CSSProperties}
                />
                <div className="flex justify-between mt-1">
                  <span className="text-xs" style={{ color: 'var(--text-light)' }}>
                    {copy.length} caracteres
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-light)' }}>
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
                className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg active:scale-[0.98]"
                style={{
                  background: scoring ? 'var(--text-light)' : 'var(--gradient)',
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
                  className="rounded-2xl border p-6 space-y-4 animate-[fadeIn_0.4s]"
                  style={{
                    borderColor: 'var(--glass-border)',
                    background: 'var(--bg)',
                  }}
                >
                  {/* Score Display */}
                  <div className="flex items-baseline gap-4">
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-mid)' }}>
                      AI Score
                    </span>
                    <span
                      className="text-[48px] font-serif font-bold leading-none"
                      style={{ color: getScoreColor(result.score) }}
                    >
                      {result.score}
                    </span>
                    <span className="text-sm" style={{ color: 'var(--text-light)' }}>
                      / 100
                    </span>
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
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-mid)' }}>
                      Insights
                    </span>
                    {result.insights.map((insight, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-sm font-bold mt-0.5" style={{ color: 'var(--primary-deep)' }}>
                          ▸
                        </span>
                        <span className="text-sm leading-relaxed" style={{ color: 'var(--text-dark)' }}>
                          {insight}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab Content: Generar */}
          {activeTab === 'generar' && (
            <div className="space-y-6 animate-[fadeIn_0.2s]">
              <h2 className="text-lg font-serif font-semibold" style={{ color: 'var(--text-dark)' }}>
                Generar copy con AI
              </h2>

              {/* Client + Post Type row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-mid)' }}>
                    Cliente (opcional)
                  </label>
                  <select
                    value={genClient}
                    onChange={(e) => setGenClient(e.target.value)}
                    className="w-full text-sm px-3 py-2.5 rounded-xl border focus:outline-none focus:ring-2 transition-all"
                    style={{
                      borderColor: 'var(--glass-border)',
                      background: 'var(--bg)',
                      color: 'var(--text-dark)',
                      '--tw-ring-color': 'var(--primary)',
                    } as React.CSSProperties}
                  >
                    <option value="">Todos los clientes</option>
                    {(clients || []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.emoji} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-mid)' }}>
                    Tipo de contenido
                  </label>
                  <select
                    value={genPostType}
                    onChange={(e) => setGenPostType(e.target.value as PostType)}
                    className="w-full text-sm px-3 py-2.5 rounded-xl border focus:outline-none focus:ring-2 transition-all"
                    style={{
                      borderColor: 'var(--glass-border)',
                      background: 'var(--bg)',
                      color: 'var(--text-dark)',
                      '--tw-ring-color': 'var(--primary)',
                    } as React.CSSProperties}
                  >
                    {postTypes.map((pt) => (
                      <option key={pt} value={pt}>
                        {POST_TYPE_CONFIG[pt].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Platform + Tone row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-mid)' }}>
                    Plataforma
                  </label>
                  <select
                    value={genPlatform}
                    onChange={(e) => setGenPlatform(e.target.value as Platform)}
                    className="w-full text-sm px-3 py-2.5 rounded-xl border focus:outline-none focus:ring-2 transition-all"
                    style={{
                      borderColor: 'var(--glass-border)',
                      background: 'var(--bg)',
                      color: 'var(--text-dark)',
                      '--tw-ring-color': 'var(--primary)',
                    } as React.CSSProperties}
                  >
                    {platforms.map((p) => (
                      <option key={p} value={p}>
                        {platformEmoji[p]} {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-mid)' }}>
                    Tono
                  </label>
                  <select
                    value={genTone}
                    onChange={(e) => setGenTone(e.target.value)}
                    className="w-full text-sm px-3 py-2.5 rounded-xl border focus:outline-none focus:ring-2 transition-all"
                    style={{
                      borderColor: 'var(--glass-border)',
                      background: 'var(--bg)',
                      color: 'var(--text-dark)',
                      '--tw-ring-color': 'var(--primary)',
                    } as React.CSSProperties}
                  >
                    {toneOptions.map((t) => (
                      <option key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Topic textarea */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-mid)' }}>
                  Tema o producto
                </label>
                <textarea
                  value={genTopic}
                  onChange={(e) => setGenTopic(e.target.value)}
                  placeholder="Describe el tema o producto del que quieres generar copy..."
                  rows={4}
                  className="w-full text-sm px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 resize-none transition-all"
                  style={{
                    borderColor: 'var(--glass-border)',
                    background: 'var(--bg)',
                    color: 'var(--text-dark)',
                    lineHeight: '1.7',
                    '--tw-ring-color': 'var(--primary)',
                  } as React.CSSProperties}
                />
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !genTopic.trim()}
                className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg active:scale-[0.98]"
                style={{
                  background: isGenerating ? 'var(--text-light)' : 'var(--gradient)',
                }}
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generando copys...
                  </span>
                ) : (
                  '✨ Generar Copy'
                )}
              </button>

              {/* Generated Copys */}
              {generatedCopies.length > 0 && (
                <div className="space-y-4 animate-[fadeIn_0.3s]">
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-mid)' }}>
                    Opciones generadas
                  </p>
                  {generatedCopies.map((gen, idx) => (
                    <div
                      key={gen.id}
                      className="p-4 rounded-xl border space-y-3 transition-all duration-200 hover:shadow-sm"
                      style={{
                        borderColor: 'var(--glass-border)',
                        background: 'var(--bg)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-mid)' }}>
                          Opción {idx + 1}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'var(--glass-border)', color: 'var(--text-mid)' }}>
                          {gen.charCount} caracteres
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-dark)' }}>
                        {gen.text}
                      </p>
                      <button
                        onClick={() => handleUseCopy(gen.text)}
                        className="w-full py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
                        style={{
                          background: 'var(--primary)',
                          color: 'white',
                        }}
                      >
                        Usar este copy
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab Content: Hashtags */}
          {activeTab === 'hashtags' && (
            <div className="space-y-6 animate-[fadeIn_0.2s]">
              <h2 className="text-lg font-serif font-semibold" style={{ color: 'var(--text-dark)' }}>
                Generador de hashtags
              </h2>

              {/* Input */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-mid)' }}>
                  Tema o copy
                </label>
                <textarea
                  value={hashtagInput}
                  onChange={(e) => setHashtagInput(e.target.value)}
                  placeholder="Pega el copy o describe el tema para generar hashtags relevantes..."
                  rows={4}
                  className="w-full text-sm px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 resize-none transition-all"
                  style={{
                    borderColor: 'var(--glass-border)',
                    background: 'var(--bg)',
                    color: 'var(--text-dark)',
                    lineHeight: '1.7',
                    '--tw-ring-color': 'var(--primary)',
                  } as React.CSSProperties}
                />
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerateHashtags}
                disabled={!hashtagInput.trim()}
                className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg active:scale-[0.98]"
                style={{
                  background: 'var(--gradient)',
                }}
              >
                #️⃣ Generar hashtags
              </button>

              {/* Generated Hashtags */}
              {generatedHashtags && (
                <div className="space-y-4 animate-[fadeIn_0.3s]">
                  {/* Populares */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2.5" style={{ color: 'var(--text-mid)' }}>
                      📱 Populares
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {generatedHashtags.populares.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => handleCopyHashtag(tag)}
                          className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 hover:shadow-sm active:scale-[0.95] cursor-pointer"
                          style={{
                            background: 'var(--primary)',
                            color: 'white',
                            border: '1px solid',
                            borderColor: copiedHashtag === tag ? 'var(--primary-deep)' : 'var(--primary)',
                          }}
                        >
                          {copiedHashtag === tag ? '✓' : ''} {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Nicho */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2.5" style={{ color: 'var(--text-mid)' }}>
                      🎯 De nicho
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {generatedHashtags.nicho.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => handleCopyHashtag(tag)}
                          className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 hover:shadow-sm active:scale-[0.95] cursor-pointer"
                          style={{
                            background: 'var(--secondary)',
                            color: 'var(--text-dark)',
                            border: '1px solid',
                            borderColor: copiedHashtag === tag ? 'var(--secondary)' : 'transparent',
                          }}
                        >
                          {copiedHashtag === tag ? '✓' : ''} {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Marca */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2.5" style={{ color: 'var(--text-mid)' }}>
                      ⭐ De marca
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {generatedHashtags.marca.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => handleCopyHashtag(tag)}
                          className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 hover:shadow-sm active:scale-[0.95] cursor-pointer"
                          style={{
                            background: 'rgba(232,213,255,0.5)',
                            color: 'var(--text-dark)',
                            border: '1px solid',
                            borderColor: copiedHashtag === tag ? 'var(--accent)' : 'transparent',
                          }}
                        >
                          {copiedHashtag === tag ? '✓' : ''} {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(0,0,0,0.03)', color: 'var(--text-mid)' }}>
                    💡 Click en cualquier hashtag para copiar al portapapeles
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-6">
          {/* Top Scored Posts */}
          <div
            className="rounded-2xl border shadow-sm p-6"
            style={{
              background: 'var(--surface)',
              backdropFilter: 'blur(16px)',
              borderColor: 'var(--glass-border)',
            }}
          >
            <h3 className="text-base font-serif font-semibold mb-4" style={{ color: 'var(--text-dark)' }}>
              Top AI Scores
            </h3>

            {recentScored.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: 'var(--text-light)' }}>
                Aún no hay posts con AI Score
              </p>
            ) : (
              <div className="space-y-3">
                {recentScored.map((post, idx) => {
                  const client = clientMap.get(post.client_id);
                  const score = post.ai_score ?? 0;

                  return (
                    <div
                      key={post.id}
                      className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 hover:shadow-sm"
                      style={{ background: 'var(--bg)' }}
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
                          color: idx < 3 ? '#fff' : 'var(--text-mid)',
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
                        <div className="text-xs font-medium truncate" style={{ color: 'var(--text-dark)' }}>
                          {client?.name || 'Sin cliente'}
                        </div>
                        {post.post_type && (
                          <span
                            className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5"
                            style={{
                              background: POST_TYPE_CONFIG[post.post_type].color,
                              color: 'var(--text-dark)',
                            }}
                          >
                            {POST_TYPE_CONFIG[post.post_type].label}
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
            className="rounded-2xl border shadow-sm p-6"
            style={{
              background: 'rgba(232,213,255,0.25)',
              backdropFilter: 'blur(16px)',
              borderColor: 'var(--glass-border)',
            }}
          >
            <h3 className="text-base font-serif font-semibold mb-3" style={{ color: 'var(--text-dark)' }}>
              Tips para mejor score
            </h3>
            <div className="space-y-3">
              {[
                { emoji: '🎯', tip: 'Define un objetivo claro para cada post' },
                { emoji: '💬', tip: 'Incluye un CTA que invite a la acción' },
                { emoji: '🧠', tip: 'Usa hooks emocionales en las primeras líneas' },
                { emoji: '📐', tip: 'Adapta el tono a cada plataforma' },
                { emoji: '📊', tip: 'Los posts educativos tienden mejor score' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <span className="text-base flex-shrink-0">{item.emoji}</span>
                  <span className="text-xs leading-relaxed" style={{ color: 'var(--text-mid)' }}>
                    {item.tip}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats Card */}
          <div
            className="rounded-2xl border shadow-sm p-6"
            style={{
              background: 'var(--surface)',
              backdropFilter: 'blur(16px)',
              borderColor: 'var(--glass-border)',
            }}
          >
            <h3 className="text-base font-serif font-semibold mb-4" style={{ color: 'var(--text-dark)' }}>
              📊 Estadísticas
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-mid)' }}>
                  Posts analizados
                </span>
                <span className="text-lg font-serif font-bold" style={{ color: 'var(--primary-deep)' }}>
                  {stats.totalScored}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-mid)' }}>
                  Score promedio
                </span>
                <span className="text-lg font-serif font-bold" style={{ color: 'var(--primary-deep)' }}>
                  {stats.avgScore}
                </span>
              </div>
              {stats.bestType && (
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-mid)' }}>
                    Mejor tipo
                  </span>
                  <span
                    className="text-xs font-semibold px-2 py-1 rounded-full"
                    style={{
                      background: POST_TYPE_CONFIG[stats.bestType].color,
                      color: 'var(--text-dark)',
                    }}
                  >
                    {POST_TYPE_CONFIG[stats.bestType].label}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
