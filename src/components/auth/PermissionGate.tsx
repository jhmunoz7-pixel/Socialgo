'use client';

import { usePermissions, Permission } from '@/lib/permissions';

interface PermissionGateProps {
  /** At least one of these permissions is required */
  requires: Permission | Permission[];
  /** If true, ALL permissions are required (default: any one is enough) */
  requireAll?: boolean;
  children: React.ReactNode;
  /** Custom fallback when permission is denied (default: styled message) */
  fallback?: React.ReactNode;
}

export default function PermissionGate({
  requires,
  requireAll = false,
  children,
  fallback,
}: PermissionGateProps) {
  const { canAll, canAny, loading } = usePermissions();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <div
            className="w-8 h-8 border-2 rounded-full animate-spin mx-auto"
            style={{ borderColor: 'var(--glass-border)', borderTopColor: 'var(--text-mid)' }}
          />
          <p className="text-sm" style={{ color: 'var(--text-light)' }}>Cargando...</p>
        </div>
      </div>
    );
  }

  const permissions = Array.isArray(requires) ? requires : [requires];
  const hasAccess = requireAll ? canAll(permissions) : canAny(permissions);

  if (!hasAccess) {
    if (fallback) return <>{fallback}</>;

    return (
      <div className="flex items-center justify-center py-20">
        <div
          className="text-center space-y-3 p-8 rounded-2xl border max-w-md"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--glass-border)',
          }}
        >
          <div className="text-4xl">🔒</div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-dark)' }}>
            Acceso restringido
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-mid)' }}>
            No tienes permisos para acceder a esta sección. Contacta al administrador de tu agencia si necesitas acceso.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
