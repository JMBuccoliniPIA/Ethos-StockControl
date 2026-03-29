import { apiClient } from '@/lib/api-client';
import type { Product, PaginatedResponse } from '@ethos/shared';
import type { CreateProductFormData, UpdateProductFormData } from '../schemas/product.schema';

export interface ProductQuery {
  page?: number;
  limit?: number;
  search?: string;
  familyId?: string;
  subfamilyId?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const productsApi = {
  getAll: async (query: ProductQuery = {}): Promise<PaginatedResponse<Product>> => {
    const res = await apiClient.get('/products', { params: query });
    return res.data;
  },

  getById: async (id: string): Promise<Product> => {
    const res = await apiClient.get(`/products/${id}`);
    return res.data;
  },

  create: async (data: CreateProductFormData): Promise<Product> => {
    const res = await apiClient.post('/products', data);
    return res.data;
  },

  update: async (id: string, data: UpdateProductFormData): Promise<Product> => {
    const res = await apiClient.patch(`/products/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/products/${id}`);
  },

  getLowStock: async (): Promise<Product[]> => {
    const res = await apiClient.get('/products/low-stock');
    return res.data;
  },
};
