import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, ROLES_KEY, PERMISSIONS_KEY, Permission, ROLE_PERMISSIONS } from '../constants';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check for required roles
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Check for required permissions
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles or permissions required, allow access
    if (!requiredRoles && !requiredPermissions) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    // Check roles
    if (requiredRoles && requiredRoles.length > 0) {
      if (requiredRoles.includes(user.role)) return true;
    }

    // Check permissions
    if (requiredPermissions && requiredPermissions.length > 0) {
      const userPermissions = ROLE_PERMISSIONS[user.role as Role] || [];
      return requiredPermissions.every((perm) => userPermissions.includes(perm));
    }

    // If only roles were specified and user doesn't match
    if (requiredRoles && !requiredPermissions) return false;

    return true;
  }
}
