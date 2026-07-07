'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productsApi, type ProductQuery } from './products.api';
import { notify } from '@/lib/toast';
import type { CreateProductFormData, UpdateProductFormData } from '../schemas/product.schema';

const PRODUCTS_KEY = ['products'];

export function useProducts(query: ProductQuery = {}) {
  return useQuery({
    queryKey: [...PRODUCTS_KEY, query],
    queryFn: () => productsApi.getAll(query),
    placeholderData: keepPreviousData,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: [...PRODUCTS_KEY, id],
    queryFn: () => productsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProductFormData) => productsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PRODUCTS_KEY });
      notify.success('Producto creado exitosamente');
    },
    onError: (err: any) => notify.error(err.response?.data?.message || 'Error al crear producto'),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductFormData }) =>
      productsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PRODUCTS_KEY });
      notify.success('Producto actualizado');
    },
    onError: (err: any) => notify.error(err.response?.data?.message || 'Error al actualizar producto'),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PRODUCTS_KEY });
      notify.success('Producto eliminado');
    },
    onError: (err: any) => notify.error(err.response?.data?.message || 'Error al eliminar producto'),
  });
}

export function useLowStockProducts() {
  return useQuery({
    queryKey: [...PRODUCTS_KEY, 'low-stock'],
    queryFn: productsApi.getLowStock,
  });
}
