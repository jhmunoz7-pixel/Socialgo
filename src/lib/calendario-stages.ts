import type { Post, ApprovalStatus, PostStatus } from '@/types';

export type StageKey =
  | 'proposal'
  | 'design'
  | 'review_internal'
  | 'review_client'
  | 'ready'
  | 'scheduled'
  | 'published';

export interface StageConfig {
  key: StageKey;
  label: string;
  shortLabel: string;
  icon: string;
  /** Accent color for dots, badges, border bars */
  accent: string;
  /** Soft background for chip pill */
  chipBg: string;
  /** Chip text color */
  chipText: string;
  /** Label to use as the contextual action button */
  nextActionLabel: string | null;
  /** Next stage the action button advances to, if any */
  nextStageKey: StageKey | null;
}

export const STAGE_CONFIG: Record<StageKey, StageConfig> = {
  proposal: {
    key: 'proposal',
    label: 'Propuesta del mes',
    shortLabel: 'Propuesta',
    icon: '💭',
    accent: '#94A3B8',
    chipBg: '#F1F5F9',
    chipText: '#475569',
    nextActionLabel: 'Pasar a diseño',
    nextStageKey: 'design',
  },
  design: {
    key: 'design',
    label: 'En diseño',
    shortLabel: 'En diseño',
    icon: '✏️',
    accent: '#6366F1',
    chipBg: '#EEF2FF',
    chipText: '#4F46E5',
    nextActionLabel: 'Mandar a revisión interna',
    nextStageKey: 'review_internal',
  },
  review_internal: {
    key: 'review_internal',
    label: 'Revisión interna',
    shortLabel: 'Revisión',
    icon: '👀',
    accent: '#A78BFA',
    chipBg: '#F5F3FF',
    chipText: '#7C3AED',
    nextActionLabel: 'Mandar a cliente',
    nextStageKey: 'review_client',
  },
  review_client: {
    key: 'review_client',
    label: 'Con cliente',
    shortLabel: 'Cliente',
    icon: '📤',
    accent: '#F59E0B',
    chipBg: '#FFFBEB',
    chipText: '#B45309',
    nextActionLabel: 'Marcar como aprobado',
    nextStageKey: 'ready',
  },
  ready: {
    key: 'ready',
    label: 'Listo p/ programar',
    shortLabel: 'Listo',
    icon: '✅',
    accent: '#10B981',
    chipBg: '#ECFDF5',
    chipText: '#047857',
    nextActionLabel: 'Programar',
    nextStageKey: 'scheduled',
  },
  scheduled: {
    key: 'scheduled',
    label: 'Programado',
    shortLabel: 'Programado',
    icon: '🚀',
    accent: '#38BDF8',
    chipBg: '#E0F2FE',
    chipText: '#0284C7',
    nextActionLabel: null,
    nextStageKey: null,
  },
  published: {
    key: 'published',
    label: 'Publicado',
    shortLabel: 'Publicado',
    icon: '📢',
    accent: '#16A34A',
    chipBg: '#DCFCE7',
    chipText: '#15803D',
    nextActionLabel: null,
    nextStageKey: null,
  },
};

export const STAGE_ORDER: StageKey[] = [
  'proposal',
  'design',
  'review_internal',
  'review_client',
  'ready',
  'scheduled',
  'published',
];

/**
 * Maps a DB post row to one of the 7 calendario stages.
 * Derived from `status` + `approval_status` (post_type unchanged).
 */
export function postToStage(post: Post): StageKey {
  if (post.status === 'published') return 'published';
  if (post.status === 'scheduled' && post.approval_status === 'approved') return 'scheduled';
  if (post.approval_status === 'approved') return 'ready';
  if (post.status === 'review_1_1' || post.approval_status === 'pending' && (post.status === 'scheduled' || post.status === 'approved_with_changes')) {
    // A scheduled or approved_with_changes post waiting on client response
    if (post.status === 'scheduled' || post.status === 'approved_with_changes') return 'review_client';
    return 'review_internal';
  }
  if (post.status === 'in_production') return 'review_internal';
  if (post.status === 'planned') return 'design';
  return 'proposal';
}

/**
 * Returns the DB fields to set when advancing a post to a given stage.
 */
export function stageToPostFields(stage: StageKey): Partial<Pick<Post, 'status' | 'approval_status' | 'approved_at'>> {
  const now = new Date().toISOString();
  switch (stage) {
    case 'proposal':
      return { status: 'draft' as PostStatus, approval_status: 'pending' as ApprovalStatus };
    case 'design':
      return { status: 'planned' as PostStatus, approval_status: 'pending' as ApprovalStatus };
    case 'review_internal':
      return { status: 'review_1_1' as PostStatus, approval_status: 'review_1_1' as ApprovalStatus };
    case 'review_client':
      return { status: 'scheduled' as PostStatus, approval_status: 'pending' as ApprovalStatus };
    case 'ready':
      return { status: 'approved' as PostStatus, approval_status: 'approved' as ApprovalStatus, approved_at: now };
    case 'scheduled':
      return { status: 'scheduled' as PostStatus, approval_status: 'approved' as ApprovalStatus, approved_at: now };
    case 'published':
      return { status: 'published' as PostStatus, approval_status: 'approved' as ApprovalStatus };
  }
}
