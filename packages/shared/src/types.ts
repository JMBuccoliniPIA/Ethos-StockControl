import {
  Role,
  ProductStatus,
  MovementType,
  ImportStatus,
} from './enums';

// ==================== BASE ====================
export interface BaseEntity {
  _id: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== USER ====================
export interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  lastLoginAt?: string;
}

// ==================== FAMILY ====================
export interface Family extends BaseEntity {
  name: string;
  description?: string;
  isActive: boolean;
}

// ==================== SUBFAMILY ====================
export interface Subfamily extends BaseEntity {
  name: string;
  familyId: string;
  parentId?: string | null;
  description?: string;
  isActive: boolean;
}

export interface SubfamilyTree extends Subfamily {
  children: SubfamilyTree[];
}

// ==================== PRODUCT ====================
export interface Product extends BaseEntity {
  sku: string;
  name: string;
  description?: string;
  familyId: string;
  subfamilyId?: string;
  stock: number;
  stockMin: number;
  basePrice: number;
  discountPercent: number;
  finalPrice: number;
  status: ProductStatus;
  imageUrl?: string;
  createdBy: string;
}

// ==================== STOCK MOVEMENT ====================
export interface StockMovement extends BaseEntity {
  productId: string;
  type: MovementType;
  quantity: number;
  reason: string;
  previousStock: number;
  newStock: number;
  performedBy: string;
}

// ==================== IMPORT JOB ====================
export interface ImportPreviewRow {
  rowNumber: number;
  data: Record<string, unknown>;
  status: 'valid' | 'error' | 'duplicate';
  errors?: string[];
}

export interface ImportJobResult {
  productsCreated: number;
  familiesCreated: number;
  subfamiliesCreated: number;
  stockMovements: number;
}

export interface ImportJob extends BaseEntity {
  fileName: string;
  originalName: string;
  status: ImportStatus;
  totalRows: number;
  validRows: number;
  errorRows: number;
  duplicateRows: number;
  columnMapping: Record<string, string>;
  previewData?: ImportPreviewRow[];
  errors?: Array<{ row: number; message: string }>;
  result?: ImportJobResult;
  uploadedBy: string;
  completedAt?: string;
}

// ==================== API RESPONSES ====================
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

// ==================== AUTH ====================
export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface TokenPayload {
  sub: string;
  email: string;
  role: Role;
}
