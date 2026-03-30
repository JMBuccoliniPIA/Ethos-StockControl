import { apiClient } from '@/lib/api-client';

export interface MappingSettings {
  _id: string;
  key: string;
  autoMapOnImport: boolean;
  autoMapStrategy: 'exact_sku' | 'similar_name' | 'disabled';
  defaultProfitMargin: number;
  minMatchScore: number;
  createUnifiedIfNoMatch: boolean;
  updatedAt: string;
}

export interface UpdateMappingSettingsDto {
  autoMapOnImport?: boolean;
  autoMapStrategy?: 'exact_sku' | 'similar_name' | 'disabled';
  defaultProfitMargin?: number;
  minMatchScore?: number;
  createUnifiedIfNoMatch?: boolean;
}

export const mappingSettingsApi = {
  getSettings: async (): Promise<MappingSettings> => {
    const res = await apiClient.get('/mapping-settings');
    return res.data;
  },

  updateSettings: async (data: UpdateMappingSettingsDto): Promise<MappingSettings> => {
    const res = await apiClient.patch('/mapping-settings', data);
    return res.data;
  },
};
