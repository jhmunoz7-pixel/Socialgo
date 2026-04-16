'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useBrandKit, createBrandKit, updateBrandKit } from '@/lib/hooks';

interface BrandKitPanelProps {
  clientId: string;
  orgId: string;
}

interface Toast {
  type: 'success' | 'error';
  message: string;
}

const DEFAULT_QUESTIONNAIRE_KEYS = [
  'Tono de voz',
  'Palabras clave',
  'Qué evitar',
  'Estilo visual',
];

export default function BrandKitPanel({ clientId, orgId }: BrandKitPanelProps) {
  const { data: brandKit, loading: kitLoading, refetch } = useBrandKit(clientId);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  // Color palette state
  const [colors, setColors] = useState<{ name: string; hex: string }[]>([]);
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#000000');
  const [showColorForm, setShowColorForm] = useState(false);

  // Fonts state
  const [fonts, setFonts] = useState<{ name: string; usage: string }[]>([]);
  const [newFontName, setNewFontName] = useState('');
  const [newFontUsage, setNewFontUsage] = useState('');
  const [showFontForm, setShowFontForm] = useState(false);

  // Inspiration accounts state
  const [inspoAccounts, setInspoAccounts] = useState<string[]>([]);
  const [newInspoAccount, setNewInspoAccount] = useState('');
  const [inspoNotes, setInspoNotes] = useState('');

  // AI Brand Voice state
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceProfile, setVoiceProfile] = useState<Record<string, any> | null>(null);
  const [voiceExpanded, setVoiceExpanded] = useState(true);

  // Questionnaire state
  const [questionnaire, setQuestionnaire] = useState<Record<string, string>>({});

  // Initialize state from brand kit
  useEffect(() => {
    if (brandKit) {
      setColors(brandKit.color_palette || []);
      setFonts(brandKit.fonts || []);
      setInspoAccounts(brandKit.inspo_accounts || []);
      setInspoNotes(brandKit.inspo_notes || '');
      setQuestionnaire(
        (brandKit.style_questionnaire as Record<string, string>) || {}
      );
    } else {
      // Initialize with default questionnaire keys
      const defaultQuest: Record<string, string> = {};
      DEFAULT_QUESTIONNAIRE_KEYS.forEach((key) => {
        defaultQuest[key] = '';
      });
      setQuestionnaire(defaultQuest);
    }
  }, [brandKit]);

  // Load AI brand voice from brand kit
  useEffect(() => {
    if (
      brandKit?.style_questionnaire &&
      typeof brandKit.style_questionnaire === 'object' &&
      (brandKit.style_questionnaire as Record<string, any>).ai_brand_voice
    ) {
      setVoiceProfile((brandKit.style_questionnaire as Record<string, any>).ai_brand_voice);
    }
  }, [brandKit]);

  // Analyze brand voice with AI
  const analyzeBrandVoice = async () => {
    try {
      setVoiceLoading(true);
      const res = await fetch('/api/ai/brand-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast('error', data.error || 'Error al analizar la voz de marca');
        return;
      }
      const { success: _s, ...profile } = data;
      setVoiceProfile(profile);
      setVoiceExpanded(true);
      showToast('success', 'Voz de marca analizada exitosamente');
      await refetch();
    } catch (error) {
      console.error('Brand voice error:', error);
      showToast('error', 'Error al analizar la voz de marca');
    } finally {
      setVoiceLoading(false);
    }
  };

  // Show toast message
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // Color palette handlers
  const addColor = () => {
    if (!newColorName.trim() || !newColorHex.trim()) {
      showToast('error', 'Por favor completa el nombre y el color');
      return;
    }
    setColors([...colors, { name: newColorName, hex: newColorHex }]);
    setNewColorName('');
    setNewColorHex('#000000');
    setShowColorForm(false);
  };

  const deleteColor = (index: number) => {
    setColors(colors.filter((_, i) => i !== index));
  };

  // Fonts handlers
  const addFont = () => {
    if (!newFontName.trim() || !newFontUsage.trim()) {
      showToast('error', 'Por favor completa el nombre y uso de la fuente');
      return;
    }
    setFonts([...fonts, { name: newFontName, usage: newFontUsage }]);
    setNewFontName('');
    setNewFontUsage('');
    setShowFontForm(false);
  };

  const deleteFont = (index: number) => {
    setFonts(fonts.filter((_, i) => i !== index));
  };

  // Inspiration accounts handlers
  const addAccount = () => {
    if (!newInspoAccount.trim()) {
      showToast('error', 'Por favor ingresa un usuario de Instagram');
      return;
    }
    const handle = newInspoAccount.replace('@', '').trim();
    if (inspoAccounts.includes(handle)) {
      showToast('error', 'Esta cuenta ya está agregada');
      return;
    }
    setInspoAccounts([...inspoAccounts, handle]);
    setNewInspoAccount('');
  };

  const deleteAccount = (index: number) => {
    setInspoAccounts(inspoAccounts.filter((_, i) => i !== index));
  };

  // Questionnaire handler
  const updateQuestionnaire = (key: string, value: string) => {
    setQuestionnaire({ ...questionnaire, [key]: value });
  };

  const addCustomQuestion = () => {
    const newKey = `Pregunta ${Object.keys(questionnaire).length + 1}`;
    setQuestionnaire({ ...questionnaire, [newKey]: '' });
  };

  // Save brand kit
  const saveBrandKit = async () => {
    try {
      setSaving(true);

      if (!brandKit) {
        // Create new brand kit
        await createBrandKit({
          client_id: clientId,
          org_id: orgId,
          color_palette: colors,
          fonts,
          style_questionnaire: questionnaire,
          inspo_accounts: inspoAccounts,
          inspo_notes: inspoNotes,
        });
      } else {
        // Update existing brand kit
        await updateBrandKit(brandKit.id, {
          color_palette: colors,
          fonts,
          style_questionnaire: questionnaire,
          inspo_accounts: inspoAccounts,
          inspo_notes: inspoNotes,
        });
      }

      showToast('success', 'Brand Kit guardado exitosamente');
      await refetch();
    } catch (error) {
      console.error('Error saving brand kit:', error);
      showToast(
        'error',
        error instanceof Error ? error.message : 'Error al guardar'
      );
    } finally {
      setSaving(false);
    }
  };

  if (kitLoading) {
    return (
      <div
        style={{
          background: 'var(--surface)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--glass-border)',
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center',
          color: 'var(--text-mid)',
        }}
      >
        Cargando Brand Kit...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast notification */}
      {toast && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            background:
              toast.type === 'success'
                ? 'rgba(34, 197, 94, 0.1)'
                : 'rgba(239, 68, 68, 0.1)',
            border:
              toast.type === 'success'
                ? '1px solid rgba(34, 197, 94, 0.3)'
                : '1px solid rgba(239, 68, 68, 0.3)',
            color:
              toast.type === 'success'
                ? 'rgb(22, 163, 74)'
                : 'rgb(220, 38, 38)',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          {toast.message}
        </div>
      )}

      {/* Empty state */}
      {!brandKit && (
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
          <div style={{ fontSize: '48px' }}>📋</div>
          <div>
            <h3
              style={{
                margin: '0 0 8px 0',
                color: 'var(--text-dark)',
                fontSize: '18px',
                fontWeight: '600',
              }}
            >
              Sin Brand Kit
            </h3>
            <p
              style={{
                margin: 0,
                color: 'var(--text-mid)',
                fontSize: '14px',
              }}
            >
              Crea un Brand Kit para definir la identidad visual de este cliente
            </p>
          </div>
          <button
            onClick={saveBrandKit}
            disabled={saving}
            style={{
              marginTop: '16px',
              padding: '10px 20px',
              background: 'var(--primary)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontWeight: '600',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
              transition: 'all 0.2s',
              fontSize: '14px',
            }}
          >
            {saving ? 'Creando...' : 'Crear Brand Kit'}
          </button>
        </div>
      )}

      {brandKit && (
        <>
          {/* Color Palette Section */}
          <div
            style={{
              background: 'var(--surface)',
              backdropFilter: 'blur(16px)',
              border: '1px solid var(--glass-border)',
              borderRadius: '16px',
              padding: '24px',
            }}
          >
            <h2
              style={{
                margin: '0 0 16px 0',
                color: 'var(--text-dark)',
                fontSize: '16px',
                fontWeight: '600',
              }}
            >
              🎨 Paleta de Colores
            </h2>

            {/* Colors grid */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              {colors.map((color, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    background: 'var(--bg)',
                    borderRadius: '8px',
                    border: '1px solid var(--glass-border)',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      background: color.hex,
                      borderRadius: '6px',
                      border: '1px solid var(--glass-border)',
                    }}
                  />
                  <div>
                    <div
                      style={{
                        color: 'var(--text-dark)',
                        fontSize: '13px',
                        fontWeight: '500',
                      }}
                    >
                      {color.name}
                    </div>
                    <div
                      style={{
                        color: 'var(--text-light)',
                        fontSize: '12px',
                      }}
                    >
                      {color.hex}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteColor(index)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-light)',
                      fontSize: '16px',
                      padding: '4px',
                      marginLeft: '8px',
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Add color form */}
            {!showColorForm ? (
              <button
                onClick={() => setShowColorForm(true)}
                style={{
                  padding: '10px 16px',
                  background: 'var(--primary)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: '500',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.opacity = '0.9';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.opacity = '1';
                }}
              >
                + Agregar color
              </button>
            ) : (
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  marginTop: '12px',
                }}
              >
                <input
                  type="text"
                  placeholder="Ej: Primario"
                  value={newColorName}
                  onChange={(e) => setNewColorName(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '6px',
                    background: 'var(--bg)',
                    color: 'var(--text-dark)',
                    fontSize: '13px',
                    flex: 1,
                    fontFamily: 'inherit',
                  }}
                />
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={newColorHex}
                    onChange={(e) => setNewColorHex(e.target.value)}
                    style={{
                      width: '40px',
                      height: '32px',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="#000000"
                    value={newColorHex}
                    onChange={(e) => setNewColorHex(e.target.value)}
                    style={{
                      width: '80px',
                      padding: '8px 12px',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '6px',
                      background: 'var(--bg)',
                      color: 'var(--text-dark)',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>
                <button
                  onClick={addColor}
                  style={{
                    padding: '8px 16px',
                    background: 'var(--primary)',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white',
                    fontWeight: '500',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  ✓
                </button>
                <button
                  onClick={() => setShowColorForm(false)}
                  style={{
                    padding: '8px 16px',
                    background: 'var(--bg)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '6px',
                    color: 'var(--text-dark)',
                    fontWeight: '500',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Fonts Section */}
          <div
            style={{
              background: 'var(--surface)',
              backdropFilter: 'blur(16px)',
              border: '1px solid var(--glass-border)',
              borderRadius: '16px',
              padding: '24px',
            }}
          >
            <h2
              style={{
                margin: '0 0 16px 0',
                color: 'var(--text-dark)',
                fontSize: '16px',
                fontWeight: '600',
              }}
            >
              🔤 Tipografía
            </h2>

            {/* Fonts list */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              {fonts.map((font, index) => (
                <div
                  key={index}
                  style={{
                    padding: '12px',
                    background: 'var(--bg)',
                    borderRadius: '8px',
                    border: '1px solid var(--glass-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: 'var(--text-dark)',
                        fontSize: '13px',
                        fontWeight: '500',
                      }}
                    >
                      {font.name}
                    </div>
                    <div
                      style={{
                        color: 'var(--text-light)',
                        fontSize: '12px',
                        marginTop: '4px',
                      }}
                    >
                      {font.usage}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteFont(index)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-light)',
                      fontSize: '18px',
                      padding: '4px',
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Add font form */}
            {!showFontForm ? (
              <button
                onClick={() => setShowFontForm(true)}
                style={{
                  padding: '10px 16px',
                  background: 'var(--primary)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: '500',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.opacity = '0.9';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.opacity = '1';
                }}
              >
                + Agregar fuente
              </button>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  marginTop: '12px',
                }}
              >
                <input
                  type="text"
                  placeholder="Ej: Montserrat"
                  value={newFontName}
                  onChange={(e) => setNewFontName(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '6px',
                    background: 'var(--bg)',
                    color: 'var(--text-dark)',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                  }}
                />
                <input
                  type="text"
                  placeholder="Ej: Títulos y headings"
                  value={newFontUsage}
                  onChange={(e) => setNewFontUsage(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '6px',
                    background: 'var(--bg)',
                    color: 'var(--text-dark)',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                  }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={addFont}
                    style={{
                      flex: 1,
                      padding: '8px 16px',
                      background: 'var(--primary)',
                      border: 'none',
                      borderRadius: '6px',
                      color: 'white',
                      fontWeight: '500',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    ✓ Agregar
                  </button>
                  <button
                    onClick={() => setShowFontForm(false)}
                    style={{
                      padding: '8px 16px',
                      background: 'var(--bg)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '6px',
                      color: 'var(--text-dark)',
                      fontWeight: '500',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Inspiration Accounts Section */}
          <div
            style={{
              background: 'var(--surface)',
              backdropFilter: 'blur(16px)',
              border: '1px solid var(--glass-border)',
              borderRadius: '16px',
              padding: '24px',
            }}
          >
            <h2
              style={{
                margin: '0 0 16px 0',
                color: 'var(--text-dark)',
                fontSize: '16px',
                fontWeight: '600',
              }}
            >
              📱 Cuentas de Inspiración
            </h2>

            {/* Accounts pills */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '16px',
              }}
            >
              {inspoAccounts.map((account, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 12px',
                    background: 'var(--primary)',
                    borderRadius: '20px',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: '500',
                  }}
                >
                  @{account}
                  <button
                    onClick={() => deleteAccount(index)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'white',
                      fontSize: '14px',
                      padding: '0',
                      marginLeft: '4px',
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Add account input */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="Ej: username_instagram"
                value={newInspoAccount}
                onChange={(e) => setNewInspoAccount(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') addAccount();
                }}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '8px',
                  background: 'var(--bg)',
                  color: 'var(--text-dark)',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                }}
              />
              <button
                onClick={addAccount}
                style={{
                  padding: '10px 20px',
                  background: 'var(--primary)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: '500',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Agregar
              </button>
            </div>

            {/* Inspiration notes */}
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: 'var(--text-dark)',
                  fontSize: '13px',
                  fontWeight: '500',
                }}
              >
                Notas de Inspiración
              </label>
              <textarea
                value={inspoNotes}
                onChange={(e) => setInspoNotes(e.target.value)}
                placeholder="Describe el estilo, tendencias y referencias visuales..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '8px',
                  background: 'var(--bg)',
                  color: 'var(--text-dark)',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  minHeight: '80px',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* AI Brand Voice Section */}
          <div
            style={{
              background: 'var(--surface)',
              backdropFilter: 'blur(16px)',
              border: '1px solid var(--glass-border)',
              borderRadius: '16px',
              padding: '24px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h2
                style={{
                  margin: 0,
                  color: 'var(--text-dark)',
                  fontSize: '16px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Sparkles size={18} style={{ color: 'var(--primary)' }} />
                Voz de Marca (AI)
              </h2>
              <button
                onClick={analyzeBrandVoice}
                disabled={voiceLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary, #A78BFA))',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: '600',
                  cursor: voiceLoading ? 'not-allowed' : 'pointer',
                  opacity: voiceLoading ? 0.7 : 1,
                  fontSize: '13px',
                  transition: 'all 0.2s',
                }}
              >
                {voiceLoading ? (
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Sparkles size={16} />
                )}
                {voiceLoading ? 'Analizando...' : 'Analizar voz de marca con AI'}
              </button>
            </div>

            {!voiceProfile && !voiceLoading && (
              <p style={{ color: 'var(--text-mid)', fontSize: '13px', margin: 0 }}>
                Analiza los posts existentes de este cliente para generar un perfil de voz de marca automaticamente.
                Se necesitan al menos 5 posts con contenido.
              </p>
            )}

            {voiceProfile && (
              <>
                <button
                  onClick={() => setVoiceExpanded(!voiceExpanded)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-mid)',
                    fontSize: '13px',
                    padding: '0 0 12px 0',
                    fontFamily: 'inherit',
                  }}
                >
                  {voiceExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  {voiceExpanded ? 'Ocultar perfil' : 'Mostrar perfil'}
                </button>

                {voiceExpanded && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Overall personality */}
                    {voiceProfile.overall_personality && (
                      <div
                        style={{
                          padding: '12px 16px',
                          borderLeft: '3px solid var(--primary)',
                          background: 'rgba(255, 143, 173, 0.05)',
                          borderRadius: '0 8px 8px 0',
                          color: 'var(--text-dark)',
                          fontSize: '14px',
                          fontStyle: 'italic',
                          lineHeight: '1.5',
                        }}
                      >
                        {voiceProfile.overall_personality}
                      </div>
                    )}

                    {/* Tone adjectives */}
                    {voiceProfile.tone_adjectives && voiceProfile.tone_adjectives.length > 0 && (
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-dark)', fontSize: '13px', fontWeight: '600' }}>
                          Tono de voz
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {voiceProfile.tone_adjectives.map((adj: string, i: number) => {
                            const colors = ['var(--primary)', '#A78BFA', '#A78BFA', '#34D399', '#F59E0B'];
                            const bg = colors[i % colors.length];
                            return (
                              <span
                                key={i}
                                style={{
                                  padding: '4px 12px',
                                  borderRadius: '20px',
                                  background: bg,
                                  color: 'white',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                }}
                              >
                                {adj}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Vocabulary patterns */}
                    {voiceProfile.vocabulary_patterns && voiceProfile.vocabulary_patterns.length > 0 && (
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-dark)', fontSize: '13px', fontWeight: '600' }}>
                          Patrones de vocabulario
                        </label>
                        <p style={{ margin: 0, color: 'var(--text-mid)', fontSize: '13px', lineHeight: '1.6' }}>
                          {voiceProfile.vocabulary_patterns.join(', ')}
                        </p>
                      </div>
                    )}

                    {/* Emoji usage + favorites */}
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      {voiceProfile.emoji_usage && (
                        <div>
                          <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-dark)', fontSize: '13px', fontWeight: '600' }}>
                            Uso de emojis
                          </label>
                          <span
                            style={{
                              padding: '4px 12px',
                              borderRadius: '6px',
                              background: 'var(--bg)',
                              border: '1px solid var(--glass-border)',
                              color: 'var(--text-dark)',
                              fontSize: '12px',
                              fontWeight: '500',
                            }}
                          >
                            {voiceProfile.emoji_usage}
                            {voiceProfile.emoji_favorites && voiceProfile.emoji_favorites.length > 0 && (
                              <span style={{ marginLeft: '8px' }}>
                                {voiceProfile.emoji_favorites.join(' ')}
                              </span>
                            )}
                          </span>
                        </div>
                      )}

                      {/* Sentence style */}
                      {voiceProfile.sentence_style && (
                        <div>
                          <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-dark)', fontSize: '13px', fontWeight: '600' }}>
                            Estilo de oraciones
                          </label>
                          <span
                            style={{
                              padding: '4px 12px',
                              borderRadius: '6px',
                              background: 'var(--bg)',
                              border: '1px solid var(--glass-border)',
                              color: 'var(--text-dark)',
                              fontSize: '12px',
                              fontWeight: '500',
                            }}
                          >
                            {voiceProfile.sentence_style}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Hashtag patterns */}
                    {voiceProfile.hashtag_patterns && voiceProfile.hashtag_patterns.length > 0 && (
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-dark)', fontSize: '13px', fontWeight: '600' }}>
                          Patrones de hashtags
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {voiceProfile.hashtag_patterns.map((tag: string, i: number) => (
                            <span
                              key={i}
                              style={{
                                padding: '3px 10px',
                                borderRadius: '6px',
                                background: 'rgba(255, 143, 173, 0.1)',
                                color: 'var(--primary)',
                                fontSize: '12px',
                                fontWeight: '500',
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dos and Don'ts */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      {voiceProfile.dos && voiceProfile.dos.length > 0 && (
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', color: 'rgb(22, 163, 74)', fontSize: '13px', fontWeight: '600' }}>
                            Hacer
                          </label>
                          <ul style={{ margin: 0, padding: '0 0 0 16px', listStyle: 'none' }}>
                            {voiceProfile.dos.map((item: string, i: number) => (
                              <li
                                key={i}
                                style={{
                                  color: 'var(--text-mid)',
                                  fontSize: '13px',
                                  lineHeight: '1.8',
                                  position: 'relative',
                                  paddingLeft: '4px',
                                }}
                              >
                                <span style={{ color: 'rgb(22, 163, 74)', position: 'absolute', left: '-16px' }}>+</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {voiceProfile.donts && voiceProfile.donts.length > 0 && (
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', color: 'rgb(220, 38, 38)', fontSize: '13px', fontWeight: '600' }}>
                            Evitar
                          </label>
                          <ul style={{ margin: 0, padding: '0 0 0 16px', listStyle: 'none' }}>
                            {voiceProfile.donts.map((item: string, i: number) => (
                              <li
                                key={i}
                                style={{
                                  color: 'var(--text-mid)',
                                  fontSize: '13px',
                                  lineHeight: '1.8',
                                  position: 'relative',
                                  paddingLeft: '4px',
                                }}
                              >
                                <span style={{ color: 'rgb(220, 38, 38)', position: 'absolute', left: '-16px' }}>-</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Spin animation for loader */}
          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>

          {/* Style Questionnaire Section */}
          <div
            style={{
              background: 'var(--surface)',
              backdropFilter: 'blur(16px)',
              border: '1px solid var(--glass-border)',
              borderRadius: '16px',
              padding: '24px',
            }}
          >
            <h2
              style={{
                margin: '0 0 16px 0',
                color: 'var(--text-dark)',
                fontSize: '16px',
                fontWeight: '600',
              }}
            >
              📝 Cuestionario de Estilo
            </h2>

            {/* Questions */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                marginBottom: '16px',
              }}
            >
              {Object.entries(questionnaire).map(([key, value]) => (
                <div key={key}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '6px',
                      color: 'var(--text-dark)',
                      fontSize: '13px',
                      fontWeight: '500',
                    }}
                  >
                    {key}
                  </label>
                  <textarea
                    value={value}
                    onChange={(e) => updateQuestionnaire(key, e.target.value)}
                    placeholder="Describe tu respuesta..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '8px',
                      background: 'var(--bg)',
                      color: 'var(--text-dark)',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      minHeight: '60px',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Add custom question */}
            <button
              onClick={addCustomQuestion}
              style={{
                padding: '10px 16px',
                background: 'var(--bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                color: 'var(--text-dark)',
                fontWeight: '500',
                cursor: 'pointer',
                fontSize: '13px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.background = 'var(--primary)';
                (e.target as HTMLElement).style.color = 'white';
                (e.target as HTMLElement).style.borderColor = 'var(--primary)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.background = 'var(--bg)';
                (e.target as HTMLElement).style.color = 'var(--text-dark)';
                (e.target as HTMLElement).style.borderColor =
                  'var(--glass-border)';
              }}
            >
              + Agregar pregunta personalizada
            </button>
          </div>

          {/* Save button */}
          <button
            onClick={saveBrandKit}
            disabled={saving}
            style={{
              padding: '12px 24px',
              background: 'var(--primary)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontWeight: '600',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              opacity: saving ? 0.6 : 1,
              transition: 'all 0.2s',
              alignSelf: 'flex-start',
            }}
          >
            {saving ? 'Guardando...' : '💾 Guardar cambios'}
          </button>
        </>
      )}
    </div>
  );
}
