'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { suppliersApi } from './suppliers.api';
import { notify } from '@/lib/toast';
import type { SupplierFormData } from '../schemas/supplier.schema';

export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: suppliersApi.getAll,
  });
}

export function useActiveSuppliers() {
  return useQuery({
    queryKey: ['suppliers', 'active'],
    queryFn: suppliersApi.getActive,
  });
}

export function useSupplier(id?: string) {
  return useQuery({
    queryKey: ['suppliers', id],
    queryFn: () => suppliersApi.getById(id!),
    enabled: !!id,
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SupplierFormData) => suppliersApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      notify.success('Proveedor creado');
    },
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SupplierFormData> }) =>
      suppliersApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      notify.success('Proveedor actualizado');
    },
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => suppliersApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      notify.success('Proveedor eliminado');
    },
  });
}
