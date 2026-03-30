import { z } from 'zod';

export const unifiedProductSchema = z.object({
  sku: z.string().min(1, 'El SKU es requerido'),
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  familyId: z.string().optional(),
  subfamilyId: z.string().optional(),
  stock: z.number().min(0).optional(),
  stockMin: z.number().min(0).optional(),
  selectedSupplierProductId: z.string().optional(),
  selectedCost: z.number().min(0).optional(),
  profitMarginPercent: z.number().min(0).max(100).optional(),
  status: z.enum(['active', 'inactive', 'discontinued']).optional(),
  imageUrl: z.string().optional(),
});

export type UnifiedProductFormData = z.infer<typeof unifiedProductSchema>;

export interface SupplierProductRef {
  _id: string;
  supplierSku: string;
  supplierName: string;
  basePrice: number;
  discountPercent: number;
  netCost: number;
  supplierId: {
    _id: string;
    name: string;
  };
}

export interface UnifiedProduct {
  _id: string;
  sku: string;
  name: string;
  description?: string;
  familyId?: {
    _id: string;
    name: string;
  };
  subfamilyId?: {
    _id: string;
    name: string;
  };
  stock: number;
  stockMin: number;
  selectedSupplierProductId?: SupplierProductRef;
  selectedCost: number;
  profitMarginPercent: number;
  salePrice: number;
  status: 'active' | 'inactive' | 'discontinued';
  imageUrl?: string;
  createdBy?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface MappingSuggestion {
  supplierProduct: {
    _id: string;
    supplierSku: string;
    supplierName: string;
    basePrice: number;
    discountPercent: number;
    netCost: number;
    supplierId: {
      _id: string;
      name: string;
    };
  };
  suggestions: Array<{
    unifiedProduct: UnifiedProduct;
    score: number;
    matchType: 'exact_sku' | 'similar_name' | 'partial_match';
  }>;
}

export interface UnifiedProductQuery {
  search?: string;
  familyId?: string;
  subfamilyId?: string;
  status?: string;
  hasSupplier?: 'true' | 'false';
  page?: number;
  limit?: number;
}

export interface UnifiedProductListResponse {
  data: UnifiedProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
