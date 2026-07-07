'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { supplierProductsApi, type SupplierProductsQuery } from './supplier-products.api';

export function useSupplierProducts(query: SupplierProductsQuery = {}) {
  return useQuery({
    queryKey: ['supplier-products', query],
    queryFn: () => supplierProductsApi.getAll(query),
    placeholderData: keepPreviousData,
  });
}
