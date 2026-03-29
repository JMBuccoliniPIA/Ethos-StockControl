import { apiClient } from '@/lib/api-client';
import type { LoginFormData, RegisterFormData } from '../schemas/auth.schema';
import type { LoginResponse, User } from '@ethos/shared';

export const authApi = {
  login: async (data: LoginFormData): Promise<LoginResponse> => {
    const res = await apiClient.post('/auth/login', data);
    return res.data;
  },

  register: async (data: RegisterFormData): Promise<{ message: string }> => {
    const res = await apiClient.post('/auth/register', data);
    return res.data;
  },

  refresh: async (): Promise<{ accessToken: string }> => {
    const res = await apiClient.post('/auth/refresh');
    return res.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  getProfile: async (): Promise<User> => {
    const res = await apiClient.get('/users/me');
    return res.data;
  },
};
