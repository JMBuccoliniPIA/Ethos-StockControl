import { apiClient } from '@/lib/api-client';
import type {
  UnifiedProduct,
  UnifiedProductFormData,
  UnifiedProductQuery,
  UnifiedProductListResponse,
  MappingSuggestion,
  SupplierProductRef,
} from '../schemas/unified-product.schema';

export const unifiedProductsApi = {
  // ─── CRUD ───

  getAll: async (query?: UnifiedProductQuery): Promise<UnifiedProductListResponse> => {
    const res = await apiClient.get('/unified-products', { params: query });
    return res.data;
  },

  getById: async (id: string): Promise<UnifiedProduct> => {
    const res = await apiClient.get(`/unified-products/${id}`);
    return res.data;
  },

  getStats: async (): Promise<{
    totalProducts: number;
    activeProducts: number;
    withSupplier: number;
    lowStockCount: number;
    totalStockValue: number;
  }> => {
    const res = await apiClient.get('/unified-products/stats');
    return res.data;
  },

  create: async (data: UnifiedProductFormData): Promise<UnifiedProduct> => {
    const res = await apiClient.post('/unified-products', data);
    return res.data;
  },

  update: async (
    id: string,
    data: Partial<UnifiedProductFormData>,
  ): Promise<UnifiedProduct> => {
    const res = await apiClient.patch(`/unified-products/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/unified-products/${id}`);
  },

  // ─── Supplier Management ───

  getLinkedSupplierProducts: async (id: string): Promise<SupplierProductRef[]> => {
    const res = await apiClient.get(`/unified-products/${id}/supplier-products`);
    return res.data;
  },

  selectSupplier: async (
    id: string,
    supplierProductId: string,
  ): Promise<UnifiedProduct> => {
    const res = await apiClient.post(
      `/unified-products/${id}/select-supplier/${supplierProductId}`,
    );
    return res.data;
  },

  updateMargin: async (
    id: string,
    profitMarginPercent: number,
  ): Promise<UnifiedProduct> => {
    const res = await apiClient.patch(`/unified-products/${id}/margin`, {
      profitMarginPercent,
    });
    return res.data;
  },

  refreshCost: async (id: string): Promise<UnifiedProduct> => {
    const res = await apiClient.post(`/unified-products/${id}/refresh-cost`);
    return res.data;
  },

  linkSupplierProduct: async (
    id: string,
    supplierProductId: string,
  ): Promise<SupplierProductRef> => {
    const res = await apiClient.post(
      `/unified-products/${id}/link/${supplierProductId}`,
    );
    return res.data;
  },

  unlinkSupplierProduct: async (
    id: string,
    supplierProductId: string,
  ): Promise<void> => {
    await apiClient.delete(`/unified-products/${id}/unlink/${supplierProductId}`);
  },

  // ─── Mapping ───

  getSuggestions: async (
    supplierId?: string,
    limit = 50,
  ): Promise<MappingSuggestion[]> => {
    const res = await apiClient.get('/unified-products/mapping/suggestions', {
      params: { supplierId, limit },
    });
    return res.data;
  },

  getSuggestionsForProduct: async (
    supplierProductId: string,
  ): Promise<MappingSuggestion['suggestions']> => {
    const res = await apiClient.get(
      `/unified-products/mapping/suggestions/${supplierProductId}`,
    );
    return res.data;
  },

  autoMapByExactSku: async (
    supplierId?: string,
  ): Promise<{ mapped: number; skipped: number }> => {
    const res = await apiClient.post('/unified-products/mapping/auto-map', null, {
      params: { supplierId },
    });
    return res.data;
  },

  createFromUnmapped: async (
    supplierProductIds: string[],
    defaultMargin = 30,
  ): Promise<UnifiedProduct[]> => {
    const res = await apiClient.post('/unified-products/mapping/create-from-unmapped', {
      supplierProductIds,
      defaultMargin,
    });
    return res.data;
  },
};
