import type { Post, ApprovalStatus } from '@/types';

export type WorkflowStage = 'editing' | 'internal_review' | 'client_ready' | 'client_approved';

export function getWorkflowStage(post: Post): WorkflowStage {
  if (post.approval_status === 'approved') return 'client_approved';
  if (post.status === 'scheduled') return 'client_ready';
  if (post.status === 'review_1_1' || post.status === 'in_production') return 'internal_review';
  return 'editing';
}

export interface WorkflowStageConfig {
  label: string;
  bg: string;
  text: string;
  dotColor: string;
}

export const WORKFLOW_STAGES: WorkflowStage[] = ['editing', 'internal_review', 'client_ready', 'client_approved'];

export const WORKFLOW_CONFIG: Record<WorkflowStage, WorkflowStageConfig> = {
  editing: { label: 'En edición', bg: 'rgba(158,158,158,0.10)', text: '#666', dotColor: '#9E9E9E' },
  internal_review: { label: 'Revisión interna', bg: 'rgba(167,139,250,0.10)', text: '#5B21B6', dotColor: '#A78BFA' },
  client_ready: { label: 'Con cliente', bg: 'rgba(255,180,50,0.10)', text: '#92400E', dotColor: '#F59E0B' },
  client_approved: { label: 'Aprobado', bg: 'rgba(16,185,129,0.10)', text: '#065F46', dotColor: '#10B981' },
};

/** Maps a kanban drop target stage back to the DB fields */
export function stageToDbFields(stage: WorkflowStage): Partial<Pick<Post, 'status' | 'approval_status' | 'approved_at'>> {
  switch (stage) {
    case 'editing':
      return { status: 'draft', approval_status: 'pending' };
    case 'internal_review':
      return { status: 'in_production', approval_status: 'pending' };
    case 'client_ready':
      return { status: 'scheduled', approval_status: 'pending' };
    case 'client_approved':
      return { status: 'published', approval_status: 'approved' as ApprovalStatus, approved_at: new Date().toISOString() };
  }
}
