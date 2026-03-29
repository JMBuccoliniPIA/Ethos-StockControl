import { apiClient } from '@/lib/api-client';
import type { StockMovement, PaginatedResponse } from '@ethos/shared';
import type { MovementType } from '@ethos/shared';

export interface CreateMovementData {
  productId: string;
  type: MovementType;
  quantity: number;
  reason: string;
}

export interface MovementResult {
  movement: StockMovement;
  previousStock: number;
  newStock: number;
}

export const stockApi = {
  createMovement: async (data: CreateMovementData): Promise<MovementResult> => {
    const res = await apiClient.post('/stock/movement', data);
    return res.data;
  },

  getMovements: async (params: {
    productId?: string;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<StockMovement>> => {
    const res = await apiClient.get('/stock/movements', { params });
    return res.data;
  },

  getProductMovements: async (
    productId: string,
    limit = 50,
  ): Promise<StockMovement[]> => {
    const res = await apiClient.get(`/stock/movements/${productId}`, {
      params: { limit },
    });
    return res.data;
  },
};
