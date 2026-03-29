'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi } from './users.api';
import { notify } from '@/lib/toast';
import type { CreateUserFormData, UpdateUserFormData } from '../schemas/user.schema';

const USERS_KEY = ['users'];

export function useUsers(page = 1, limit = 20) {
  return useQuery({
    queryKey: [...USERS_KEY, page, limit],
    queryFn: () => usersApi.getAll(page, limit),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserFormData) => usersApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USERS_KEY });
      notify.success('Usuario creado exitosamente');
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserFormData }) =>
      usersApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USERS_KEY });
      notify.success('Usuario actualizado');
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USERS_KEY });
      notify.success('Usuario eliminado');
    },
  });
}
