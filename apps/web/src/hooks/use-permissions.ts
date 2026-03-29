'use client';

import { useAuth } from '@/providers/auth-provider';
import { Role, Permission, ROLE_PERMISSIONS } from '@ethos/shared';

export function usePermissions() {
  const { user } = useAuth();

  const userRole = user?.role as Role | undefined;
  const userPermissions = userRole ? ROLE_PERMISSIONS[userRole] || [] : [];

  const hasPermission = (permission: Permission): boolean => {
    return userPermissions.includes(permission);
  };

  const hasAnyPermission = (...permissions: Permission[]): boolean => {
    return permissions.some((p) => userPermissions.includes(p));
  };

  const hasRole = (...roles: Role[]): boolean => {
    return userRole ? roles.includes(userRole) : false;
  };

  const isAdmin = userRole === Role.SUPER_ADMIN || userRole === Role.ADMIN;

  return { hasPermission, hasAnyPermission, hasRole, isAdmin, userRole };
}
