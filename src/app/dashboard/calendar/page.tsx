'use client';

import React, { useState, useMemo } from 'react';
// Icon replacements (no external dependency)
const ChevronLeft = ({ className }: { className?: string }) => <span className={className} style={{ display: 'inline-block' }}>◀</span>;
const ChevronRight = ({ className }: { className?: string }) => <span className={className} style={{ display: 'inline-block' }}>▶</span>;
import { usePosts } from '@/lib/hooks';
import { useClients } from '@/lib/hooks';
import { POST_TYPE_CONFIG } from '@/types';
import type { Post, PostType } from '@/types';

// Types
interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  posts: Post[];
}

type DayOfWeek = 'Lun' | 'Mar' | 'Mié' | 'Jue' | 'Vie' | 'Sáb' | 'Dom';

// Helper: Get emoji for client (placeholder - can be customized)
const getClientEmoji = (clientId: string): string => {
  const emojis = ['🎨', '📱', '🚀', '💼', '🎯', '✨', '🌟', '💡', '🎪', '🏆'];
  const hash = clientId.charCodeAt(0) || 0;
  return emojis[hash % emojis.length];
};

// Helper: Generate calendar grid
const generateCalendarDays = (date: Date): CalendarDay[] => {
  const year = date.getFullYear();
  const month = date.getMonth();

  // First day of the month and day of week it falls on
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Starting Monday (1) instead of Sunday (0)
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - ((startDate.getDay() + 6) % 7));

  const days: CalendarDay[] = [];
  let currentDate = new Date(startDate);

  // Generate 42 days (6 weeks)
  for (let i = 0; i < 42; i++) {
    days.push({
      date: new Date(currentDate),
      isCurrentMonth: currentDate.getMonth() === month,
      posts: [],
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return days;
};

// Helper: Check if date is today
const isToday = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

// Helper: Format date for comparison (YYYY-MM-DD)
const formatDateKey = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Post type color legend
const PostTypeLegend: React.FC = () => {
  const postTypes = [
    'educativo',
    'ventas_promo',
    'fun_casual',
    'formal',
    'otro',
  ] as PostType[];

  return (
    <div
      style={{ background: 'rgba(255, 248, 243, 0.7)', backdropFilter: 'blur(16px)' }}
      className="rounded-2xl border border-white/40 p-4 shadow-sm"
    >
      <h3 className="font-serif font-semibold text-[#2A1F1A] mb-3 text-sm">Tipos de Post</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {postTypes.map((type) => (
          <div key={type} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: POST_TYPE_CONFIG[type]?.color || '#eee' }}
            />
            <span className="text-xs text-[#2A1F1A] capitalize">{POST_TYPE_CONFIG[type]?.label || type}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Day cell component
interface DayCellProps {
  day: CalendarDay;
  onSelectDay: (date: Date) => void;
}

const DayCell: React.FC<DayCellProps> = ({ day, onSelectDay }) => {
  const { date, isCurrentMonth, posts } = day;
  const today = isToday(date);

  return (
    <button
      onClick={() => onSelectDay(date)}
      className={`
        min-h-24 p-2 rounded-lg border transition-all cursor-pointer text-left
        ${today ? 'ring-2 ring-[#FF8FAD] ring-offset-1' : 'border-gray-200'}
        ${isCurrentMonth ? 'bg-white/60 hover:bg-white/80' : 'bg-gray-50/40'}
      `}
    >
      {/* Date number */}
      <div className={`text-xs font-semibold mb-1 ${isCurrentMonth ? 'text-[#2A1F1A]' : 'text-gray-400'}`}>
        {date.getDate()}
      </div>

      {/* Posts indicators */}
      <div className="flex flex-wrap gap-1">
        {posts.slice(0, 3).map((post) => (
          <div
            key={post.id}
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
            style={{
              backgroundColor: POST_TYPE_CONFIG[post.post_type || 'otro']?.color || '#FFD4B8',
              color: '#2A1F1A',
            }}
            title={`${post.post_type} - ${post.platform}`}
          >
            {getClientEmoji(post.client_id).slice(0, 1)}
          </div>
        ))}
        {posts.length > 3 && (
          <div className="text-[9px] text-gray-500 font-semibold flex items-center px-1">
            +{posts.length - 3}
          </div>
        )}
      </div>
    </button>
  );
};

// Main calendar component
export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const { data: posts, loading: postsLoading } = usePosts();
  const { data: clients, loading: clientsLoading } = useClients();

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const days = generateCalendarDays(currentDate);

    // Populate posts for each day
    posts?.forEach((post) => {
      if (post.scheduled_date && post.status === 'scheduled') {
        const postDate = formatDateKey(new Date(post.scheduled_date));
        const dayIndex = days.findIndex((d) => formatDateKey(d.date) === postDate);

        if (dayIndex !== -1) {
          // Apply client filter
          if (!selectedClientId || post.client_id === selectedClientId) {
            days[dayIndex].posts.push(post);
          }
        }
      }
    });

    return days;
  }, [currentDate, posts, selectedClientId]);

  // Get weeks for grid layout
  const weeks = useMemo(() => {
    const result = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7));
    }
    return result;
  }, [calendarDays]);

  // Selected day posts
  const selectedDayPosts = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = formatDateKey(selectedDate);
    return posts?.filter((p) => {
      if (!p.scheduled_date || p.status !== 'scheduled') return false;
      const postDateKey = formatDateKey(new Date(p.scheduled_date));
      if (!selectedClientId) return postDateKey === dateKey;
      return postDateKey === dateKey && p.client_id === selectedClientId;
    }) || [];
  }, [selectedDate, posts, selectedClientId]);

  // Month/year display
  const monthYear = currentDate.toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  });

  // Prev/next month handlers
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const dayOfWeekHeaders: DayOfWeek[] = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <div className="space-y-6">
      {/* Sticky Header */}
      <div className="sticky-header sticky top-0 z-50 -mx-8 px-8 pt-7 pb-4" style={{ backgroundColor: 'var(--bg)' }}>
        <h1 className="text-2xl font-serif font-bold" style={{ color: 'var(--text-dark)' }}>📅 Calendario</h1>
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
      <div>
        <div className="space-y-4">
          <div>

          {/* Controls: Month navigation + Client filter */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Month navigation */}
            <div className="flex items-center gap-4">
              <button
                onClick={goToPreviousMonth}
                className="p-2 rounded-lg hover:bg-white/60 transition-colors"
                aria-label="Mes anterior"
              >
                <ChevronLeft className="w-5 h-5 text-[#FF8FAD]" />
              </button>
              <h2 className="text-lg font-serif font-semibold text-[#2A1F1A] min-w-48 text-center capitalize">
                {monthYear}
              </h2>
              <button
                onClick={goToNextMonth}
                className="p-2 rounded-lg hover:bg-white/60 transition-colors"
                aria-label="Próximo mes"
              >
                <ChevronRight className="w-5 h-5 text-[#FF8FAD]" />
              </button>
            </div>

            {/* Client filter dropdown */}
            <select
              value={selectedClientId || ''}
              onChange={(e) => setSelectedClientId(e.target.value || null)}
              className="px-4 py-2 rounded-lg border border-white/40 bg-white/60 backdrop-blur-sm text-[#2A1F1A] font-sans text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8FAD] focus:ring-offset-2"
              style={{ background: 'rgba(255, 248, 243, 0.7)', backdropFilter: 'blur(16px)' }}
            >
              <option value="">Todos los clientes</option>
              {clients?.map((client) => (
                <option key={client.id} value={client.id}>
                  {getClientEmoji(client.id)} {client.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Calendar Container */}
        <div
          style={{ background: 'rgba(255, 248, 243, 0.7)', backdropFilter: 'blur(16px)' }}
          className="rounded-2xl border border-white/40 shadow-sm p-6"
        >
          {/* Day of week headers */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {dayOfWeekHeaders.map((day) => (
              <div
                key={day}
                className="text-center font-serif font-semibold text-[#FF8FAD] text-sm py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="space-y-2">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-2">
                {week.map((day) => (
                  <DayCell key={formatDateKey(day.date)} day={day} onSelectDay={setSelectedDate} />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Selected day posts panel */}
        {selectedDate && (
          <div
            style={{ background: 'rgba(255, 248, 243, 0.7)', backdropFilter: 'blur(16px)' }}
            className="rounded-2xl border border-white/40 shadow-sm p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-serif font-semibold text-[#2A1F1A]">
                Posts del {selectedDate.toLocaleDateString('es-ES', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </h3>
              <button
                onClick={() => setSelectedDate(null)}
                className="text-[#FF8FAD] hover:text-[#FF5A7E] font-semibold text-sm"
              >
                Cerrar
              </button>
            </div>

            {selectedDayPosts.length > 0 ? (
              <div className="space-y-3">
                {selectedDayPosts.map((post) => {
                  const client = clients?.find((c) => c.id === post.client_id);
                  return (
                    <div
                      key={post.id}
                      className="p-4 rounded-lg bg-white/60 border border-white/40 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-[#2A1F1A]">
                            {getClientEmoji(post.client_id)} {client?.name || 'Cliente'}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">{post.platform}</p>
                        </div>
                        <div
                          className="px-2 py-1 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: POST_TYPE_CONFIG[post.post_type || 'otro']?.color || '#FFD4B8',
                            color: '#2A1F1A',
                          }}
                        >
                          {POST_TYPE_CONFIG[post.post_type || 'otro']?.label || post.post_type}
                        </div>
                      </div>
                      <p className="text-sm text-[#2A1F1A] line-clamp-2">{post.copy}</p>
                      {post.image_url && (
                        <img
                          src={post.image_url}
                          alt="Post"
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex items-center justify-between text-xs text-gray-600 pt-2">
                        <span>Score: {post.ai_score}%</span>
                        <span className="capitalize">{post.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-gray-500 font-sans text-sm">
                No hay posts programados para este día
              </p>
            )}
          </div>
        )}

        {/* Legend */}
        <PostTypeLegend />
      </div>
      </div>
      )}
    </div>
  );
}
