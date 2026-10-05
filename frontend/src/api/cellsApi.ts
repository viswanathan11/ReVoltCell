import { apiClient } from './client';
import { Cell, CellListResponse, CellDetailsResponse } from '../types/cell';

export interface CreateCellPayload {
  cellId: string;
  manufacturer?: string;
  model?: string;
  chemistry?: string;
  nominalVoltage: number;
  ratedCapacityMah: number;
  source?: string;
  manufactureDate?: string;
}

export const cellsApi = {
  list: async (params?: { page?: number; limit?: number; status?: string; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiClient<CellListResponse>(`/cells${query}`);
  },

  getById: async (cellId: string) => {
    return apiClient<CellDetailsResponse>(`/cells/${cellId}`);
  },

  create: async (payload: CreateCellPayload) => {
    return apiClient<{ success: boolean; data: Cell }>('/cells', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update: async (cellId: string, payload: Partial<CreateCellPayload & { status: string }>) => {
    return apiClient<{ success: boolean; data: Cell }>(`/cells/${cellId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  archive: async (cellId: string) => {
    return apiClient<{ success: boolean; data: any }>(`/cells/${cellId}`, {
      method: 'DELETE',
    });
  },

  getTests: async (cellId: string, page = 1, limit = 20) => {
    return apiClient<{
      success: boolean;
      data: any[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/cells/${cellId}/tests?page=${page}&limit=${limit}`);
  },

  getApplications: async (cellId: string) => {
    return apiClient<{
      success: boolean;
      data: {
        cellId: string;
        primary: any;
        alternatives: any[];
        allRecommendations: any[];
      };
    }>(`/cells/${cellId}/applications`);
  },

  getMatches: async (cellId: string, limit = 5) => {
    return apiClient<{
      success: boolean;
      data: {
        cellId: string;
        score: number;
        classification: string;
        chemistry: string;
        nominalVoltage: number;
        voltageSag: number;
        temperatureRise: number;
        matches: any[];
        disclaimer: string;
      };
    }>(`/cells/${cellId}/matches?limit=${limit}`);
  },

  getLifecycle: async (cellId: string) => {
    return apiClient<{
      success: boolean;
      data: Array<{
        id: string;
        cellId: string;
        event: string;
        timestamp: string;
        description: string;
      }>;
    }>(`/cells/${cellId}/lifecycle`);
  },

  addLifecycleEvent: async (cellId: string, event: string, description: string) => {
    return apiClient<{ success: boolean; data: any }>(`/cells/${cellId}/lifecycle`, {
      method: 'POST',
      body: JSON.stringify({ event, description }),
    });
  },
};
