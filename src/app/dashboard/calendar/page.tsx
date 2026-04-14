'use client';

import React, { useState, useMemo } from 'react';
import { usePosts, useClients, updatePost, createPost } from '@/lib/hooks';
import { POST_TYPE_CONFIG } from '@/types';
import type { Post, PostType, Client, PostFormat, Platform } from '@/types';
import { PostModal } from '@/components/posts/PostModal';
import { usePermissions } from '@/lib/permissions';

const parseLocalDate = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d);
};

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
};

const generateCalendarDays = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - ((startDate.getDay() + 6) % 7));
  const days: { date: Date; isCurrentMonth: boolean }[] = [];
  const current = new Date(startDate);
  for (let i = 0; i < 42; i++) {
    days.push({ date: new Date(current), isCurrentMonth: current.getMonth() === month });
    current.setDate(current.getDate() + 1);
  }
  while (days.length > 35 && days.slice(-7).every((d) => !d.isCurrentMonth)) {
    days.splice(-7, 7);
  }
  return days;
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const { data: posts, loading: postsLoading, refetch: refetchPosts } = usePosts();
  const { data: clients, loading: clientsLoading } = useClients();
  const { can } = usePermissions();
  const canCreate = can('create_posts');

  const monthYear = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  const calendarDays = useMemo(() => generateCalendarDays(currentDate), [currentDate]);

  const postsByDate = useMemo(() => {
    const map: Record<string, Post[]> = {};
    (posts || []).forEach((p) => {
      if (!p.scheduled_date) return;
      if (selectedClientId && p.client_id !== selectedClientId) return;
      const key = formatDateKey(parseLocalDate(p.scheduled_date));
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    return map;
  }, [posts, selectedClientId]);

  const selectedDayPosts = useMemo(() => {
    if (!selectedDate) return [];
    return postsByDate[formatDateKey(selectedDate)] || [];
  }, [selectedDate, postsByDate]);

  const monthStats = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthPosts = (posts || []).filter((p) => {
      if (!p.scheduled_date) return false;
      if (selectedClientId && p.client_id !== selectedClientId) return false;
      const d = parseLocalDate(p.scheduled_date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    return {
      total: monthPosts.length,
      pending: monthPosts.filter((p) => p.approval_status === 'pending').length,
      approved: monthPosts.filter((p) => p.approval_status === 'approved' || p.approval_status === 'approved_with_changes').length,
    };
  }, [posts, currentDate, selectedClientId]);

  const clientMap = useMemo(() => new Map((clients || []).map((c) => [c.id, c])), [clients]);

  const goToPreviousMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const goToNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const dayHeaders = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sticky-header sticky top-0 z-50 -mx-8 px-8 pt-7 pb-4" style={{ backgroundColor: 'var(--bg)' }}>
        <h1 className="text-2xl font-serif font-bold" style={{ color: 'var(--text-dark)' }}>📅 Calendario</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-mid)' }}>Vista mensual — click en un día para ver o crear posts</p>
      </div>

      {(postsLoading || clientsLoading) ? (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-7 gap-1">{Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg" style={{ background: 'var(--glass-border)' }} />
          ))}</div>
        </div>
      ) : (
      <>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Posts del mes', value: monthStats.total, color: 'var(--text-dark)' },
            { label: 'Pendientes', value: monthStats.pending, color: '#D97706' },
            { label: 'Aprobados', value: monthStats.approved, color: '#059669' },
          ].map((s) => (
            <div key={s.label} className="p-3 rounded-2xl border text-center" style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)' }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--text-mid)' }}>{s.label}</p>
              <p className="text-xl font-serif font-bold mt-0.5" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={goToPreviousMonth} className="p-2 rounded-lg transition-all hover:opacity-70" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>◀</button>
            <h2 className="text-lg font-serif font-semibold capitalize min-w-[200px] text-center" style={{ color: 'var(--text-dark)' }}>{monthYear}</h2>
            <button onClick={goToNextMonth} className="p-2 rounded-lg transition-all hover:opacity-70" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>▶</button>
          </div>
          <select value={selectedClientId || ''} onChange={(e) => setSelectedClientId(e.target.value || null)}
            className="px-3 py-1.5 rounded-xl text-sm border" style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)', color: 'var(--text-dark)' }}>
            <option value="">Todos los clientes</option>
            {(clients || []).map((c) => (<option key={c.id} value={c.id}>{c.emoji} {c.name}</option>))}
          </select>
        </div>

        {/* Calendar Grid */}
        <div className="rounded-2xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)' }}>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {dayHeaders.map((d) => (<div key={d} className="text-center text-xs font-semibold py-1" style={{ color: 'var(--primary-deep)' }}>{d}</div>))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const key = formatDateKey(day.date);
              const dayPosts = postsByDate[key] || [];
              const today = isToday(day.date);
              const isSelected = selectedDate !== null && formatDateKey(selectedDate) === key;
              return (
                <button key={key} onClick={() => { setSelectedDate(day.date); setShowQuickAdd(false); }}
                  className="min-h-[72px] p-1.5 rounded-lg border transition-all text-left"
                  style={{
                    background: isSelected ? 'rgba(255, 143, 173, 0.15)' : day.isCurrentMonth ? 'var(--bg)' : 'transparent',
                    borderColor: isSelected ? 'var(--primary)' : today ? 'var(--primary-deep)' : 'var(--glass-border)',
                    opacity: day.isCurrentMonth ? 1 : 0.4,
                    borderWidth: today || isSelected ? '2px' : '1px',
                  }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: today ? 'var(--primary-deep)' : 'var(--text-dark)' }}>{day.date.getDate()}</div>
                  <div className="flex flex-wrap gap-0.5">
                    {dayPosts.slice(0, 4).map((post) => (
                      <div key={post.id} className="w-4 h-4 rounded-sm flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: POST_TYPE_CONFIG[post.post_type as PostType]?.color || '#D0D0D0', fontSize: '8px' }}
                        title={`${clientMap.get(post.client_id)?.name || 'Cliente'} - ${post.platform}`}>
                        {POST_TYPE_CONFIG[post.post_type as PostType]?.letter || '?'}
                      </div>
                    ))}
                    {dayPosts.length > 4 && <span className="text-[9px] font-bold" style={{ color: 'var(--text-light)' }}>+{dayPosts.length - 4}</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t" style={{ borderColor: 'var(--glass-border)' }}>
            {Object.entries(POST_TYPE_CONFIG).map(([key, config]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: config.color }} />
                <span className="text-[10px] font-medium" style={{ color: 'var(--text-mid)' }}>{config.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Day Panel */}
        {selectedDate && (
          <div className="rounded-2xl border p-5" style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-serif font-bold" style={{ color: 'var(--text-dark)' }}>
                {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
              <div className="flex gap-2">
                {canCreate && (
                  <button onClick={() => setShowQuickAdd(!showQuickAdd)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: 'var(--gradient)' }}>
                    {showQuickAdd ? 'Cancelar' : '+ Nuevo post'}
                  </button>
                )}
                <button onClick={() => setSelectedDate(null)} className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ color: 'var(--text-mid)' }}>
                  Cerrar
                </button>
              </div>
            </div>

            {/* Quick Add Form */}
            {showQuickAdd && canCreate && (
              <QuickAddPost
                date={selectedDate}
                clients={clients || []}
                onCreated={() => { refetchPosts(); setShowQuickAdd(false); }}
              />
            )}

            {/* Posts list */}
            {selectedDayPosts.length === 0 && !showQuickAdd ? (
              <p className="text-xs" style={{ color: 'var(--text-light)' }}>No hay posts para este día.</p>
            ) : (
              <div className="space-y-2">
                {selectedDayPosts.map((post) => {
                  const client = clientMap.get(post.client_id);
                  const typeConfig = POST_TYPE_CONFIG[post.post_type as PostType];
                  return (
                    <div key={post.id} onClick={() => setSelectedPost(post)}
                      className="p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all hover:shadow-sm"
                      style={{ background: 'var(--bg)', borderColor: 'var(--glass-border)' }}>
                      <div className="w-6 h-6 rounded flex items-center justify-center text-white font-bold flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: typeConfig?.color || '#D0D0D0', fontSize: '10px' }}>
                        {typeConfig?.letter || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold" style={{ color: 'var(--text-dark)' }}>{client?.emoji} {client?.name || 'Cliente'}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--glass-border)', color: 'var(--text-mid)' }}>{post.platform}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{
                            background: post.approval_status === 'approved' ? 'rgba(16,185,129,0.15)' : post.approval_status === 'rejected' ? 'rgba(239,68,68,0.15)' : 'rgba(255,180,50,0.15)',
                            color: post.approval_status === 'approved' ? '#065F46' : post.approval_status === 'rejected' ? '#991B1B' : '#92400E',
                          }}>{post.approval_status}</span>
                        </div>
                        <p className="text-xs line-clamp-2" style={{ color: 'var(--text-mid)' }}>{post.copy || '(sin contenido)'}</p>
                      </div>
                      <span className="text-xs" style={{ color: 'var(--primary-deep)' }}>✏️</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Post Edit Modal */}
        <PostModal
          post={selectedPost}
          client={selectedPost ? (clientMap.get(selectedPost.client_id) ?? null) : null}
          isOpen={!!selectedPost}
          onClose={() => setSelectedPost(null)}
          onSave={async (postId, data) => {
            await updatePost(postId, data);
            refetchPosts();
            setSelectedPost(null);
          }}
        />
      </>
      )}
    </div>
  );
}

// Quick-add form for creating a post directly from the calendar
function QuickAddPost({ date, clients, onCreated }: { date: Date; clients: Client[]; onCreated: () => void }) {
  const [clientId, setClientId] = useState('');
  const [copy, setCopy] = useState('');
  const [postType, setPostType] = useState<PostType>('educativo');
  const [platform, setPlatform] = useState<Platform>('instagram');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !copy.trim()) return;
    setSaving(true);
    try {
      await createPost({
        client_id: clientId,
        name: null,
        copy: copy.trim(),
        cta: null,
        explanation: null,
        post_type: postType,
        format: 'estatico' as PostFormat,
        platform,
        scheduled_date: formatDateKey(date),
        scheduled_time: '10:00',
        status: 'planned',
        approval_status: 'pending',
        ai_score: null,
        ai_insights: [],
        image_url: null,
        media_urls: [],
        inspo_url: null,
        internal_comments: null,
        assigned_to: null,
        approval_token: null,
        approval_comments: null,
        approved_at: null,
        approved_by: null,
      });
      onCreated();
    } catch (err) {
      console.error('Error creating post:', err);
      alert(err instanceof Error ? err.message : 'Error al crear post');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4 p-4 rounded-xl border space-y-3" style={{ background: 'var(--bg)', borderColor: 'var(--glass-border)' }}>
      <div className="grid grid-cols-3 gap-2">
        <select value={clientId} onChange={(e) => setClientId(e.target.value)} required
          className="col-span-3 px-3 py-2 rounded-lg text-sm border" style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)', color: 'var(--text-dark)' }}>
          <option value="">Seleccionar cliente...</option>
          {clients.map((c) => (<option key={c.id} value={c.id}>{c.emoji} {c.name}</option>))}
        </select>
        <select value={postType} onChange={(e) => setPostType(e.target.value as PostType)}
          className="px-2 py-2 rounded-lg text-xs border" style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)', color: 'var(--text-dark)' }}>
          {Object.entries(POST_TYPE_CONFIG).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
        </select>
        <select value={platform} onChange={(e) => setPlatform(e.target.value as Platform)}
          className="px-2 py-2 rounded-lg text-xs border" style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)', color: 'var(--text-dark)' }}>
          {(['instagram', 'tiktok', 'facebook', 'linkedin', 'twitter', 'youtube'] as Platform[]).map((p) => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
        <button type="submit" disabled={saving || !clientId || !copy.trim()}
          className="px-3 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
          style={{ background: 'var(--gradient)' }}>
          {saving ? '...' : 'Crear'}
        </button>
      </div>
      <textarea value={copy} onChange={(e) => setCopy(e.target.value)} rows={2} required
        placeholder="Escribe el copy del post..."
        className="w-full px-3 py-2 rounded-lg text-sm border resize-none"
        style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)', color: 'var(--text-dark)' }} />
    </form>
  );
}
