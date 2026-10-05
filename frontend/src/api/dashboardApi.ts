import { apiClient } from './client';

export interface DashboardSummary {
  totalCells: number;
  testedCells: number;
  testingCells: number;
  registeredCells: number;
  archivedCells: number;
  goodCells: number;
  furtherEvaluation: number;
  lowPerformance: number;
  unsuitable: number;
  totalTests: number;
  activeTests: number;
}

export interface RecentTestItem {
  testId: string;
  cellId: string;
  status: string;
  createdAt: string;
  completedAt?: string | null;
  initialVoltage?: number | null;
  finalVoltage?: number | null;
  temperatureRise?: number | null;
  durationSeconds?: number | null;
  score?: number | null;
  classification?: string | null;
  cellModel?: string;
  cellChemistry?: string;
}

export interface ScoreDistributionItem {
  range: string;
  count: number;
  classification: string;
}

export const dashboardApi = {
  getSummary: async () => {
    return apiClient<{ success: boolean; data: DashboardSummary }>('/dashboard/summary');
  },

  getRecentTests: async (limit = 10) => {
    return apiClient<{ success: boolean; data: RecentTestItem[] }>(`/dashboard/recent-tests?limit=${limit}`);
  },

  getScoreDistribution: async () => {
    return apiClient<{
      success: boolean;
      data: {
        distribution: ScoreDistributionItem[];
        totalAnalyses: number;
      };
    }>('/dashboard/score-distribution');
  },
};
