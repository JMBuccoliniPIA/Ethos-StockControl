import { apiClient } from '@/lib/api-client';

export interface UploadResult {
  jobId: string;
  headers: string[];
  autoMapping: Record<string, string>;
  totalRows: number;
  sampleRows: Record<string, unknown>[];
}

export interface PreviewRow {
  rowNumber: number;
  data: Record<string, unknown>;
  status: 'valid' | 'error' | 'duplicate';
  errors?: string[];
}

export interface PreviewResult {
  jobId: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  duplicateRows: number;
  preview: PreviewRow[];
}

export interface ConfirmResult {
  jobId: string;
  status: string;
  productsCreated: number;
  familiesCreated: number;
  subfamiliesCreated: number;
  errors: Array<{ row: number; message: string }>;
}

export const importApi = {
  upload: async (file: File): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/import/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  preview: async (
    jobId: string,
    file: File,
    mapping: Record<string, string>,
  ): Promise<PreviewResult> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(mapping));
    const res = await apiClient.post(`/import/${jobId}/preview`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  confirm: async (jobId: string): Promise<ConfirmResult> => {
    const res = await apiClient.post(`/import/${jobId}/confirm`);
    return res.data;
  },
};
