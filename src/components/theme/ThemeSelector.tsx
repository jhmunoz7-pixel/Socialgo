'use client';

import { useTheme } from './ThemeProvider';

interface ThemeOption {
  id: 'rose' | 'blue' | 'dark';
  label: string;
  gradient: string;
}

const themeOptions: ThemeOption[] = [
  {
    id: 'rose',
    label: 'Rose',
    gradient: 'linear-gradient(135deg, #FF8FAD 0%, #FFBA8A 100%)',
  },
  {
    id: 'blue',
    label: 'Blue',
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #0EA5E9 100%)',
  },
  {
    id: 'dark',
    label: 'Dark',
    gradient: 'linear-gradient(135deg, #7C3AED 0%, #6366F1 100%)',
  },
];

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="px-3 py-4 flex items-center gap-3 border-b" style={{ borderBottomColor: 'var(--glass-border)' }}>
      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-light)' }}>
        Theme
      </span>
      <div className="flex gap-2">
        {themeOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => setTheme(option.id)}
            className="transition-all duration-200 flex-shrink-0"
            title={option.label}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: option.gradient,
              border: theme === option.id ? '3px solid var(--text-dark)' : '2px solid transparent',
              cursor: 'pointer',
              boxShadow: theme === option.id ? '0 0 0 2px var(--surface)' : 'none',
              transform: theme === option.id ? 'scale(1.1)' : 'scale(1)',
            }}
            aria-label={`Switch to ${option.label} theme`}
          />
        ))}
      </div>
    </div>
  );
}
