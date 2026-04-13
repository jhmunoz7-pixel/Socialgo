'use client';

import React, { useState } from 'react';
import type { Client } from '@/types';

interface InstagramPanelProps {
  client: Client;
  onRefresh?: () => void;
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: '16px',
        background: 'var(--surface)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--glass-border)',
        borderRadius: '12px',
        textAlign: 'center',
      }}
    >
      <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '4px' }}>
        {value}
      </p>
      <p style={{ fontSize: '11px', color: 'var(--text-mid)', fontWeight: 500 }}>
        {label}
      </p>
      <p style={{ fontSize: '10px', color: 'var(--text-light)', marginTop: '4px' }}>
        Conecta para ver datos
      </p>
    </div>
  );
}

export default function InstagramPanel({ client, onRefresh }: InstagramPanelProps) {
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleConnect = () => {
    alert('Próximamente — La conexión con Meta API requiere configuración adicional');
  };

  const handleDisconnect = () => {
    const confirmed = window.confirm(
      '¿Estás seguro de que quieres desconectar tu Instagram? Perderás acceso a las métricas.'
    );
    if (confirmed) {
      setIsDisconnecting(true);
      // In a real app, this would call an API to disconnect
      setTimeout(() => {
        alert('Instagram desconectado');
        setIsDisconnecting(false);
        if (onRefresh) onRefresh();
      }, 500);
    }
  };

  return (
    <div
      style={{
        background: 'var(--surface)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--glass-border)',
        borderRadius: '16px',
        padding: '24px',
      }}
    >
      {!client.instagram_connected ? (
        // Not connected state
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header */}
          <div>
            <h3
              style={{
                margin: '0 0 8px 0',
                color: 'var(--text-dark)',
                fontSize: '18px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              📱 Conecta Instagram
            </h3>
            <p
              style={{
                margin: 0,
                color: 'var(--text-mid)',
                fontSize: '14px',
                lineHeight: '1.5',
              }}
            >
              Desbloquea análisis en tiempo real y mejora tu estrategia de contenido con datos de Instagram
            </p>
          </div>

          {/* Features list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <FeatureItem icon="📊" label="Métricas de alcance" />
            <FeatureItem icon="💬" label="Engagement rate" />
            <FeatureItem icon="⏰" label="Mejores horarios para publicar" />
            <FeatureItem icon="👥" label="Análisis de audiencia" />
          </div>

          {/* Connect button */}
          <button
            onClick={handleConnect}
            style={{
              padding: '12px 20px',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-deep) 100%)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.transform = 'translateY(-2px)';
              el.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.transform = 'translateY(0)';
              el.style.boxShadow = 'none';
            }}
          >
            Conectar Instagram
          </button>
        </div>
      ) : (
        // Connected state
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header with status */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '8px',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  color: 'var(--text-dark)',
                  fontSize: '18px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                📱 Instagram Conectado
              </h3>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '6px',
                  color: 'rgb(22, 163, 74)',
                  fontSize: '12px',
                  fontWeight: '600',
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'rgb(22, 163, 74)',
                  }}
                />
                Activo
              </div>
            </div>

            {client.instagram && (
              <p
                style={{
                  margin: 0,
                  color: 'var(--text-mid)',
                  fontSize: '14px',
                }}
              >
                @{client.instagram}
              </p>
            )}
          </div>

          {/* Metrics cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '12px',
            }}
          >
            <MetricCard label="Seguidores" value="—" />
            <MetricCard label="Alcance" value="—" />
            <MetricCard label="Engagement" value="—" />
            <MetricCard label="Mejores horarios" value="—" />
          </div>

          {/* API notice */}
          <div
            style={{
              padding: '12px',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '8px',
              fontSize: '12px',
              color: 'var(--text-mid)',
              lineHeight: '1.5',
            }}
          >
            ℹ️ Las métricas en tiempo real estarán disponibles cuando se configure la Meta Business API
          </div>

          {/* Disconnect button */}
          <button
            onClick={handleDisconnect}
            disabled={isDisconnecting}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: '1px solid var(--glass-border)',
              borderRadius: '8px',
              color: 'var(--text-mid)',
              fontWeight: '500',
              fontSize: '14px',
              cursor: isDisconnecting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: isDisconnecting ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isDisconnecting) {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = 'var(--text-light)';
                el.style.color = 'var(--text-dark)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isDisconnecting) {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = 'var(--glass-border)';
                el.style.color = 'var(--text-mid)';
              }
            }}
          >
            {isDisconnecting ? 'Desconectando...' : 'Desconectar Instagram'}
          </button>
        </div>
      )}
    </div>
  );
}

interface FeatureItemProps {
  icon: string;
  label: string;
}

function FeatureItem({ icon, label }: FeatureItemProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        background: 'var(--bg)',
        borderRadius: '8px',
        border: '1px solid var(--glass-border)',
      }}
    >
      <span style={{ fontSize: '18px' }}>{icon}</span>
      <span
        style={{
          color: 'var(--text-dark)',
          fontSize: '14px',
          fontWeight: '500',
        }}
      >
        {label}
      </span>
    </div>
  );
}
