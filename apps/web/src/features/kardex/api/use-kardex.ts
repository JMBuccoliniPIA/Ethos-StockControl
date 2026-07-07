'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { kardexApi, type KardexQuery } from './kardex.api';
import { notify } from '@/lib/toast';
import type { CreateKardexEntryFormData } from '../schemas/kardex.schema';
import type { ProductEntityType } from '@ethos/shared';

const KARDEX_KEY = ['kardex'];

export function useKardexEntries(query: KardexQuery | null) {
  return useQuery({
    queryKey: [...KARDEX_KEY, 'entries', query],
    queryFn: () => kardexApi.getEntries(query!),
    enabled: !!query?.productId,
    placeholderData: keepPreviousData,
  });
}

export function useKardexSummary(productId: string | null, productType: ProductEntityType | null) {
  return useQuery({
    queryKey: [...KARDEX_KEY, 'summary', productId, productType],
    queryFn: () => kardexApi.getSummary(productId!, productType!),
    enabled: !!productId && !!productType,
  });
}

export function useKardexLots(productId: string | null, productType: ProductEntityType | null) {
  return useQuery({
    queryKey: [...KARDEX_KEY, 'lots', productId, productType],
    queryFn: () => kardexApi.getLots(productId!, productType!),
    enabled: !!productId && !!productType,
  });
}

export function useCreateKardexEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateKardexEntryFormData) => kardexApi.createEntry(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KARDEX_KEY });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['unified-products'] });
      notify.success('Movimiento registrado en el Kardex');
    },
  });
}
