'use client';

import { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="w-12 h-12 flex items-center justify-center" style={{ color: 'var(--text-light)' }}>
        {icon}
      </div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: 'var(--gradient)' }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
