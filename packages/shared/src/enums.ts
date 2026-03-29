// ==================== ROLES ====================
export enum Role {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user',
}

// ==================== PERMISSIONS ====================
export enum Permission {
  // Users
  USERS_READ = 'users:read',
  USERS_CREATE = 'users:create',
  USERS_UPDATE = 'users:update',
  USERS_DELETE = 'users:delete',

  // Products
  PRODUCTS_READ = 'products:read',
  PRODUCTS_CREATE = 'products:create',
  PRODUCTS_UPDATE = 'products:update',
  PRODUCTS_DELETE = 'products:delete',

  // Stock
  STOCK_READ = 'stock:read',
  STOCK_ADJUST = 'stock:adjust',

  // Families
  FAMILIES_READ = 'families:read',
  FAMILIES_MANAGE = 'families:manage',

  // Import
  IMPORT_EXECUTE = 'import:execute',
  IMPORT_READ = 'import:read',
}

// ==================== ROLE → PERMISSIONS MAP ====================
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: Object.values(Permission),

  [Role.ADMIN]: [
    Permission.USERS_READ,
    Permission.USERS_CREATE,
    Permission.USERS_UPDATE,
    Permission.PRODUCTS_READ,
    Permission.PRODUCTS_CREATE,
    Permission.PRODUCTS_UPDATE,
    Permission.PRODUCTS_DELETE,
    Permission.STOCK_READ,
    Permission.STOCK_ADJUST,
    Permission.FAMILIES_READ,
    Permission.FAMILIES_MANAGE,
    Permission.IMPORT_EXECUTE,
    Permission.IMPORT_READ,
  ],

  [Role.MANAGER]: [
    Permission.PRODUCTS_READ,
    Permission.PRODUCTS_CREATE,
    Permission.PRODUCTS_UPDATE,
    Permission.STOCK_READ,
    Permission.STOCK_ADJUST,
    Permission.FAMILIES_READ,
    Permission.FAMILIES_MANAGE,
    Permission.IMPORT_EXECUTE,
    Permission.IMPORT_READ,
  ],

  [Role.USER]: [
    Permission.PRODUCTS_READ,
    Permission.STOCK_READ,
    Permission.FAMILIES_READ,
    Permission.IMPORT_READ,
  ],
};

// ==================== PRODUCT STATUS ====================
export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISCONTINUED = 'discontinued',
}

// ==================== STOCK MOVEMENT TYPE ====================
export enum MovementType {
  IN = 'in',
  OUT = 'out',
  ADJUSTMENT = 'adjustment',
}

// ==================== IMPORT STATUS ====================
export enum ImportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PREVIEW = 'preview',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  FAILED = 'failed',
}
