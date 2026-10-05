import { apiClient } from './client';
import { BatteryPassportData } from '../types/analysis';

export const passportApi = {
  getByCellId: async (cellId: string) => {
    return apiClient<{ success: boolean; data: BatteryPassportData }>(`/cells/${cellId}/passport`);
  },
};
