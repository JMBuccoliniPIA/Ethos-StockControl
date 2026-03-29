// Re-export shared enums for convenience within the API
export { Role, Permission, ROLE_PERMISSIONS, ProductStatus, MovementType, ImportStatus } from '@ethos/shared';

// Auth constants
export const JWT_ACCESS_STRATEGY = 'jwt-access';
export const JWT_REFRESH_STRATEGY = 'jwt-refresh';
export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';
export const PERMISSIONS_KEY = 'permissions';
