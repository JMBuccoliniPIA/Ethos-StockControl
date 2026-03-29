'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { familiesApi, subfamiliesApi } from './families.api';
import { notify } from '@/lib/toast';
import type { FamilyFormData, SubfamilyFormData } from '../schemas/family.schema';

// ─── Families ───

export function useFamilies() {
  return useQuery({
    queryKey: ['families'],
    queryFn: familiesApi.getAll,
  });
}

export function useCreateFamily() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: FamilyFormData) => familiesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['families'] });
      notify.success('Familia creada');
    },
  });
}

export function useUpdateFamily() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: FamilyFormData }) =>
      familiesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['families'] });
      notify.success('Familia actualizada');
    },
  });
}

export function useDeleteFamily() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => familiesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['families'] });
      notify.success('Familia eliminada');
    },
  });
}

// ─── Subfamilies ───

export function useSubfamilies(familyId?: string) {
  return useQuery({
    queryKey: ['subfamilies', familyId],
    queryFn: () =>
      familyId ? subfamiliesApi.getByFamily(familyId) : subfamiliesApi.getAll(),
    enabled: !!familyId,
  });
}

export function useSubfamilyTree(familyId?: string) {
  return useQuery({
    queryKey: ['subfamilies', 'tree', familyId],
    queryFn: () => subfamiliesApi.getTree(familyId!),
    enabled: !!familyId,
  });
}

export function useAllSubfamilies() {
  return useQuery({
    queryKey: ['subfamilies', 'all'],
    queryFn: subfamiliesApi.getAll,
  });
}

export function useCreateSubfamily() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SubfamilyFormData) => subfamiliesApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subfamilies'] }),
  });
}

export function useUpdateSubfamily() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SubfamilyFormData> }) =>
      subfamiliesApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subfamilies'] }),
  });
}

export function useDeleteSubfamily() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => subfamiliesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subfamilies'] }),
  });
}
