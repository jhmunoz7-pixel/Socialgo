'use client';

import { useState, useEffect } from 'react';
import { useCurrentUser } from '@/lib/hooks';
import { MemberRole } from '@/types';

// ============================================================================
// PERMISSION TYPES
// ============================================================================

export type Permission =
  | 'manage_organization'
  | 'manage_billing'
  | 'manage_members'
  | 'manage_packages'
  | 'view_all_clients'
  | 'manage_clients'
  | 'create_posts'
  | 'edit_posts'
  | 'delete_posts'
  | 'approve_posts'
  | 'view_posts'
  | 'view_reports'
  | 'use_ai_studio'
  | 'manage_brand_kits'
  | 'view_brand_kits'
  | 'comment_on_posts';

// ============================================================================
// PERMISSION MATRIX
// ============================================================================

const PERMISSION_MATRIX: Record<MemberRole, Permission[]> = {
  owner: [
    'manage_organization',
    'manage_billing',
    'manage_members',
    'manage_packages',
    'view_all_clients',
    'manage_clients',
    'create_posts',
    'edit_posts',
    'delete_posts',
    'approve_posts',
    'view_posts',
    'view_reports',
    'use_ai_studio',
    'manage_brand_kits',
    'view_brand_kits',
    'comment_on_posts',
  ],
  admin: [
    'manage_billing',
    'manage_members',
    'manage_packages',
    'view_all_clients',
    'manage_clients',
    'create_posts',
    'edit_posts',
    'delete_posts',
    'approve_posts',
    'view_posts',
    'view_reports',
    'use_ai_studio',
    'manage_brand_kits',
    'view_brand_kits',
    'comment_on_posts',
  ],
  member: [
    'view_all_clients',
    'manage_clients',
    'create_posts',
    'edit_posts',
    'delete_posts',
    'approve_posts',
    'view_posts',
    'view_reports',
    'use_ai_studio',
    'manage_brand_kits',
    'view_brand_kits',
    'comment_on_posts',
  ],
  creative: [
    // NO 'view_all_clients' — creatives only see clients assigned via
    // client_members. NO 'manage_packages', NO 'view_reports'.
    'create_posts',
    'edit_posts',
    'view_posts',
    'use_ai_studio',
    'manage_brand_kits',
    'view_brand_kits',
    'comment_on_posts',
  ],
  client_viewer: [
    'view_posts',
    'view_brand_kits',
    'comment_on_posts',
  ],
};

// ============================================================================
// PERMISSION UTILITIES
// ============================================================================

export function hasPermission(role: MemberRole | null, permission: Permission): boolean {
  if (!role) return false;
  return PERMISSION_MATRIX[role]?.includes(permission) ?? false;
}

export function hasAllPermissions(role: MemberRole | null, permissions: Permission[]): boolean {
  if (!role) return false;
  return permissions.every((permission) => hasPermission(role, permission));
}

export function hasAnyPermission(role: MemberRole | null, permissions: Permission[]): boolean {
  if (!role) return false;
  return permissions.some((permission) => hasPermission(role, permission));
}

export function getRolePermissions(role: MemberRole): Permission[] {
  return PERMISSION_MATRIX[role] ?? [];
}

// ============================================================================
// ROLE METADATA
// ============================================================================

export function getRoleLabel(role: MemberRole): string {
  const labels: Record<MemberRole, string> = {
    owner: 'Administrador',
    admin: 'Administrador',
    member: 'Administrador',
    creative: 'Creativo',
    client_viewer: 'Visor de Cliente',
  };
  return labels[role] ?? role;
}

export function getRoleColor(role: MemberRole): string {
  const colors: Record<MemberRole, string> = {
    owner: '#6366F1', // rose deep
    admin: '#6366F1', // same as owner
    member: '#6366F1', // same as owner
    creative: '#C4B5FD', // accent/lavender
    client_viewer: '#93C5FD', // blue
  };
  return colors[role] ?? '#94A3B8';
}

export function getRoleBadgeClass(role: MemberRole): string {
  const classes: Record<MemberRole, string> = {
    owner: 'bg-rose/20 text-rose-deep border border-rose-deep/30',
    admin: 'bg-peach/20 text-orange-700 border border-peach/30',
    member: 'bg-green-100/40 text-green-700 border border-green-300/30',
    creative: 'bg-lavender/20 text-purple-700 border border-purple-300/30',
    client_viewer: 'bg-blue-100/40 text-blue-700 border border-blue-300/30',
  };
  return classes[role] ?? classes.member;
}

// ============================================================================
// PERMISSION LABEL UTILITIES
// ============================================================================

export function getPermissionLabel(permission: Permission): string {
  const labels: Record<Permission, string> = {
    manage_organization: 'Gestionar organización',
    manage_billing: 'Gestionar facturación',
    manage_members: 'Gestionar miembros',
    manage_packages: 'Gestionar paquetes',
    view_all_clients: 'Ver todos los clientes',
    manage_clients: 'Gestionar clientes',
    create_posts: 'Crear posts',
    edit_posts: 'Editar posts',
    delete_posts: 'Eliminar posts',
    approve_posts: 'Aprobar posts',
    view_posts: 'Ver posts',
    view_reports: 'Ver reportes',
    use_ai_studio: 'Usar AI Studio',
    manage_brand_kits: 'Gestionar Brand Kits',
    view_brand_kits: 'Ver Brand Kits',
    comment_on_posts: 'Comentar en posts',
  };
  return labels[permission] ?? permission;
}

// ============================================================================
// REACT HOOK
// ============================================================================

export interface UsePermissionsReturn {
  role: MemberRole | null;
  can: (permission: Permission) => boolean;
  canAll: (permissions: Permission[]) => boolean;
  canAny: (permissions: Permission[]) => boolean;
  loading: boolean;
}

export function usePermissions(): UsePermissionsReturn {
  const { data: currentUserData, loading: userLoading } = useCurrentUser();
  const [role, setRole] = useState<MemberRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userLoading) {
      setRole(currentUserData?.member?.role ?? null);
      setLoading(false);
    }
  }, [userLoading, currentUserData?.member?.role]);

  return {
    role,
    can: (permission: Permission) => hasPermission(role, permission),
    canAll: (permissions: Permission[]) => hasAllPermissions(role, permissions),
    canAny: (permissions: Permission[]) => hasAnyPermission(role, permissions),
    loading,
  };
}
