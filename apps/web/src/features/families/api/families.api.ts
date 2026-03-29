import { apiClient } from '@/lib/api-client';
import type { Family, Subfamily, SubfamilyTree } from '@ethos/shared';
import type { FamilyFormData, SubfamilyFormData } from '../schemas/family.schema';

export const familiesApi = {
  getAll: async (): Promise<Family[]> => {
    const res = await apiClient.get('/families');
    return res.data;
  },

  create: async (data: FamilyFormData): Promise<Family> => {
    const res = await apiClient.post('/families', data);
    return res.data;
  },

  update: async (id: string, data: FamilyFormData): Promise<Family> => {
    const res = await apiClient.patch(`/families/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/families/${id}`);
  },
};

export const subfamiliesApi = {
  getByFamily: async (familyId: string): Promise<Subfamily[]> => {
    const res = await apiClient.get('/subfamilies', { params: { familyId } });
    return res.data;
  },

  getTree: async (familyId: string): Promise<SubfamilyTree[]> => {
    const res = await apiClient.get(`/subfamilies/tree/${familyId}`);
    return res.data;
  },

  getAll: async (): Promise<Subfamily[]> => {
    const res = await apiClient.get('/subfamilies');
    return res.data;
  },

  create: async (data: SubfamilyFormData): Promise<Subfamily> => {
    const res = await apiClient.post('/subfamilies', data);
    return res.data;
  },

  update: async (id: string, data: Partial<SubfamilyFormData>): Promise<Subfamily> => {
    const res = await apiClient.patch(`/subfamilies/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/subfamilies/${id}`);
  },
};
