'use client';

import { useState } from 'react';
import { Sparkles, Wand2, Hash, Languages, ChevronDown, ChevronUp, Loader2, Copy, Check } from 'lucide-react';

interface AIToolbarProps {
  /** Current copy text from the editor */
  copy: string;
  /** Called when AI generates/modifies copy */
  onCopyChange: (newCopy: string) => void;
  /** Platform for context */
  platform?: string;
  /** Post type for context */
  postType?: string;
  /** Client ID for brand context */
  clientId?: string;
}

type ActivePanel = 'generate' | 'improve' | 'hashtags' | 'translate' | null;

export function AIToolbar({ copy, onCopyChange, platform, postType, clientId }: AIToolbarProps) {
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);

  const togglePanel = (panel: ActivePanel) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  };

  return (
    <div className="space-y-2">
      {/* Action buttons row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-light)' }}>
          <Sparkles className="w-3 h-3 inline mr-1" />AI
        </span>
        <AIActionButton icon={<Wand2 className="w-3.5 h-3.5" />} label="Generar" active={activePanel === 'generate'} onClick={() => togglePanel('generate')} />
        <AIActionButton icon={<Sparkles className="w-3.5 h-3.5" />} label="Mejorar" active={activePanel === 'improve'} onClick={() => togglePanel('improve')} disabled={!copy} />
        <AIActionButton icon={<Hash className="w-3.5 h-3.5" />} label="Hashtags" active={activePanel === 'hashtags'} onClick={() => togglePanel('hashtags')} disabled={!copy} />
        <AIActionButton icon={<Languages className="w-3.5 h-3.5" />} label="Traducir" active={activePanel === 'translate'} onClick={() => togglePanel('translate')} disabled={!copy} />
      </div>

      {/* Active panel */}
      {activePanel === 'generate' && (
        <GeneratePanel onCopyChange={onCopyChange} platform={platform} postType={postType} clientId={clientId} />
      )}
      {activePanel === 'improve' && (
        <ImprovePanel copy={copy} onCopyChange={onCopyChange} platform={platform} />
      )}
      {activePanel === 'hashtags' && (
        <HashtagsPanel copy={copy} onCopyChange={onCopyChange} platform={platform} />
      )}
      {activePanel === 'translate' && (
        <TranslatePanel copy={copy} onCopyChange={onCopyChange} platform={platform} />
      )}
    </div>
  );
}

function AIActionButton({ icon, label, active, onClick, disabled }: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all disabled:opacity-40"
      style={{
        background: active ? 'var(--gradient)' : 'white',
        color: active ? 'white' : 'var(--text-mid)',
        border: active ? 'none' : '1px solid var(--glass-border)',
      }}
    >
      {icon} {label}
      {active ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
    </button>
  );
}

// ─── Generate Panel ───────────────────────────────────────────────────────

function GeneratePanel({ onCopyChange, platform, postType, clientId }: {
  onCopyChange: (s: string) => void; platform?: string; postType?: string; clientId?: string;
}) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ copy: string; hashtags: string[]; cta_suggestion: string } | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, platform, post_type: postType, client_id: clientId }),
      });
      const data = await res.json();
      if (data.success) setResult(data);
    } catch (err) {
      console.error('Generate error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3 rounded-xl border space-y-3" style={{ background: 'var(--bg)', borderColor: 'var(--glass-border)' }}>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe qué tipo de post quieres... ej: 'Post motivacional sobre emprendimiento para Instagram'"
        rows={2}
        className="w-full px-3 py-2 rounded-lg text-xs border outline-none resize-none"
        style={{ background: 'white', borderColor: 'var(--glass-border)', color: 'var(--text-dark)' }}
      />
      <button
        onClick={handleGenerate}
        disabled={loading || !prompt.trim()}
        className="px-4 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50 flex items-center gap-1.5"
        style={{ background: 'var(--gradient)' }}
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
        {loading ? 'Generando...' : 'Generar copy'}
      </button>

      {result && (
        <div className="space-y-2 p-3 rounded-lg border" style={{ background: 'white', borderColor: 'var(--glass-border)' }}>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-dark)' }}>{result.copy}</p>
          {result.hashtags.length > 0 && (
            <p className="text-[10px] font-medium" style={{ color: 'var(--primary-deep)' }}>{result.hashtags.join(' ')}</p>
          )}
          {result.cta_suggestion && (
            <p className="text-[10px]" style={{ color: 'var(--text-mid)' }}>CTA sugerido: {result.cta_suggestion}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => {
                const full = result.hashtags.length > 0 ? `${result.copy}\n\n${result.hashtags.join(' ')}` : result.copy;
                onCopyChange(full);
              }}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white" style={{ background: 'var(--gradient)' }}
            >
              Usar este copy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Improve Panel ────────────────────────────────────────────────────────

function ImprovePanel({ copy, onCopyChange, platform }: {
  copy: string; onCopyChange: (s: string) => void; platform?: string;
}) {
  const [type, setType] = useState('general');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ improved_copy: string; changes_summary: string[] } | null>(null);

  const handleImprove = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/ai/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ copy, platform, improvement_type: type }),
      });
      const data = await res.json();
      if (data.success) setResult(data);
    } catch (err) {
      console.error('Improve error:', err);
    } finally {
      setLoading(false);
    }
  };

  const types = [
    { value: 'general', label: 'General' },
    { value: 'engagement', label: 'Más engagement' },
    { value: 'clarity', label: 'Más claro' },
    { value: 'seo', label: 'Mejor SEO' },
  ];

  return (
    <div className="p-3 rounded-xl border space-y-3" style={{ background: 'var(--bg)', borderColor: 'var(--glass-border)' }}>
      <div className="flex gap-2 flex-wrap">
        {types.map((t) => (
          <button
            key={t.value}
            onClick={() => setType(t.value)}
            className="px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all"
            style={{
              background: type === t.value ? 'var(--gradient)' : 'white',
              color: type === t.value ? 'white' : 'var(--text-mid)',
              border: type === t.value ? 'none' : '1px solid var(--glass-border)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <button
        onClick={handleImprove}
        disabled={loading}
        className="px-4 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50 flex items-center gap-1.5"
        style={{ background: 'var(--gradient)' }}
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
        {loading ? 'Mejorando...' : 'Mejorar copy'}
      </button>

      {result && (
        <div className="space-y-2 p-3 rounded-lg border" style={{ background: 'white', borderColor: 'var(--glass-border)' }}>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-dark)' }}>{result.improved_copy}</p>
          {result.changes_summary.length > 0 && (
            <ul className="text-[10px] space-y-0.5" style={{ color: 'var(--text-mid)' }}>
              {result.changes_summary.map((c, i) => <li key={i}>• {c}</li>)}
            </ul>
          )}
          <button onClick={() => onCopyChange(result.improved_copy)} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white" style={{ background: 'var(--gradient)' }}>
            Aplicar mejora
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Hashtags Panel ───────────────────────────────────────────────────────

function HashtagsPanel({ copy, onCopyChange, platform }: {
  copy: string; onCopyChange: (s: string) => void; platform?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/hashtags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ copy, platform, count: 12 }),
      });
      const data = await res.json();
      if (data.success) {
        setHashtags(data.hashtags);
        setSelected(new Set(data.hashtags));
      }
    } catch (err) {
      console.error('Hashtags error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleHashtag = (h: string) => {
    const next = new Set(selected);
    if (next.has(h)) next.delete(h); else next.add(h);
    setSelected(next);
  };

  return (
    <div className="p-3 rounded-xl border space-y-3" style={{ background: 'var(--bg)', borderColor: 'var(--glass-border)' }}>
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="px-4 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50 flex items-center gap-1.5"
        style={{ background: 'var(--gradient)' }}
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Hash className="w-3.5 h-3.5" />}
        {loading ? 'Generando...' : 'Sugerir hashtags'}
      </button>

      {hashtags.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {hashtags.map((h) => (
              <button
                key={h}
                onClick={() => toggleHashtag(h)}
                className="px-2 py-1 rounded-full text-[10px] font-semibold transition-all"
                style={{
                  background: selected.has(h) ? 'var(--gradient)' : 'white',
                  color: selected.has(h) ? 'white' : 'var(--primary-deep)',
                  border: selected.has(h) ? 'none' : '1px solid var(--glass-border)',
                }}
              >
                {h}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              const hashStr = Array.from(selected).join(' ');
              const newCopy = copy.includes('#') ? copy : `${copy}\n\n${hashStr}`;
              onCopyChange(newCopy);
            }}
            disabled={selected.size === 0}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--gradient)' }}
          >
            Agregar {selected.size} hashtags al copy
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Translate Panel ──────────────────────────────────────────────────────

function TranslatePanel({ copy, onCopyChange, platform }: {
  copy: string; onCopyChange: (s: string) => void; platform?: string;
}) {
  const [lang, setLang] = useState('en');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ translated_copy: string; source_language: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const languages = [
    { code: 'en', label: 'Inglés' }, { code: 'pt', label: 'Portugués' }, { code: 'fr', label: 'Francés' },
    { code: 'de', label: 'Alemán' }, { code: 'it', label: 'Italiano' }, { code: 'ja', label: 'Japonés' },
    { code: 'ko', label: 'Coreano' }, { code: 'zh', label: 'Chino' },
  ];

  const handleTranslate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ copy, target_language: lang, platform }),
      });
      const data = await res.json();
      if (data.success) setResult(data);
    } catch (err) {
      console.error('Translate error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result.translated_copy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-3 rounded-xl border space-y-3" style={{ background: 'var(--bg)', borderColor: 'var(--glass-border)' }}>
      <div className="flex gap-2 flex-wrap">
        {languages.map((l) => (
          <button
            key={l.code}
            onClick={() => setLang(l.code)}
            className="px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all"
            style={{
              background: lang === l.code ? 'var(--gradient)' : 'white',
              color: lang === l.code ? 'white' : 'var(--text-mid)',
              border: lang === l.code ? 'none' : '1px solid var(--glass-border)',
            }}
          >
            {l.label}
          </button>
        ))}
      </div>
      <button
        onClick={handleTranslate}
        disabled={loading}
        className="px-4 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50 flex items-center gap-1.5"
        style={{ background: 'var(--gradient)' }}
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Languages className="w-3.5 h-3.5" />}
        {loading ? 'Traduciendo...' : 'Traducir'}
      </button>

      {result && (
        <div className="space-y-2 p-3 rounded-lg border" style={{ background: 'white', borderColor: 'var(--glass-border)' }}>
          <p className="text-[10px] font-medium" style={{ color: 'var(--text-light)' }}>Idioma detectado: {result.source_language}</p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-dark)' }}>{result.translated_copy}</p>
          <div className="flex gap-2">
            <button onClick={() => onCopyChange(result.translated_copy)} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white" style={{ background: 'var(--gradient)' }}>
              Reemplazar copy
            </button>
            <button onClick={handleCopy} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border flex items-center gap-1" style={{ borderColor: 'var(--glass-border)', color: 'var(--text-mid)' }}>
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
