'use client';

import { useState } from 'react';
import {
  ExternalLink, Loader2, CheckCircle2, AlertCircle, Camera, Sparkles, ArrowRight,
} from 'lucide-react';

interface DiscoveredPage {
  page_id: string;
  page_name: string;
  page_access_token: string;
  ig_business_account_id: string | null;
  ig_username: string | null;
  category: string | null;
}

interface DiscoverResponse {
  ok: boolean;
  user_name: string | null;
  long_lived_token: string | null;
  long_lived_expires_at: string | null;
  used_app_secret: boolean;
  pages: DiscoveredPage[];
  error?: string;
}

interface MetaConnectWizardProps {
  clientId: string;
  onConnected: () => void;
}

// Meta's Graph API Explorer with our preferred permissions pre-selected.
// The user still has to pick their Meta App there, but the permissions
// checklist is ready for them.
const GRAPH_EXPLORER_URL =
  'https://developers.facebook.com/tools/explorer/?' +
  new URLSearchParams({
    method: 'GET',
    path: 'me/accounts',
    version: 'v19.0',
  }).toString();

const REQUIRED_PERMISSIONS = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'instagram_basic',
  'instagram_content_publish',
];

export function MetaConnectWizard({ clientId, onConnected }: MetaConnectWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiscoverResponse | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedPages, setSavedPages] = useState<Set<string>>(new Set());
  const [permsCopied, setPermsCopied] = useState(false);

  const handleDiscover = async () => {
    if (!token.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/meta/wizard/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      });
      const body = (await res.json()) as DiscoverResponse;
      if (!res.ok || !body.ok) {
        setError(body.error || 'Error al obtener cuentas de Meta');
        return;
      }
      setResult(body);
      setStep(body.pages.length > 0 ? 3 : 2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const savePage = async (page: DiscoveredPage, platform: 'instagram' | 'facebook') => {
    setSaving(`${page.page_id}:${platform}`);
    try {
      // For Instagram: page_id stores the IG Business Account ID (that's what publish code uses).
      // For Facebook:  page_id stores the FB page ID.
      const savePageId = platform === 'instagram' ? page.ig_business_account_id : page.page_id;
      const savePageName =
        platform === 'instagram'
          ? `${page.page_name}${page.ig_username ? ` · @${page.ig_username}` : ''}`
          : page.page_name;

      const res = await fetch('/api/social-connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          platform,
          access_token: page.page_access_token,
          page_id: savePageId,
          page_name: savePageName,
        }),
      });
      const body = await res.json();
      if (!res.ok || body.error) {
        setError(body.error || 'Error al guardar la conexión');
        return;
      }
      setSavedPages((s) => new Set([...s, `${page.page_id}:${platform}`]));
      onConnected();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSaving(null);
    }
  };

  const copyPermissions = async () => {
    await navigator.clipboard.writeText(REQUIRED_PERMISSIONS.join(','));
    setPermsCopied(true);
    setTimeout(() => setPermsCopied(false), 2000);
  };

  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{
        background: 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 50%, #FDF4FF 100%)',
        border: '1px solid rgba(99,102,241,0.25)',
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)' }}
        >
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-base font-semibold" style={{ color: '#312E81' }}>
            Conectar con Meta (vía token)
          </h3>
          <p className="text-xs mt-0.5" style={{ color: '#6366F1' }}>
            Pega un token de Graph API Explorer; nosotros descubrimos las
            páginas e Instagram automáticamente.
          </p>
        </div>
      </div>

      {/* Step 1 — get token */}
      {step === 1 && (
        <div className="space-y-3">
          <div
            className="rounded-xl p-3 text-xs space-y-2"
            style={{ background: 'white', border: '1px solid var(--glass-border)', color: 'var(--text-mid)' }}
          >
            <p className="font-semibold" style={{ color: 'var(--text-dark)' }}>
              1. Abre Graph API Explorer
            </p>
            <a
              href={GRAPH_EXPLORER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
              style={{ background: '#1877F2' }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Abrir Graph API Explorer
            </a>

            <p className="font-semibold pt-2" style={{ color: 'var(--text-dark)' }}>
              2. En esa pestaña:
            </p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>Arriba a la derecha, elige tu <b>Meta App</b>.</li>
              <li>Click en <b>&ldquo;Get Token → Get User Access Token&rdquo;</b>.</li>
              <li>Marca estos permisos:</li>
            </ol>
            <div className="flex items-center gap-2">
              <code className="text-[10px] px-2 py-1 rounded bg-slate-100 flex-1 truncate" style={{ color: '#312E81' }}>
                {REQUIRED_PERMISSIONS.join(', ')}
              </code>
              <button
                onClick={copyPermissions}
                className="px-2 py-1 rounded text-[10px] font-semibold"
                style={{ background: '#6366F1', color: 'white' }}
              >
                {permsCopied ? '✓ Copiado' : 'Copiar'}
              </button>
            </div>
            <ol className="list-decimal list-inside space-y-0.5" start={4}>
              <li>Click <b>&ldquo;Generate Access Token&rdquo;</b> y acepta los permisos.</li>
              <li>Copia el token largo que aparece arriba del explorer.</li>
            </ol>

            <p className="font-semibold pt-2" style={{ color: 'var(--text-dark)' }}>
              3. Pégalo aquí:
            </p>
            <textarea
              value={token}
              onChange={(e) => setToken(e.target.value)}
              rows={3}
              placeholder="EAAJ..."
              className="w-full font-mono text-[10px] px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-200"
              style={{ borderColor: 'var(--glass-border)', color: 'var(--text-dark)' }}
            />
          </div>

          {error && (
            <div
              className="flex items-start gap-2 p-3 rounded-xl text-xs"
              style={{ background: 'rgba(239,68,68,0.08)', color: '#991B1B' }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleDiscover}
            disabled={loading || !token.trim()}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm hover:shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)' }}
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Buscando tus cuentas…</>
            ) : (
              <>Descubrir cuentas <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      )}

      {/* Step 2 — no pages */}
      {step === 2 && result && (
        <div
          className="rounded-xl p-4 space-y-2 text-xs"
          style={{ background: 'white', border: '1px solid rgba(239,68,68,0.2)', color: '#991B1B' }}
        >
          <p className="font-semibold">No encontramos Páginas de Facebook en tu cuenta.</p>
          <p style={{ color: 'var(--text-mid)' }}>
            Revisa que (1) el token tenga el permiso <code>pages_show_list</code>, (2) tu usuario
            esté agregado al Business Manager que administra la página de Boxo, y
            (3) hayas aceptado todos los permisos al generar el token.
          </p>
          <button
            onClick={() => { setStep(1); setResult(null); setToken(''); }}
            className="text-xs font-semibold underline"
            style={{ color: '#6366F1' }}
          >
            Volver a intentar
          </button>
        </div>
      )}

      {/* Step 3 — pick a page */}
      {step === 3 && result && (
        <div className="space-y-2">
          <div
            className="rounded-xl p-3 text-xs"
            style={{ background: 'white', border: '1px solid var(--glass-border)', color: 'var(--text-mid)' }}
          >
            {result.user_name && (
              <p>
                Hola <b style={{ color: 'var(--text-dark)' }}>{result.user_name}</b> — encontramos
                {' '}{result.pages.length} página{result.pages.length === 1 ? '' : 's'}.
              </p>
            )}
            {result.used_app_secret ? (
              <p className="mt-1" style={{ color: '#047857' }}>
                ✓ Token extendido a ~60 días.
              </p>
            ) : (
              <p className="mt-1" style={{ color: '#B45309' }}>
                ⚠ El token es corto (~1h). Define <code>META_APP_ID</code> y{' '}
                <code>META_APP_SECRET</code> en Vercel para extenderlo a 60 días automáticamente.
              </p>
            )}
          </div>

          {result.pages.map((page) => {
            const igKey = `${page.page_id}:instagram`;
            const fbKey = `${page.page_id}:facebook`;
            const hasIg = !!page.ig_business_account_id;
            return (
              <div
                key={page.page_id}
                className="rounded-xl p-3 space-y-2"
                style={{ background: 'white', border: '1px solid var(--glass-border)' }}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-dark)' }}>
                      {page.page_name}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-light)' }}>
                      FB page id · {page.page_id}
                      {page.category ? ` · ${page.category}` : ''}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Instagram button */}
                  <button
                    onClick={() => savePage(page, 'instagram')}
                    disabled={!hasIg || saving === igKey || savedPages.has(igKey)}
                    className="py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
                    style={{
                      background: savedPages.has(igKey)
                        ? 'rgba(16,185,129,0.12)'
                        : hasIg
                        ? 'linear-gradient(135deg, #E1306C 0%, #FD1D1D 50%, #F77737 100%)'
                        : '#F1F5F9',
                      color: savedPages.has(igKey)
                        ? '#065F46'
                        : hasIg
                        ? 'white'
                        : 'var(--text-light)',
                    }}
                    title={hasIg ? `Conectar ${page.ig_username ? '@' + page.ig_username : 'Instagram'}` : 'Esta página no tiene Instagram conectado'}
                  >
                    {savedPages.has(igKey) ? (
                      <><CheckCircle2 className="w-3.5 h-3.5" /> IG conectado</>
                    ) : saving === igKey ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando</>
                    ) : hasIg ? (
                      <><Camera className="w-3.5 h-3.5" /> {page.ig_username ? `@${page.ig_username}` : 'Conectar IG'}</>
                    ) : (
                      <>IG no conectado</>
                    )}
                  </button>

                  {/* Facebook button */}
                  <button
                    onClick={() => savePage(page, 'facebook')}
                    disabled={saving === fbKey || savedPages.has(fbKey)}
                    className="py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
                    style={{
                      background: savedPages.has(fbKey) ? 'rgba(16,185,129,0.12)' : '#1877F2',
                      color: savedPages.has(fbKey) ? '#065F46' : 'white',
                    }}
                  >
                    {savedPages.has(fbKey) ? (
                      <><CheckCircle2 className="w-3.5 h-3.5" /> FB conectado</>
                    ) : saving === fbKey ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando</>
                    ) : (
                      <>Conectar Facebook</>
                    )}
                  </button>
                </div>
              </div>
            );
          })}

          {error && (
            <div
              className="flex items-start gap-2 p-3 rounded-xl text-xs"
              style={{ background: 'rgba(239,68,68,0.08)', color: '#991B1B' }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={() => { setStep(1); setResult(null); setToken(''); setSavedPages(new Set()); }}
            className="w-full text-xs font-semibold underline py-2"
            style={{ color: '#6366F1' }}
          >
            Usar otro token
          </button>
        </div>
      )}
    </div>
  );
}
