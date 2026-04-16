'use client';

import { ReactNode, useState } from 'react';
import { Lightbulb, X } from 'lucide-react';

interface TipBannerProps {
  children: ReactNode;
  icon?: ReactNode;
  variant?: 'info' | 'success' | 'warning';
  dismissible?: boolean;
}

export function TipBanner({ children, icon, variant = 'info', dismissible = false }: TipBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const variantClass = variant === 'success' ? 'success' : variant === 'warning' ? 'warning' : '';

  return (
    <div className={`tip-banner ${variantClass}`}>
      <span className="flex-shrink-0 mt-0.5">
        {icon || <Lightbulb className="w-4 h-4" style={{ color: 'var(--primary-deep)' }} />}
      </span>
      <span className="flex-1">{children}</span>
      {dismissible && (
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 p-0.5 rounded hover:opacity-70 transition-opacity"
        >
          <X className="w-3.5 h-3.5" style={{ color: 'var(--text-light)' }} />
        </button>
      )}
    </div>
  );
}
