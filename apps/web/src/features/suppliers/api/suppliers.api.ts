import { apiClient } from '@/lib/api-client';
import type { Supplier, SupplierFormData } from '../schemas/supplier.schema';

export const suppliersApi = {
  getAll: async (): Promise<Supplier[]> => {
    const res = await apiClient.get('/suppliers');
    return res.data;
  },

  getActive: async (): Promise<Supplier[]> => {
    const res = await apiClient.get('/suppliers/active');
    return res.data;
  },

  getById: async (id: string): Promise<Supplier> => {
    const res = await apiClient.get(`/suppliers/${id}`);
    return res.data;
  },

  create: async (data: SupplierFormData): Promise<Supplier> => {
    const res = await apiClient.post('/suppliers', data);
    return res.data;
  },

  update: async (id: string, data: Partial<SupplierFormData>): Promise<Supplier> => {
    const res = await apiClient.patch(`/suppliers/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/suppliers/${id}`);
  },
};
