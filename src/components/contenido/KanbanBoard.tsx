'use client';

import React, { useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { updatePost } from '@/lib/hooks';
import { getWorkflowStage, WORKFLOW_STAGES, WORKFLOW_CONFIG, stageToDbFields, type WorkflowStage } from '@/lib/workflow';
import type { Post, Client, PostType } from '@/types';
import { POST_TYPE_CONFIG } from '@/types';
import { Calendar, Image } from 'lucide-react';

interface KanbanBoardProps {
  posts: Post[];
  clientMap: Map<string, Client>;
  role: string | null;
  onStatusChange: () => void;
}

export function KanbanBoard({ posts, clientMap, role, onStatusChange }: KanbanBoardProps) {
  const isClient = role === 'client_viewer';

  const columns = useMemo(() => {
    const stages = isClient
      ? (['client_ready', 'client_approved'] as WorkflowStage[])
      : WORKFLOW_STAGES;

    return stages.map((stage) => ({
      stage,
      config: WORKFLOW_CONFIG[stage],
      posts: posts.filter((p) => getWorkflowStage(p) === stage),
    }));
  }, [posts, isClient]);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const newStage = destination.droppableId as WorkflowStage;
    const dbFields = stageToDbFields(newStage);

    try {
      await updatePost(draggableId, dbFields);
      onStatusChange();
    } catch (err) {
      console.error('Error moving post:', err);
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
        {columns.map(({ stage, config, posts: columnPosts }) => (
          <div key={stage} className="flex-shrink-0 w-[280px] flex flex-col">
            {/* Column header */}
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-t-2xl" style={{ background: config.bg }}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.dotColor }} />
              <span className="text-xs font-semibold" style={{ color: config.text }}>{config.label}</span>
              <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${config.dotColor}20`, color: config.text }}>
                {columnPosts.length}
              </span>
            </div>

            {/* Droppable area */}
            <Droppable droppableId={stage}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="flex-1 space-y-2 p-2 rounded-b-2xl border border-t-0 transition-colors"
                  style={{
                    borderColor: 'var(--glass-border)',
                    background: snapshot.isDraggingOver ? `${config.dotColor}08` : 'transparent',
                    minHeight: 100,
                  }}
                >
                  {columnPosts.map((post, index) => (
                    <Draggable key={post.id} draggableId={post.id} index={index} isDragDisabled={isClient}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="rounded-xl border overflow-hidden transition-shadow"
                          style={{
                            background: 'white',
                            borderColor: snapshot.isDragging ? config.dotColor : 'var(--glass-border)',
                            boxShadow: snapshot.isDragging ? '0 8px 30px rgba(99,102,241,0.15)' : 'var(--shadow-card)',
                            ...provided.draggableProps.style,
                          }}
                        >
                          <KanbanCard post={post} client={clientMap.get(post.client_id)} />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}

function KanbanCard({ post, client }: { post: Post; client?: Client }) {
  const typeConfig = POST_TYPE_CONFIG[post.post_type as PostType];

  return (
    <div className="p-3 space-y-2">
      {/* Thumbnail */}
      {post.image_url ? (
        <img src={post.image_url} alt="" className="w-full h-28 object-cover rounded-lg" />
      ) : (
        <div className="w-full h-20 rounded-lg flex items-center justify-center" style={{ background: `${typeConfig?.color || '#D0D0D0'}10` }}>
          <Image className="w-5 h-5" style={{ color: 'var(--text-light)' }} />
        </div>
      )}

      {/* Client */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs">{client?.emoji || '📱'}</span>
        <span className="text-[11px] font-semibold truncate" style={{ color: 'var(--text-dark)' }}>{client?.name || 'Cliente'}</span>
      </div>

      {/* Title */}
      {post.name && (
        <p className="text-xs font-semibold leading-snug truncate" style={{ color: 'var(--text-dark)' }}>{post.name}</p>
      )}

      {/* Copy preview */}
      {post.copy && (
        <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: 'var(--text-mid)' }}>{post.copy}</p>
      )}

      {/* Tags row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {typeConfig && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: `${typeConfig.color}20`, color: typeConfig.color }}>
            {typeConfig.label}
          </span>
        )}
        <span className="text-[9px] px-1.5 py-0.5 rounded-full capitalize" style={{ background: 'var(--glass-border)', color: 'var(--text-mid)' }}>
          {post.platform}
        </span>
        {post.scheduled_date && (
          <span className="text-[9px] flex items-center gap-0.5" style={{ color: 'var(--text-light)' }}>
            <Calendar className="w-2.5 h-2.5" />
            {new Date(post.scheduled_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>
    </div>
  );
}
