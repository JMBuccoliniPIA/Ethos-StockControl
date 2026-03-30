'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  mappingSettingsApi,
  type UpdateMappingSettingsDto,
} from './mapping-settings.api';
import { notify } from '@/lib/toast';

export function useMappingSettings() {
  return useQuery({
    queryKey: ['mapping-settings'],
    queryFn: mappingSettingsApi.getSettings,
  });
}

export function useUpdateMappingSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateMappingSettingsDto) =>
      mappingSettingsApi.updateSettings(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mapping-settings'] });
      notify.success('Configuración actualizada');
    },
    onError: (error: any) => {
      notify.error(error.response?.data?.message || 'Error al actualizar');
    },
  });
}
