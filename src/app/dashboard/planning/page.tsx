'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useClients, usePosts, createPost, updatePost } from '@/lib/hooks';
import { POST_TYPE_CONFIG, FORMAT_CONFIG } from '@/types';
import type { Client, Post, PostType, PostFormat, Platform } from '@/types';
import { PostModal } from '@/components/posts/PostModal';

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Parse a date string as local time (avoids UTC offset issues with date-only strings) */
const parseLocalDate = (dateStr: string): Date => {
  // "2026-04-20" → new Date(2026, 3, 20) in LOCAL timezone (not UTC)
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
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const generateCalendarDays = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - ((startDate.getDay() + 6) % 7));

  const days: { date: Date; isCurrentMonth: boolean }[] = [];
  const current = new Date(startDate);
  for (let i = 0; i < 42; i++) {
    days.push({ date: new Date(current), isCurrentMonth: current.getMonth() === month });
    current.setDate(current.getDate() + 1);
  }
  // Trim trailing weeks if entirely outside month
  while (days.length > 35 && days.slice(-7).every((d) => !d.isCurrentMonth)) {
    days.splice(-7, 7);
  }
  return days;
};

const getPostTypeColor = (type: string): string =>
  POST_TYPE_CONFIG[type as PostType]?.color || '#D0D0D0';

// ─── Post Creator Panel ────────────────────────────────────────────────────

interface PostCreatorProps {
  clients: Client[];
  selectedDate: Date | null;
  onPostCreated: () => void;
}

function PostCreator({ clients, selectedDate, onPostCreated }: PostCreatorProps) {
  const [clientId, setClientId] = useState('');
  const [name, setName] = useState('');
  const [copy, setCopy] = useState('');
  const [cta, setCta] = useState('');
  const [explanation, setExplanation] = useState('');
  const [postType, setPostType] = useState<PostType>('educativo');
  const [format, setFormat] = useState<PostFormat>('reel');
  const [platform, setPlatform] = useState<Platform>('instagram');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('10:00');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync selected date from calendar
  React.useEffect(() => {
    if (selectedDate) {
      setScheduledDate(formatDateKey(selectedDate));
    }
  }, [selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !copy.trim()) {
      setSaveMessage({ type: 'error', text: 'Selecciona un cliente y escribe el copy.' });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      await createPost({
        client_id: clientId,
        name: name.trim() || null,
        copy: copy.trim(),
        cta: cta.trim() || null,
        explanation: explanation.trim() || null,
        post_type: postType,
        format,
        platform,
        scheduled_date: scheduledDate || null,
        scheduled_time: scheduledTime || null,
        status: scheduledDate ? 'planned' : 'draft',
        approval_status: 'pending',
        ai_score: null,
        ai_insights: [] as Record<string, unknown>[],
        image_url: null,
        media_urls: [] as string[],
        inspo_url: null,
        internal_comments: null,
        assigned_to: null,
        approval_token: null,
        approval_comments: null,
        approved_at: null,
        approved_by: null,
      });

      setSaveMessage({ type: 'success', text: 'Post creado exitosamente' });
      // Reset form
      setName('');
      setCopy('');
      setCta('');
      setExplanation('');
      setPostType('educativo');
      setFormat('reel');
      setPlatform('instagram');
      setScheduledTime('10:00');
      onPostCreated();

      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: unknown) {
      console.error('Error creating post:', err);
      let message = 'Error al crear post';
      if (err instanceof Error) {
        message = err.message;
      } else if (err && typeof err === 'object' && 'message' in err) {
        message = String((err as { message: string }).message);
      }
      setSaveMessage({ type: 'error', text: message });
    } finally {
      setIsSaving(false);
    }
  };

  const postTypes = Object.entries(POST_TYPE_CONFIG) as [PostType, typeof POST_TYPE_CONFIG[PostType]][];
  const formats = Object.entries(FORMAT_CONFIG) as [PostFormat, typeof FORMAT_CONFIG[PostFormat]][];
  const platforms: Platform[] = ['instagram', 'tiktok', 'facebook', 'linkedin', 'twitter', 'youtube'];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Client Select */}
      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-mid)' }}>
          Cliente
        </label>
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          required
          className="w-full px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 transition-all"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--glass-border)',
            color: 'var(--text-dark)',
          }}
        >
          <option value="">Seleccionar cliente...</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji} {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Name */}
      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-mid)' }}>
          Nombre del post
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ej: Promo Mayo, Tip #3..."
          className="w-full px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 transition-all"
          style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)', color: 'var(--text-dark)' }}
        />
      </div>

      {/* Post Type + Format + Platform */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-mid)' }}>
            Tipo
          </label>
          <select
            value={postType}
            onChange={(e) => setPostType(e.target.value as PostType)}
            className="w-full px-2 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 transition-all"
            style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)', color: 'var(--text-dark)' }}
          >
            {postTypes.map(([key, config]) => (
              <option key={key} value={key}>
                {config.letter} {config.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-mid)' }}>
            Formato
          </label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as PostFormat)}
            className="w-full px-2 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 transition-all"
            style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)', color: 'var(--text-dark)' }}
          >
            {formats.map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-mid)' }}>
            Plataforma
          </label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as Platform)}
            className="w-full px-2 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 transition-all"
            style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)', color: 'var(--text-dark)' }}
          >
            {platforms.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Copy */}
      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-mid)' }}>
          Copy
        </label>
        <textarea
          value={copy}
          onChange={(e) => setCopy(e.target.value)}
          rows={4}
          required
          placeholder="Escribe el texto del post..."
          className="w-full px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 transition-all resize-none"
          style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)', color: 'var(--text-dark)' }}
        />
        <p className="text-xs mt-1" style={{ color: 'var(--text-light)' }}>
          {copy.length} caracteres
        </p>
      </div>

      {/* CTA */}
      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-mid)' }}>
          CTA (Call to Action)
        </label>
        <input
          type="text"
          value={cta}
          onChange={(e) => setCta(e.target.value)}
          placeholder="ej: Agenda tu cita hoy"
          className="w-full px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 transition-all"
          style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)', color: 'var(--text-dark)' }}
        />
      </div>

      {/* Explanation */}
      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-mid)' }}>
          Explicación / Contexto
        </label>
        <textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          rows={2}
          placeholder="Nota interna sobre el propósito del post..."
          className="w-full px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 transition-all resize-none"
          style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)', color: 'var(--text-dark)' }}
        />
      </div>

      {/* Date + Time */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-mid)' }}>
            Fecha
          </label>
          <input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 transition-all"
            style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)', color: 'var(--text-dark)' }}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-mid)' }}>
            Hora
          </label>
          <input
            type="time"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 transition-all"
            style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)', color: 'var(--text-dark)' }}
          />
        </div>
      </div>

      {/* Messages */}
      {saveMessage && (
        <div
          className={`p-3 rounded-xl text-sm ${
            saveMessage.type === 'success'
              ? 'text-green-800'
              : 'text-red-800'
          }`}
          style={{
            background: saveMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 100, 100, 0.15)',
          }}
        >
          {saveMessage.text}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSaving || !clientId || !copy.trim()}
        className="w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: 'var(--gradient)' }}
      >
        {isSaving ? 'Creando...' : 'Crear Post'}
      </button>
    </form>
  );
}

// ─── Calendar Day Cell ─────────────────────────────────────────────────────

interface DayCellProps {
  date: Date;
  isCurrentMonth: boolean;
  posts: Post[];
  isSelected: boolean;
  onClick: (date: Date) => void;
}

function DayCell({ date, isCurrentMonth, posts, isSelected, onClick }: DayCellProps) {
  const today = isToday(date);

  return (
    <button
      onClick={() => onClick(date)}
      className="min-h-[72px] p-1.5 rounded-lg border transition-all text-left relative"
      style={{
        background: isSelected
          ? 'var(--primary-light, rgba(255, 143, 173, 0.15))'
          : isCurrentMonth
          ? 'var(--surface)'
          : 'transparent',
        borderColor: isSelected
          ? 'var(--primary)'
          : today
          ? 'var(--primary-deep)'
          : 'var(--glass-border)',
        opacity: isCurrentMonth ? 1 : 0.4,
        borderWidth: today || isSelected ? '2px' : '1px',
      }}
    >
      <div
        className="text-xs font-semibold mb-1"
        style={{ color: today ? 'var(--primary-deep)' : 'var(--text-dark)' }}
      >
        {date.getDate()}
      </div>
      <div className="flex flex-wrap gap-0.5">
        {posts.slice(0, 4).map((post) => (
          <div
            key={post.id}
            className="w-4 h-4 rounded-sm flex items-center justify-center text-white font-bold"
            style={{
              backgroundColor: getPostTypeColor(post.post_type || 'otro'),
              fontSize: '8px',
            }}
            title={`${POST_TYPE_CONFIG[post.post_type as PostType]?.label || post.post_type} - ${post.platform}`}
          >
            {POST_TYPE_CONFIG[post.post_type as PostType]?.letter || '?'}
          </div>
        ))}
        {posts.length > 4 && (
          <span className="text-[9px] font-bold" style={{ color: 'var(--text-light)' }}>
            +{posts.length - 4}
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Day Detail Panel ──────────────────────────────────────────────────────

interface DayDetailProps {
  date: Date;
  posts: Post[];
  clients: Client[];
  onClose: () => void;
  onPostClick: (post: Post) => void;
}

function DayDetail({ date, posts, clients, onClose, onPostClick }: DayDetailProps) {
  const clientMap = new Map(clients.map((c) => [c.id, c]));

  return (
    <div
      className="mt-4 p-4 rounded-2xl border"
      style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-serif font-bold" style={{ color: 'var(--text-dark)' }}>
          {date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h4>
        <button
          onClick={onClose}
          className="text-xs font-semibold px-2 py-1 rounded-lg transition-all hover:opacity-70"
          style={{ color: 'var(--primary-deep)' }}
        >
          Cerrar
        </button>
      </div>

      {posts.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--text-light)' }}>
          No hay posts programados para este día.
        </p>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => {
            const client = clientMap.get(post.client_id);
            const typeConfig = POST_TYPE_CONFIG[post.post_type as PostType];
            return (
              <div
                key={post.id}
                className="p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all hover:shadow-sm"
                style={{ background: 'var(--bg)', borderColor: 'var(--glass-border)' }}
                onClick={() => onPostClick(post)}
              >
                <div
                  className="w-6 h-6 rounded flex items-center justify-center text-white font-bold flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: typeConfig?.color || '#D0D0D0', fontSize: '10px' }}
                >
                  {typeConfig?.letter || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-dark)' }}>
                      {client?.emoji} {client?.name || 'Cliente'}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--glass-border)', color: 'var(--text-mid)' }}>
                      {post.platform}
                    </span>
                  </div>
                  <p className="text-xs line-clamp-2" style={{ color: 'var(--text-mid)' }}>
                    {post.copy || '(sin contenido)'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function PlanningPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedClientFilter, setSelectedClientFilter] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const { data: clients, loading: clientsLoading } = useClients();
  const { data: posts, loading: postsLoading, refetch: refetchPosts } = usePosts();

  const monthYear = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  const calendarDays = useMemo(() => generateCalendarDays(currentDate), [currentDate]);

  // Group posts by date
  const postsByDate = useMemo(() => {
    const map: Record<string, Post[]> = {};
    (posts || []).forEach((p) => {
      if (!p.scheduled_date) return;
      if (selectedClientFilter && p.client_id !== selectedClientFilter) return;
      const key = formatDateKey(parseLocalDate(p.scheduled_date));
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    return map;
  }, [posts, selectedClientFilter]);

  // Stats for the month
  const monthStats = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthPosts = (posts || []).filter((p) => {
      if (!p.scheduled_date) return false;
      if (selectedClientFilter && p.client_id !== selectedClientFilter) return false;
      const d = parseLocalDate(p.scheduled_date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    return {
      total: monthPosts.length,
      pending: monthPosts.filter((p) => p.approval_status === 'pending').length,
      approved: monthPosts.filter((p) => p.approval_status === 'approved' || p.approval_status === 'approved_with_changes').length,
    };
  }, [posts, currentDate, selectedClientFilter]);

  const selectedDayPosts = useMemo(() => {
    if (!selectedDate) return [];
    const key = formatDateKey(selectedDate);
    return postsByDate[key] || [];
  }, [selectedDate, postsByDate]);

  const handlePostCreated = useCallback(() => {
    refetchPosts();
  }, [refetchPosts]);

  const goToPreviousMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const goToNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const dayHeaders = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <div className="space-y-6">
      {/* Sticky Header */}
      <div className="sticky-header sticky top-0 z-50 -mx-8 px-8 pt-7 pb-4" style={{ backgroundColor: 'var(--bg)' }}>
        <h1 className="text-2xl font-serif font-bold" style={{ color: 'var(--text-dark)' }}>
          📋 Planificación
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-mid)' }}>
          Crea posts y planifica tu contenido en el calendario mensual
        </p>
      </div>

      {clientsLoading || postsLoading ? (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl" style={{ background: 'var(--glass-border)' }} />
            ))}
          </div>
          <div className="h-96 rounded-2xl" style={{ background: 'var(--glass-border)' }} />
        </div>
      ) : (
      <>

      {/* Month Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Posts del mes', value: monthStats.total, color: 'var(--text-dark)' },
          { label: 'Pendientes', value: monthStats.pending, color: 'var(--primary)' },
          { label: 'Aprobados', value: monthStats.approved, color: 'var(--primary-deep)' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-3 rounded-2xl border"
            style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)' }}
          >
            <p className="text-xs font-semibold" style={{ color: 'var(--text-mid)' }}>
              {stat.label}
            </p>
            <p className="text-2xl font-serif font-bold mt-1" style={{ color: stat.color }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Client filter */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-semibold" style={{ color: 'var(--text-mid)' }}>
          Filtrar por cliente:
        </label>
        <select
          value={selectedClientFilter || ''}
          onChange={(e) => setSelectedClientFilter(e.target.value || null)}
          className="px-3 py-1.5 rounded-xl text-sm border focus:outline-none focus:ring-2 transition-all"
          style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)', color: 'var(--text-dark)' }}
        >
          <option value="">Todos</option>
          {(clients || []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji} {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Main Layout: Left (Creator) | Right (Calendar) */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
        {/* Left: Post Creator */}
        <div
          className="rounded-2xl border p-5 h-fit lg:sticky lg:top-4"
          style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)' }}
        >
          <h2 className="text-base font-serif font-bold mb-4" style={{ color: 'var(--text-dark)' }}>
            Nuevo Post Planeado
          </h2>
          <PostCreator
            clients={clients || []}
            selectedDate={selectedDate}
            onPostCreated={handlePostCreated}
          />
        </div>

        {/* Right: Calendar */}
        <div>
          <div
            className="rounded-2xl border p-5"
            style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)' }}
          >
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={goToPreviousMonth}
                className="p-2 rounded-lg transition-all hover:opacity-70"
                style={{ background: 'var(--bg)' }}
              >
                ◀
              </button>
              <h3
                className="text-lg font-serif font-semibold capitalize"
                style={{ color: 'var(--text-dark)' }}
              >
                {monthYear}
              </h3>
              <button
                onClick={goToNextMonth}
                className="p-2 rounded-lg transition-all hover:opacity-70"
                style={{ background: 'var(--bg)' }}
              >
                ▶
              </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {dayHeaders.map((day) => (
                <div key={day} className="text-center text-xs font-semibold py-1" style={{ color: 'var(--primary-deep)' }}>
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const key = formatDateKey(day.date);
                const dayPosts = postsByDate[key] || [];
                return (
                  <DayCell
                    key={key}
                    date={day.date}
                    isCurrentMonth={day.isCurrentMonth}
                    posts={dayPosts}
                    isSelected={selectedDate !== null && isSameDay(selectedDate, day.date)}
                    onClick={setSelectedDate}
                  />
                );
              })}
            </div>

            {/* Post Type Legend */}
            <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t" style={{ borderColor: 'var(--glass-border)' }}>
              {Object.entries(POST_TYPE_CONFIG).map(([key, config]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: config.color }} />
                  <span className="text-[10px] font-medium" style={{ color: 'var(--text-mid)' }}>
                    {config.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Day Detail (when a day is selected) */}
          {selectedDate && (
            <DayDetail
              date={selectedDate}
              posts={selectedDayPosts}
              clients={clients || []}
              onClose={() => setSelectedDate(null)}
              onPostClick={(post) => setSelectedPost(post)}
            />
          )}
        </div>
      </div>

      {/* Post Detail/Edit Modal */}
      <PostModal
        post={selectedPost}
        client={selectedPost ? (clients?.find(c => c.id === selectedPost.client_id) ?? null) : null}
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
