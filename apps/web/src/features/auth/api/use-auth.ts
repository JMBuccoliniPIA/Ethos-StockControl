'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from './auth.api';
import type { LoginFormData } from '../schemas/auth.schema';

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginFormData) => authApi.login(data),
    onSuccess: (data) => {
      localStorage.setItem('accessToken', data.accessToken);
      queryClient.setQueryData(['auth', 'user'], data.user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      localStorage.removeItem('accessToken');
      queryClient.setQueryData(['auth', 'user'], null);
      queryClient.clear();
    },
  });
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ['auth', 'user'],
    queryFn: authApi.getProfile,
    retry: false,
    enabled: typeof window !== 'undefined' && !!localStorage.getItem('accessToken'),
  });
}
