'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type ThemeId = 'rose' | 'blue' | 'dark';

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: 'rose', setTheme: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

const themeVariables: Record<ThemeId, Record<string, string>> = {
  rose: {
    '--primary': '#FFB5C8',
    '--primary-deep': '#FF8FAD',
    '--secondary': '#FFD4B8',
    '--secondary-deep': '#FFBA8A',
    '--accent': '#E8D5FF',
    '--bg': '#FFF8F3',
    '--bg-warm': '#FFFBF8',
    '--surface': 'rgba(255,255,255,0.55)',
    '--glass-border': 'rgba(255,180,150,0.25)',
    '--text-dark': '#2A1F1A',
    '--text-mid': '#7A6560',
    '--text-light': '#B8A9A4',
    '--gradient': 'linear-gradient(135deg, #FF8FAD 0%, #FFBA8A 100%)',
    '--sidebar-bg': 'rgba(255,248,243,0.85)',
  },
  blue: {
    '--primary': '#93C5FD',
    '--primary-deep': '#3B82F6',
    '--secondary': '#BAE6FD',
    '--secondary-deep': '#0EA5E9',
    '--accent': '#C7D2FE',
    '--bg': '#F8FAFC',
    '--bg-warm': '#FFFFFF',
    '--surface': 'rgba(255,255,255,0.7)',
    '--glass-border': 'rgba(59,130,246,0.15)',
    '--text-dark': '#0F172A',
    '--text-mid': '#475569',
    '--text-light': '#94A3B8',
    '--gradient': 'linear-gradient(135deg, #3B82F6 0%, #0EA5E9 100%)',
    '--sidebar-bg': 'rgba(248,250,252,0.9)',
  },
  dark: {
    '--primary': '#A78BFA',
    '--primary-deep': '#7C3AED',
    '--secondary': '#818CF8',
    '--secondary-deep': '#6366F1',
    '--accent': '#F0ABFC',
    '--bg': '#0F0F14',
    '--bg-warm': '#1A1A24',
    '--surface': 'rgba(30,30,42,0.8)',
    '--glass-border': 'rgba(124,58,237,0.2)',
    '--text-dark': '#F1F5F9',
    '--text-mid': '#94A3B8',
    '--text-light': '#64748B',
    '--gradient': 'linear-gradient(135deg, #7C3AED 0%, #6366F1 100%)',
    '--sidebar-bg': 'rgba(15,15,20,0.9)',
  },
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>('rose');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Try to load theme from localStorage
    const savedTheme = localStorage.getItem('theme') as ThemeId | null;
    if (savedTheme && (savedTheme === 'rose' || savedTheme === 'blue' || savedTheme === 'dark')) {
      setThemeState(savedTheme);
      applyTheme(savedTheme);
    } else {
      applyTheme('rose');
    }
  }, []);

  const applyTheme = (themeId: ThemeId) => {
    const variables = themeVariables[themeId];
    Object.entries(variables).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
  };

  const setTheme = (newTheme: ThemeId) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
