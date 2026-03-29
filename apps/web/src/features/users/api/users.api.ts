import { apiClient } from '@/lib/api-client';
import type { User, PaginatedResponse } from '@ethos/shared';
import type { CreateUserFormData, UpdateUserFormData } from '../schemas/user.schema';

export const usersApi = {
  getAll: async (page = 1, limit = 20): Promise<PaginatedResponse<User>> => {
    const res = await apiClient.get('/users', { params: { page, limit } });
    return res.data;
  },

  getById: async (id: string): Promise<User> => {
    const res = await apiClient.get(`/users/${id}`);
    return res.data;
  },

  create: async (data: CreateUserFormData): Promise<User> => {
    const res = await apiClient.post('/users', data);
    return res.data;
  },

  update: async (id: string, data: UpdateUserFormData): Promise<User> => {
    // Remove empty password before sending
    const payload = { ...data };
    if (!payload.password) delete payload.password;
    const res = await apiClient.patch(`/users/${id}`, payload);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },
};
