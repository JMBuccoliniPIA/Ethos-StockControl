'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unifiedProductsApi } from './unified-products.api';
import { notify } from '@/lib/toast';
import type {
  UnifiedProductFormData,
  UnifiedProductQuery,
} from '../schemas/unified-product.schema';

// ─── Queries ───

export function useUnifiedProducts(query?: UnifiedProductQuery) {
  return useQuery({
    queryKey: ['unified-products', query],
    queryFn: () => unifiedProductsApi.getAll(query),
  });
}

export function useUnifiedProduct(id?: string) {
  return useQuery({
    queryKey: ['unified-products', id],
    queryFn: () => unifiedProductsApi.getById(id!),
    enabled: !!id,
  });
}

export function useUnifiedProductStats() {
  return useQuery({
    queryKey: ['unified-products', 'stats'],
    queryFn: unifiedProductsApi.getStats,
  });
}

export function useLinkedSupplierProducts(id?: string) {
  return useQuery({
    queryKey: ['unified-products', id, 'supplier-products'],
    queryFn: () => unifiedProductsApi.getLinkedSupplierProducts(id!),
    enabled: !!id,
  });
}

export function useMappingSuggestions(supplierId?: string, limit = 50) {
  return useQuery({
    queryKey: ['unified-products', 'mapping-suggestions', supplierId, limit],
    queryFn: () => unifiedProductsApi.getSuggestions(supplierId, limit),
  });
}

export function useSuggestionsForProduct(supplierProductId?: string) {
  return useQuery({
    queryKey: ['unified-products', 'suggestions', supplierProductId],
    queryFn: () => unifiedProductsApi.getSuggestionsForProduct(supplierProductId!),
    enabled: !!supplierProductId,
  });
}

// ─── Mutations ───

export function useCreateUnifiedProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UnifiedProductFormData) => unifiedProductsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unified-products'] });
      notify.success('Producto unificado creado');
    },
    onError: (error: any) => {
      notify.error(error.response?.data?.message || 'Error al crear producto');
    },
  });
}

export function useUpdateUnifiedProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<UnifiedProductFormData> }) =>
      unifiedProductsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unified-products'] });
      notify.success('Producto actualizado');
    },
    onError: (error: any) => {
      notify.error(error.response?.data?.message || 'Error al actualizar');
    },
  });
}

export function useDeleteUnifiedProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unifiedProductsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unified-products'] });
      notify.success('Producto eliminado');
    },
    onError: (error: any) => {
      notify.error(error.response?.data?.message || 'Error al eliminar');
    },
  });
}

export function useSelectSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, supplierProductId }: { id: string; supplierProductId: string }) =>
      unifiedProductsApi.selectSupplier(id, supplierProductId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unified-products'] });
      notify.success('Proveedor seleccionado');
    },
    onError: (error: any) => {
      notify.error(error.response?.data?.message || 'Error al seleccionar proveedor');
    },
  });
}

export function useUpdateMargin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, margin }: { id: string; margin: number }) =>
      unifiedProductsApi.updateMargin(id, margin),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unified-products'] });
      notify.success('Margen actualizado');
    },
    onError: (error: any) => {
      notify.error(error.response?.data?.message || 'Error al actualizar margen');
    },
  });
}

export function useLinkSupplierProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, supplierProductId }: { id: string; supplierProductId: string }) =>
      unifiedProductsApi.linkSupplierProduct(id, supplierProductId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unified-products'] });
      qc.invalidateQueries({ queryKey: ['supplier-products'] });
      notify.success('Producto vinculado');
    },
    onError: (error: any) => {
      notify.error(error.response?.data?.message || 'Error al vincular');
    },
  });
}

export function useUnlinkSupplierProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, supplierProductId }: { id: string; supplierProductId: string }) =>
      unifiedProductsApi.unlinkSupplierProduct(id, supplierProductId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unified-products'] });
      qc.invalidateQueries({ queryKey: ['supplier-products'] });
      notify.success('Producto desvinculado');
    },
    onError: (error: any) => {
      notify.error(error.response?.data?.message || 'Error al desvincular');
    },
  });
}

export function useAutoMapByExactSku() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (supplierId?: string) => unifiedProductsApi.autoMapByExactSku(supplierId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['unified-products'] });
      qc.invalidateQueries({ queryKey: ['supplier-products'] });
      notify.success(`${data.mapped} productos mapeados automáticamente`);
    },
    onError: (error: any) => {
      notify.error(error.response?.data?.message || 'Error en auto-mapeo');
    },
  });
}

export function useCreateFromUnmapped() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      supplierProductIds,
      defaultMargin,
    }: {
      supplierProductIds: string[];
      defaultMargin?: number;
    }) => unifiedProductsApi.createFromUnmapped(supplierProductIds, defaultMargin),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['unified-products'] });
      qc.invalidateQueries({ queryKey: ['supplier-products'] });
      notify.success(`${data.length} productos unificados creados`);
    },
    onError: (error: any) => {
      notify.error(error.response?.data?.message || 'Error al crear productos');
    },
  });
}
