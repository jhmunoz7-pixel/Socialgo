'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { usePosts, useClients, updatePost } from '@/lib/hooks';
import { POST_TYPE_CONFIG } from '@/types';
import { TipBanner } from '@/components/ui/TipBanner';
import type { Post, PostType } from '@/types';

// Types
interface CalendarDay {
  date: Date;
  dateKey: string;
  isCurrentMonth: boolean;
  isPast: boolean;
  posts: Post[];
}

type DayOfWeek = 'Lun' | 'Mar' | 'Mié' | 'Jue' | 'Vie' | 'Sáb' | 'Dom';

const getClientEmoji = (clientId: string, clients: any[]): string => {
  const client = clients?.find((c: any) => c.id === clientId);
  return client?.emoji || '📱';
};

const formatDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
};

const isPastDate = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d < today;
};

const generateCalendarDays = (date: Date): CalendarDay[] => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - ((startDate.getDay() + 6) % 7));
  const days: CalendarDay[] = [];
  const currentDate = new Date(startDate);
  for (let i = 0; i < 42; i++) {
    const d = new Date(currentDate);
    days.push({ date: d, dateKey: formatDateKey(d), isCurrentMonth: d.getMonth() === month, isPast: isPastDate(d), posts: [] });
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return days;
};

// Post type legend
const PostTypeLegend: React.FC = () => {
  const postTypes = ['educativo', 'ventas_promo', 'fun_casual', 'formal', 'otro'] as PostType[];
  return (
    <div className="rounded-2xl border p-4" style={{ background: 'white', borderColor: 'var(--glass-border)' }}>
      <h3 className="font-serif font-semibold text-sm mb-3" style={{ color: 'var(--text-dark)' }}>Tipos de Post</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {postTypes.map((type) => (
          <div key={type} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: POST_TYPE_CONFIG[type]?.color || '#eee' }} />
            <span className="text-xs capitalize" style={{ color: 'var(--text-dark)' }}>{POST_TYPE_CONFIG[type]?.label || type}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const { data: posts, loading: postsLoading, refetch: refetchPosts } = usePosts();
  const { data: clients, loading: clientsLoading } = useClients();

  const calendarDays = useMemo(() => {
    const days = generateCalendarDays(currentDate);
    posts?.forEach((post) => {
      if (post.scheduled_date) {
        const postDate = post.scheduled_date.split('T')[0];
        const dayIndex = days.findIndex((d) => d.dateKey === postDate);
        if (dayIndex !== -1 && (!selectedClientId || post.client_id === selectedClientId)) {
          days[dayIndex].posts.push(post);
        }
      }
    });
    return days;
  }, [currentDate, posts, selectedClientId]);

  const weeks = useMemo(() => {
    const result = [];
    for (let i = 0; i < calendarDays.length; i += 7) result.push(calendarDays.slice(i, i + 7));
    return result;
  }, [calendarDays]);

  const selectedDayPosts = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = formatDateKey(selectedDate);
    return posts?.filter((p) => {
      if (!p.scheduled_date) return false;
      const k = p.scheduled_date.split('T')[0];
      if (selectedClientId) return k === dateKey && p.client_id === selectedClientId;
      return k === dateKey;
    }) || [];
  }, [selectedDate, posts, selectedClientId]);

  const monthYear = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  const goToPreviousMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const goToNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const newDate = destination.droppableId; // already YYYY-MM-DD
    // Block past dates
    const target = new Date(newDate + 'T12:00:00');
    if (isPastDate(target)) return;

    try {
      await updatePost(draggableId, { scheduled_date: newDate });
      await refetchPosts();
    } catch (err) {
      console.error('Error moving post:', err);
    }
  }, [refetchPosts]);

  const dayOfWeekHeaders: DayOfWeek[] = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <div className="space-y-6">
      {/* Sticky Header */}
      <div className="sticky-header sticky top-0 z-50 -mx-8 px-8 pt-7 pb-4" style={{ backgroundColor: 'var(--bg)' }}>
        <h1 className="text-2xl font-serif font-bold flex items-center gap-2" style={{ color: 'var(--text-dark)' }}>
          <CalendarDays className="w-5 h-5" style={{ color: 'var(--primary-deep)' }} /> Calendario
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-mid)' }}>Vista mensual de tus posts planificados</p>
      </div>

      {(postsLoading || clientsLoading) ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-10 rounded-xl" style={{ background: 'var(--glass-border)' }} />
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-20 rounded-lg" style={{ background: 'var(--glass-border)' }} />
            ))}
          </div>
        </div>
      ) : (
      <div className="space-y-4">
        <TipBanner dismissible>
          Arrastra los posts entre días para reprogramarlos. No se permite mover a fechas pasadas.
        </TipBanner>

        {/* Controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={goToPreviousMonth} className="p-2 rounded-xl hover:opacity-70 transition" style={{ background: 'white', border: '1px solid var(--glass-border)' }}>
              <ChevronLeft className="w-4 h-4" style={{ color: 'var(--text-mid)' }} />
            </button>
            <h2 className="text-lg font-serif font-semibold min-w-48 text-center capitalize" style={{ color: 'var(--text-dark)' }}>{monthYear}</h2>
            <button onClick={goToNextMonth} className="p-2 rounded-xl hover:opacity-70 transition" style={{ background: 'white', border: '1px solid var(--glass-border)' }}>
              <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-mid)' }} />
            </button>
          </div>
          <select value={selectedClientId || ''} onChange={(e) => setSelectedClientId(e.target.value || null)} className="px-3 py-2 rounded-xl text-sm border outline-none" style={{ background: 'white', borderColor: 'var(--glass-border)', color: 'var(--text-dark)' }}>
            <option value="">Todos los clientes</option>
            {clients?.map((c) => <option key={c.id} value={c.id}>{c.emoji || '📱'} {c.name}</option>)}
          </select>
        </div>

        {/* Calendar */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="rounded-2xl border p-4 md:p-6" style={{ background: 'white', borderColor: 'var(--glass-border)' }}>
            {/* Headers */}
            <div className="grid grid-cols-7 gap-2 mb-3">
              {dayOfWeekHeaders.map((day) => (
                <div key={day} className="text-center text-xs font-semibold py-1" style={{ color: 'var(--primary-deep)' }}>{day}</div>
              ))}
            </div>

            {/* Grid */}
            <div className="space-y-2">
              {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 gap-2">
                  {week.map((day) => (
                    <Droppable key={day.dateKey} droppableId={day.dateKey}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          onClick={() => setSelectedDate(day.date)}
                          className={`min-h-[88px] p-2 rounded-xl border transition-all cursor-pointer text-left ${
                            isToday(day.date) ? 'ring-2 ring-[var(--primary-deep)] ring-offset-1' : ''
                          } ${day.isCurrentMonth ? '' : 'opacity-40'}`}
                          style={{
                            background: snapshot.isDraggingOver
                              ? (day.isPast ? 'rgba(255,100,100,0.08)' : 'rgba(99,102,241,0.1)')
                              : 'var(--surface)',
                            borderColor: snapshot.isDraggingOver
                              ? (day.isPast ? 'rgba(255,100,100,0.3)' : 'var(--primary)')
                              : 'var(--glass-border)',
                          }}
                        >
                          <div className={`text-xs font-semibold mb-1 ${day.isCurrentMonth ? '' : ''}`} style={{ color: isToday(day.date) ? 'var(--primary-deep)' : 'var(--text-dark)' }}>
                            {day.date.getDate()}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {day.posts.slice(0, 3).map((post, idx) => (
                              <Draggable key={post.id} draggableId={post.id} index={idx}>
                                {(prov, snap) => (
                                  <div
                                    ref={prov.innerRef}
                                    {...prov.draggableProps}
                                    {...prov.dragHandleProps}
                                    className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold transition-shadow"
                                    style={{
                                      backgroundColor: POST_TYPE_CONFIG[post.post_type || 'otro']?.color || '#C4B5FD',
                                      color: '#0F172A',
                                      boxShadow: snap.isDragging ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                                      ...prov.draggableProps.style,
                                    }}
                                    title={`${post.name || post.post_type} — ${post.platform}`}
                                  >
                                    {getClientEmoji(post.client_id, clients || [])}
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {day.posts.length > 3 && (
                              <span className="text-[9px] font-semibold flex items-center px-1" style={{ color: 'var(--text-light)' }}>+{day.posts.length - 3}</span>
                            )}
                          </div>
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </DragDropContext>

        {/* Selected day detail */}
        {selectedDate && (
          <div className="rounded-2xl border p-5" style={{ background: 'white', borderColor: 'var(--glass-border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-serif font-semibold" style={{ color: 'var(--text-dark)' }}>
                Posts del {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              <button onClick={() => setSelectedDate(null)} className="text-xs font-semibold hover:opacity-70" style={{ color: 'var(--primary-deep)' }}>Cerrar</button>
            </div>

            {selectedDayPosts.length > 0 ? (
              <div className="space-y-3">
                {selectedDayPosts.map((post) => {
                  const client = clients?.find((c) => c.id === post.client_id);
                  return (
                    <div key={post.id} className="p-4 rounded-xl border space-y-2" style={{ background: 'var(--surface)', borderColor: 'var(--glass-border)' }}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-dark)' }}>{client?.emoji || '📱'} {client?.name || 'Cliente'}</p>
                          <p className="text-xs mt-0.5 capitalize" style={{ color: 'var(--text-mid)' }}>{post.platform}</p>
                        </div>
                        <span className="px-2 py-1 rounded-full text-[10px] font-semibold" style={{ backgroundColor: POST_TYPE_CONFIG[post.post_type || 'otro']?.color || '#C4B5FD', color: '#0F172A' }}>
                          {POST_TYPE_CONFIG[post.post_type || 'otro']?.label || post.post_type}
                        </span>
                      </div>
                      {post.copy && <p className="text-xs line-clamp-2" style={{ color: 'var(--text-mid)' }}>{post.copy}</p>}
                      {post.image_url && <img src={post.image_url} alt="Post" className="w-full h-32 object-cover rounded-lg" />}
                      <div className="flex items-center justify-between text-[10px] pt-1" style={{ color: 'var(--text-light)' }}>
                        {post.ai_score !== null && <span>Score: {post.ai_score}%</span>}
                        <span className="capitalize">{post.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-sm py-4" style={{ color: 'var(--text-light)' }}>No hay posts programados para este día</p>
            )}
          </div>
        )}

        <PostTypeLegend />
      </div>
      )}
    </div>
  );
}
