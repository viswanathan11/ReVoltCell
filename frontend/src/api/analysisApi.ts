import { apiClient } from './client';
import { Analysis } from '../types/analysis';

export const analysisApi = {
  getByCellId: async (cellId: string) => {
    return apiClient<{ success: boolean; data: Analysis }>(`/cells/${cellId}/analysis`);
  },

  getByTestId: async (testId: string) => {
    return apiClient<{ success: boolean; data: Analysis }>(`/tests/${testId}/analysis`);
  },

  generateForTest: async (testId: string) => {
    return apiClient<{ success: boolean; data: { analysis: Analysis; applications: any[] } }>(
      `/analysis/${testId}/generate`,
      { method: 'POST' }
    );
  },
};
