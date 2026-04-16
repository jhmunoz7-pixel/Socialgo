'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  useCurrentUser,
  useClients,
  usePosts,
  useCanvaDesigns,
  usePostComments,
  updatePost,
  createPostComment,
} from '@/lib/hooks';
import type { Post, Client } from '@/types';
import {
  STAGE_CONFIG,
  STAGE_ORDER,
  postToStage,
  stageToPostFields,
  type StageKey,
} from '@/lib/calendario-stages';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Search,
  Plus,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  ExternalLink,
  Send,
  ArrowRight,
  ArrowLeft,
  Archive,
} from 'lucide-react';

// Spanish weekday headers, Monday-first
const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildCalendarGrid(viewMonth: Date): Date[] {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const dayOfWeek = firstOfMonth.getDay(); // 0 = Sun, 1 = Mon…
  // Shift so Monday is index 0
  const leadingDays = (dayOfWeek + 6) % 7;
  const start = new Date(year, month, 1 - leadingDays);
  const grid: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    grid.push(d);
  }
  return grid;
}

export default function CalendarioPage() {
  const { data: currentUser } = useCurrentUser();
  const role = currentUser?.member?.role ?? null;
  const isClientViewer = role === 'client_viewer';

  const { data: clients, loading: clientsLoading } = useClients();

  // Brand selection — client_viewer is locked to their own brand if we had that mapping;
  // for now we select the first client by default for any role.
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  useEffect(() => {
    if (!selectedClientId && clients.length > 0) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId]);

  const selectedClient = useMemo<Client | null>(
    () => clients.find((c) => c.id === selectedClientId) || null,
    [clients, selectedClientId],
  );

  // Data scoped to the selected brand
  const { data: posts, loading: postsLoading, refetch: refetchPosts } = usePosts(selectedClientId);
  const { data: designs } = useCanvaDesigns(selectedClientId);

  // Calendar navigation
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const days = useMemo(() => buildCalendarGrid(viewMonth), [viewMonth]);

  // Stage filter + search
  const [activeStage, setActiveStage] = useState<StageKey | 'all'>('all');
  const [search, setSearch] = useState('');
  const [stagePanelOpen, setStagePanelOpen] = useState(true);

  // Selected post for drawer
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const selectedPost = useMemo(
    () => posts.find((p) => p.id === selectedPostId) || null,
    [posts, selectedPostId],
  );

  // Posts annotated with stage
  const postsWithStage = useMemo(
    () => posts.map((p) => ({ post: p, stage: postToStage(p) })),
    [posts],
  );

  // Stage counts (for sidebar pills)
  const stageCounts = useMemo(() => {
    const counts: Record<StageKey, number> = {
      proposal: 0, design: 0, review_internal: 0,
      review_client: 0, ready: 0, scheduled: 0, published: 0,
    };
    postsWithStage.forEach(({ stage }) => { counts[stage]++; });
    return counts;
  }, [postsWithStage]);

  // Client_viewer: only see posts from review_client onwards
  const visibleStagesForRole: Set<StageKey> | null = useMemo(() => {
    if (isClientViewer) {
      return new Set<StageKey>(['review_client', 'ready', 'scheduled', 'published']);
    }
    return null;
  }, [isClientViewer]);

  // Filtered posts for calendar rendering
  const filteredPostsByDate = useMemo(() => {
    const byDate: Record<string, Array<{ post: Post; stage: StageKey }>> = {};
    postsWithStage.forEach(({ post, stage }) => {
      if (!post.scheduled_date) return;
      if (activeStage !== 'all' && stage !== activeStage) return;
      if (visibleStagesForRole && !visibleStagesForRole.has(stage)) return;
      if (search && !(post.name || '').toLowerCase().includes(search.toLowerCase())) return;
      const key = post.scheduled_date;
      if (!byDate[key]) byDate[key] = [];
      byDate[key].push({ post, stage });
    });
    return byDate;
  }, [postsWithStage, activeStage, visibleStagesForRole, search]);

  // Design lookup by linked_post_id (for Canva thumbnail on post cards)
  const designByPostId = useMemo(() => {
    const map: Record<string, string> = {};
    designs.forEach((d) => {
      if (d.linked_post_id && d.thumbnail_url) {
        map[d.linked_post_id] = d.thumbnail_url;
      }
    });
    return map;
  }, [designs]);

  const todayKey = toDateKey(new Date());

  // Navigation helpers
  const goPrevMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  const goNextMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));
  const goToday = () => setViewMonth(new Date());

  const monthLabel = `${MONTH_NAMES[viewMonth.getMonth()]}, ${viewMonth.getFullYear()}`;

  // Stage transition handler
  const [isMoving, setIsMoving] = useState(false);
  const handleAdvanceStage = async () => {
    if (!selectedPost) return;
    const currentStage = postToStage(selectedPost);
    const next = STAGE_CONFIG[currentStage].nextStageKey;
    if (!next) return;
    setIsMoving(true);
    try {
      await updatePost(selectedPost.id, stageToPostFields(next));
      await refetchPosts();
    } catch (err) {
      console.error('Error advancing stage:', err);
    } finally {
      setIsMoving(false);
    }
  };

  const handleReturnStage = async () => {
    if (!selectedPost) return;
    const currentStage = postToStage(selectedPost);
    const idx = STAGE_ORDER.indexOf(currentStage);
    if (idx <= 0) return;
    const prev = STAGE_ORDER[idx - 1];
    setIsMoving(true);
    try {
      await updatePost(selectedPost.id, stageToPostFields(prev));
      await refetchPosts();
    } catch (err) {
      console.error('Error reverting stage:', err);
    } finally {
      setIsMoving(false);
    }
  };

  const handleArchive = async () => {
    if (!selectedPost) return;
    setIsMoving(true);
    try {
      await updatePost(selectedPost.id, { status: 'archived' });
      await refetchPosts();
      setSelectedPostId(null);
    } catch (err) {
      console.error('Error archiving post:', err);
    } finally {
      setIsMoving(false);
    }
  };

  const isLoading = clientsLoading || postsLoading;

  return (
    <div className="flex h-[calc(100vh-0px)] -mx-8 -my-6 overflow-hidden" style={{ marginTop: '-24px' }}>
      {/* ═════ Stage Panel (collapsible) ═════ */}
      {stagePanelOpen ? (
        <aside
          className="w-[240px] border-r flex flex-col flex-shrink-0"
          style={{ background: 'white', borderColor: 'var(--glass-border)' }}
        >
          <div className="p-4 border-b flex items-start justify-between" style={{ borderColor: 'var(--glass-border)' }}>
            <div>
              <h1 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--text-dark)' }}>
                <CalendarIcon className="w-4 h-4" style={{ color: '#6366F1' }} />
                Etapas
              </h1>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-light)' }}>
                Filtra por estado del post
              </p>
            </div>
            <button
              onClick={() => setStagePanelOpen(false)}
              className="w-6 h-6 rounded-md hover:bg-slate-100 flex items-center justify-center"
              style={{ color: 'var(--text-light)' }}
              title="Ocultar panel"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* Search */}
          <div className="p-3 border-b" style={{ borderColor: 'var(--glass-border)' }}>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-2" style={{ color: 'var(--text-light)' }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar post…"
                className="w-full text-xs pl-7 pr-2 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
                style={{ borderColor: 'var(--glass-border)' }}
              />
            </div>
          </div>

          {/* Stage list */}
          <nav className="flex-1 p-2 overflow-y-auto">
            <p className="text-[10px] font-semibold uppercase tracking-wider px-3 py-2" style={{ color: 'var(--text-light)' }}>
              Por hacer
            </p>

            <StageItem
              label="Todos"
              icon="📅"
              accent="#6366F1"
              count={postsWithStage.length}
              active={activeStage === 'all'}
              onClick={() => setActiveStage('all')}
            />

            {STAGE_ORDER.map((key) => {
              if (visibleStagesForRole && !visibleStagesForRole.has(key)) return null;
              const config = STAGE_CONFIG[key];
              return (
                <StageItem
                  key={key}
                  label={config.label}
                  icon={config.icon}
                  accent={config.accent}
                  count={stageCounts[key]}
                  active={activeStage === key}
                  onClick={() => setActiveStage(key)}
                />
              );
            })}
          </nav>

          {/* Footer — new proposal */}
          {!isClientViewer && (
            <div className="p-3 border-t" style={{ borderColor: 'var(--glass-border)' }}>
              <button
                disabled={!selectedClientId}
                onClick={() => alert('Pendiente: modal de nueva propuesta')}
                className="w-full py-2 rounded-lg text-xs font-semibold text-white shadow-sm hover:shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                style={{ background: 'linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)' }}
              >
                <Plus className="w-3.5 h-3.5" />
                Nueva propuesta
              </button>
            </div>
          )}
        </aside>
      ) : (
        <button
          onClick={() => setStagePanelOpen(true)}
          className="w-7 border-r bg-white hover:bg-slate-50 flex items-center justify-center flex-shrink-0"
          style={{ borderColor: 'var(--glass-border)', color: 'var(--text-light)' }}
          title="Mostrar panel de etapas"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
      )}

      {/* ═════ Main calendar ═════ */}
      <main className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
        {/* Top bar */}
        <header
          className="h-[60px] px-6 flex items-center justify-between border-b flex-shrink-0"
          style={{ background: 'white', borderColor: 'var(--glass-border)' }}
        >
          <div className="flex items-center gap-3">
            {/* Brand selector */}
            <BrandSelector
              clients={clients}
              selectedClient={selectedClient}
              onSelect={(id) => setSelectedClientId(id)}
              locked={isClientViewer}
            />

            <div className="w-px h-6" style={{ background: 'var(--glass-border)' }} />

            <button
              onClick={goPrevMonth}
              className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center"
              style={{ color: 'var(--text-mid)' }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="font-bold text-base capitalize" style={{ color: 'var(--text-dark)' }}>
              {monthLabel}
            </h2>
            <button
              onClick={goNextMonth}
              className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center"
              style={{ color: 'var(--text-mid)' }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={goToday}
              className="ml-2 px-3 py-1 rounded-md border text-xs font-medium hover:bg-slate-50"
              style={{ borderColor: 'var(--glass-border)', color: 'var(--text-mid)' }}
            >
              Hoy
            </button>
          </div>

          {/* Quick stage chips (mirror sidebar top entries) */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {([
              { key: 'all', label: 'Todos' },
              { key: 'review_internal', label: `👀 Revisión` },
              { key: 'review_client', label: `📤 Cliente` },
              { key: 'scheduled', label: `🚀 Programados` },
            ] as const).map((chip) => {
              const on = activeStage === chip.key;
              return (
                <button
                  key={chip.key}
                  onClick={() => setActiveStage(chip.key as StageKey | 'all')}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={{
                    background: on ? 'linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)' : 'white',
                    color: on ? 'white' : 'var(--text-mid)',
                    border: on ? '1px solid transparent' : '1px solid var(--glass-border)',
                  }}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </header>

        {/* Tip banner */}
        <div
          className="px-6 py-2 border-b flex items-center gap-2 text-[11px] flex-shrink-0"
          style={{ background: 'white', borderColor: 'var(--glass-border)', color: 'var(--text-light)' }}
        >
          💡 <span><b style={{ color: 'var(--text-mid)' }}>Tip:</b> haz click en un post para revisar y moverlo de etapa. Próximamente podrás arrastrarlo entre días.</span>
        </div>

        {/* Calendar grid */}
        <div className="flex-1 overflow-auto" style={{ background: 'white' }}>
          {/* Day headers */}
          <div
            className="grid grid-cols-7 sticky top-0 z-10 border-b"
            style={{ background: 'white', borderColor: 'var(--glass-border)' }}
          >
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="p-2 text-[10px] uppercase font-semibold text-center border-r"
                style={{ color: 'var(--text-mid)', borderColor: 'var(--glass-border)' }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="p-12 text-center text-sm" style={{ color: 'var(--text-light)' }}>
              Cargando calendario…
            </div>
          ) : !selectedClientId ? (
            <div className="p-12 text-center">
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-dark)' }}>Selecciona una marca</p>
              <p className="text-xs" style={{ color: 'var(--text-light)' }}>
                Elige un cliente arriba para ver su calendario.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {days.map((day, i) => {
                const key = toDateKey(day);
                const inMonth = day.getMonth() === viewMonth.getMonth();
                const isToday = key === todayKey;
                const isLastCol = (i + 1) % 7 === 0;
                const postsThisDay = filteredPostsByDate[key] || [];

                return (
                  <div
                    key={key}
                    className="min-h-[120px] p-2 flex flex-col gap-1"
                    style={{
                      borderRight: isLastCol ? 'none' : '1px solid var(--glass-border)',
                      borderBottom: '1px solid var(--glass-border)',
                    }}
                  >
                    <span
                      className="text-[11px] font-semibold"
                      style={{
                        color: !inMonth ? 'var(--text-light)' : isToday ? 'white' : 'var(--text-mid)',
                        background: isToday ? '#6366F1' : 'transparent',
                        padding: isToday ? '2px 6px' : '0',
                        borderRadius: isToday ? '999px' : '0',
                        alignSelf: 'flex-start',
                        opacity: !inMonth ? 0.5 : 1,
                      }}
                    >
                      {day.getDate()}
                    </span>
                    {postsThisDay.map(({ post, stage }) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        stage={stage}
                        thumbnail={post.image_url || designByPostId[post.id] || null}
                        onClick={() => setSelectedPostId(post.id)}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Legend */}
        <div
          className="px-6 py-2 border-t flex items-center gap-2 text-[10px] flex-shrink-0 overflow-x-auto"
          style={{ background: 'white', borderColor: 'var(--glass-border)' }}
        >
          {STAGE_ORDER.map((key) => {
            const c = STAGE_CONFIG[key];
            return (
              <span
                key={key}
                className="px-2 py-0.5 rounded-full font-medium flex items-center gap-1 whitespace-nowrap"
                style={{ background: c.chipBg, color: c.chipText }}
              >
                <span>{c.icon}</span>
                {c.shortLabel}
              </span>
            );
          })}
        </div>
      </main>

      {/* ═════ Drawer ═════ */}
      {selectedPost && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setSelectedPostId(null)}
          />
          <PostDrawer
            post={selectedPost}
            stage={postToStage(selectedPost)}
            client={selectedClient}
            design={designs.find((d) => d.linked_post_id === selectedPost.id) || null}
            isClientViewer={isClientViewer}
            isMoving={isMoving}
            onClose={() => setSelectedPostId(null)}
            onAdvance={handleAdvanceStage}
            onReturn={handleReturnStage}
            onArchive={handleArchive}
          />
        </>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// Sub-components
// ═════════════════════════════════════════════════════════

function StageItem({
  label, icon, accent, count, active, onClick,
}: {
  label: string;
  icon: string;
  accent: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors"
      style={{
        background: active ? 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(167,139,250,0.08) 100%)' : 'transparent',
        color: active ? '#6366F1' : 'var(--text-mid)',
        fontWeight: active ? 600 : 500,
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = '#F8FAFC'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
      <span className="text-xs flex-1 flex items-center gap-1">
        <span>{icon}</span> {label}
      </span>
      <span
        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
        style={{
          background: active ? 'rgba(99,102,241,0.15)' : '#F1F5F9',
          color: active ? '#6366F1' : 'var(--text-mid)',
        }}
      >
        {count}
      </span>
    </button>
  );
}

function BrandSelector({
  clients, selectedClient, onSelect, locked,
}: {
  clients: Client[];
  selectedClient: Client | null;
  onSelect: (id: string) => void;
  locked: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => !locked && setOpen((v) => !v)}
        disabled={locked}
        className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg border transition-colors disabled:cursor-default"
        style={{
          borderColor: 'var(--glass-border)',
          background: 'white',
        }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-base flex-shrink-0"
          style={{ background: selectedClient?.color || '#EEF2FF' }}
        >
          {selectedClient?.emoji || '🏢'}
        </div>
        <div className="text-left">
          <p className="text-[10px] leading-tight" style={{ color: 'var(--text-light)' }}>Marca</p>
          <p className="text-xs font-semibold leading-tight" style={{ color: 'var(--text-dark)' }}>
            {selectedClient?.name || 'Sin selección'}
          </p>
        </div>
        {!locked && <span className="text-xs ml-1" style={{ color: 'var(--text-light)' }}>▾</span>}
      </button>
      {open && !locked && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 top-[calc(100%+4px)] w-[240px] rounded-lg border shadow-lg z-40 overflow-hidden"
            style={{ background: 'white', borderColor: 'var(--glass-border)' }}
          >
            <div className="max-h-[320px] overflow-y-auto">
              {clients.length === 0 ? (
                <p className="p-3 text-xs" style={{ color: 'var(--text-light)' }}>Sin clientes aún.</p>
              ) : (
                clients.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { onSelect(c.id); setOpen(false); }}
                    className="w-full flex items-center gap-2 p-2 text-left hover:bg-slate-50"
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                      style={{ background: c.color || '#EEF2FF' }}
                    >
                      {c.emoji || '🏢'}
                    </div>
                    <span className="text-xs font-medium truncate" style={{ color: 'var(--text-dark)' }}>
                      {c.name}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PostCard({
  post, stage, thumbnail, onClick,
}: {
  post: Post;
  stage: StageKey;
  thumbnail: string | null;
  onClick: () => void;
}) {
  const config = STAGE_CONFIG[stage];
  return (
    <button
      onClick={onClick}
      className="relative rounded-lg overflow-hidden w-full text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
      style={{
        background: 'white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      {/* Color bar (stage indicator) */}
      <div style={{ height: 3, background: config.accent }} />
      {/* Thumbnail */}
      <div className="relative aspect-square" style={{ background: '#F1F5F9' }}>
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnail} alt={post.name || 'Post'} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl opacity-60">
            {config.icon}
          </div>
        )}
        <span
          className="absolute top-1 left-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold flex items-center gap-0.5"
          style={{ background: config.chipBg, color: config.chipText }}
        >
          <span>{config.icon}</span> {config.shortLabel}
        </span>
      </div>
      {/* Footer */}
      <div className="px-1.5 py-1 bg-white">
        <p className="text-[10px] font-semibold truncate" style={{ color: 'var(--text-dark)' }}>
          {post.name || 'Sin nombre'}
        </p>
        <p className="text-[9px]" style={{ color: 'var(--text-light)' }}>
          {post.platform}
        </p>
      </div>
    </button>
  );
}

function PostDrawer({
  post, stage, client, design, isClientViewer, isMoving,
  onClose, onAdvance, onReturn, onArchive,
}: {
  post: Post;
  stage: StageKey;
  client: Client | null;
  design: { thumbnail_url: string | null; design_url: string | null; page_count: number } | null;
  isClientViewer: boolean;
  isMoving: boolean;
  onClose: () => void;
  onAdvance: () => void;
  onReturn: () => void;
  onArchive: () => void;
}) {
  const config = STAGE_CONFIG[stage];
  const { data: comments, refetch: refetchComments } = usePostComments(post.id);
  const { data: currentUserData } = useCurrentUser();
  const [newComment, setNewComment] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copyDraft, setCopyDraft] = useState(post.copy || '');

  const sendComment = async () => {
    if (!newComment.trim()) return;
    setIsSending(true);
    try {
      await createPostComment({
        post_id: post.id,
        content: newComment.trim(),
        is_client_comment: isClientViewer,
        author_name: currentUserData?.member?.full_name || (isClientViewer ? 'Cliente' : 'Equipo'),
        author_email: null,
        author_member_id: currentUserData?.member?.id || null,
      });
      setNewComment('');
      await refetchComments();
    } finally {
      setIsSending(false);
    }
  };

  const saveCopy = async () => {
    if (copyDraft === (post.copy || '')) return;
    await updatePost(post.id, { copy: copyDraft });
  };

  const thumbnail = post.image_url || design?.thumbnail_url || null;
  const canAdvance = !isClientViewer && config.nextStageKey !== null;
  const canReturn: boolean = !isClientViewer && stage !== 'proposal' && stage !== 'published';
  const canArchive: boolean = !isClientViewer && stage !== 'published';
  const canClientApprove = isClientViewer && stage === 'review_client';

  return (
    <aside
      className="fixed top-0 right-0 bottom-0 w-[420px] border-l shadow-2xl z-50 flex flex-col"
      style={{ background: 'white', borderColor: 'var(--glass-border)' }}
    >
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: 'var(--glass-border)' }}>
        <div className="flex items-center gap-2">
          <span
            className="px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1"
            style={{ background: config.chipBg, color: config.chipText }}
          >
            <span>{config.icon}</span> {config.label}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-light)' }}>
            · {post.scheduled_date ? new Date(post.scheduled_date + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : 'Sin fecha'}
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center"
          style={{ color: 'var(--text-light)' }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Preview */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-light)' }}>
            Preview{design ? ` · Canva (${design.page_count} págs)` : ''}
          </p>
          <div
            className="relative rounded-xl overflow-hidden border"
            style={{ borderColor: 'var(--glass-border)' }}
          >
            {thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbnail} alt={post.name || 'Preview'} className="w-full aspect-square object-cover" />
            ) : (
              <div className="w-full aspect-square flex items-center justify-center text-7xl" style={{ background: '#F1F5F9' }}>
                {config.icon}
              </div>
            )}
            {design?.design_url && (
              <a
                href={design.design_url}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-2 right-2 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md flex items-center gap-1.5 hover:shadow-lg transition-shadow"
                style={{ background: 'white', color: 'var(--text-dark)' }}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Editar en Canva
              </a>
            )}
          </div>
        </div>

        {/* Title + client */}
        <div>
          <h3 className="font-semibold text-base" style={{ color: 'var(--text-dark)' }}>
            {post.name || 'Sin nombre'}
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-light)' }}>
            {client ? `${client.emoji || '🏢'} ${client.name}` : ''} · {post.platform} {post.format ? `· ${post.format}` : ''}
          </p>
        </div>

        {/* Copy */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-light)' }}>
            Copy
          </label>
          {isClientViewer ? (
            <div className="mt-1 p-3 rounded-lg border text-xs leading-relaxed whitespace-pre-wrap" style={{ borderColor: 'var(--glass-border)', background: '#FAFAFA', color: 'var(--text-mid)' }}>
              {post.copy || <i>Sin copy aún.</i>}
            </div>
          ) : (
            <>
              <textarea
                value={copyDraft}
                onChange={(e) => setCopyDraft(e.target.value)}
                onBlur={saveCopy}
                rows={4}
                placeholder="Escribe el copy del post…"
                className="mt-1 w-full p-3 rounded-lg border text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-200"
                style={{ borderColor: 'var(--glass-border)', background: '#FAFAFA', color: 'var(--text-dark)' }}
              />
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-light)' }}>
                Se guarda automáticamente al salir del campo.
              </p>
            </>
          )}
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-light)' }}>Fecha</label>
            <p className="text-xs mt-1" style={{ color: 'var(--text-dark)' }}>
              {post.scheduled_date ? new Date(post.scheduled_date + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Sin fecha'}
            </p>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-light)' }}>Hora</label>
            <p className="text-xs mt-1" style={{ color: 'var(--text-dark)' }}>
              {post.scheduled_time || '—'}
            </p>
          </div>
          {post.ai_score !== null && (
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-light)' }}>AI score</label>
              <p className="text-xs mt-1 font-semibold" style={{ color: '#10B981' }}>
                {post.ai_score} / 100
              </p>
            </div>
          )}
        </div>

        {/* Comments */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-light)' }}>
            Comentarios ({comments?.length || 0})
          </label>
          <div className="space-y-2 mt-2">
            {comments && comments.length > 0 ? (
              comments.map((c) => (
                <div
                  key={c.id}
                  className="p-2.5 rounded-lg"
                  style={{ background: c.is_client_comment ? '#EEF2FF' : '#F8FAFC' }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-semibold" style={{ color: 'var(--text-dark)' }}>
                      {c.author_name || 'Usuario'}
                    </span>
                    {c.is_client_comment && (
                      <span className="text-[9px] px-1 py-px rounded" style={{ background: 'rgba(99,102,241,0.15)', color: '#6366F1' }}>
                        cliente
                      </span>
                    )}
                    <span className="text-[10px]" style={{ color: 'var(--text-light)' }}>
                      {c.created_at ? new Date(c.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-mid)' }}>{c.content}</p>
                </div>
              ))
            ) : (
              <p className="text-xs italic" style={{ color: 'var(--text-light)' }}>Sin comentarios aún.</p>
            )}
          </div>
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendComment()}
              placeholder="Añadir comentario…"
              className="flex-1 text-xs px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
              style={{ borderColor: 'var(--glass-border)' }}
            />
            <button
              onClick={sendComment}
              disabled={!newComment.trim() || isSending}
              className="px-3 py-1.5 text-xs font-medium rounded-lg text-white disabled:opacity-50 flex items-center gap-1"
              style={{ background: 'linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)' }}
            >
              <Send className="w-3 h-3" />
              {isSending ? '…' : 'Enviar'}
            </button>
          </div>
        </div>
      </div>

      {/* Sticky action footer */}
      <div className="border-t p-4 space-y-2 flex-shrink-0" style={{ borderColor: 'var(--glass-border)', background: 'white' }}>
        {canClientApprove ? (
          <>
            <p className="text-[10px] text-center" style={{ color: 'var(--text-light)' }}>
              Aprueba para que la agencia lo programe
            </p>
            <button
              onClick={onAdvance}
              disabled={isMoving}
              className="w-full py-2.5 rounded-lg font-semibold text-sm text-white shadow-sm hover:shadow-md transition-shadow disabled:opacity-50 flex items-center justify-center gap-1.5"
              style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
            >
              ✅ Aprobar post
            </button>
          </>
        ) : canAdvance ? (
          <>
            <p className="text-[10px] text-center" style={{ color: 'var(--text-light)' }}>
              Siguiente paso
            </p>
            <button
              onClick={onAdvance}
              disabled={isMoving}
              className="w-full py-2.5 rounded-lg font-semibold text-sm text-white shadow-sm hover:shadow-md transition-shadow disabled:opacity-50 flex items-center justify-center gap-1.5"
              style={{ background: 'linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)' }}
            >
              {config.nextActionLabel} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </>
        ) : null}

        {(canReturn || canArchive) && (
          <div className="flex gap-2">
            {canReturn && (
              <button
                onClick={onReturn}
                disabled={isMoving}
                className="flex-1 py-2 rounded-lg text-xs font-medium border hover:bg-slate-50 disabled:opacity-50 flex items-center justify-center gap-1"
                style={{ borderColor: 'var(--glass-border)', color: 'var(--text-mid)' }}
              >
                <ArrowLeft className="w-3 h-3" />
                Regresar etapa
              </button>
            )}
            {canArchive && (
              <button
                onClick={onArchive}
                disabled={isMoving}
                className="flex-1 py-2 rounded-lg text-xs font-medium border hover:bg-slate-50 disabled:opacity-50 flex items-center justify-center gap-1"
                style={{ borderColor: 'var(--glass-border)', color: 'var(--text-mid)' }}
              >
                <Archive className="w-3 h-3" />
                Archivar
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
