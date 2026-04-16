'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed this session
    if (sessionStorage.getItem('sg_pwa_dismissed')) {
      setDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
    setDismissed(true);
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('sg_pwa_dismissed', '1');
  };

  if (!deferredPrompt || dismissed) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-[360px] z-[100] p-4 rounded-2xl border shadow-lg flex items-center gap-3 animate-in"
      style={{ background: 'white', borderColor: 'var(--glass-border)' }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--gradient)' }}>
        <Download className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-dark)' }}>Instalar SocialGo</p>
        <p className="text-xs" style={{ color: 'var(--text-mid)' }}>Accede desde tu pantalla de inicio</p>
      </div>
      <button
        onClick={handleInstall}
        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white flex-shrink-0"
        style={{ background: 'var(--gradient)' }}
      >
        Instalar
      </button>
      <button onClick={handleDismiss} className="p-1 flex-shrink-0 hover:opacity-60">
        <X className="w-4 h-4" style={{ color: 'var(--text-light)' }} />
      </button>
    </div>
  );
}
