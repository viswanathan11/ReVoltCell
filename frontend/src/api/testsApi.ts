import { apiClient } from './client';
import { TestSession, TestMeasurement } from '../types/test';

export interface CreateTestPayload {
  cellId: string;
  loadResistanceOhms?: number;
  loadPowerRatingWatts?: number;
}

export const testsApi = {
  create: async (payload: CreateTestPayload) => {
    return apiClient<{ success: boolean; data: TestSession }>('/tests', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  start: async (testId: string) => {
    return apiClient<{ success: boolean; data: any }>(`/tests/${testId}/start`, {
      method: 'POST',
    });
  },

  getById: async (testId: string) => {
    return apiClient<{ success: boolean; data: TestSession }>(`/tests/${testId}`);
  },

  addMeasurement: async (testId: string, measurement: Omit<TestMeasurement, 'id' | 'testId'>) => {
    return apiClient<{ success: boolean; data: any }>(`/tests/${testId}/measurements`, {
      method: 'POST',
      body: JSON.stringify(measurement),
    });
  },

  addBatchMeasurements: async (testId: string, measurements: Array<Omit<TestMeasurement, 'id' | 'testId'>>) => {
    return apiClient<{ success: boolean; data: { testId: string; insertedCount: number } }>(
      `/tests/${testId}/measurements/batch`,
      {
        method: 'POST',
        body: JSON.stringify({ measurements }),
      }
    );
  },

  complete: async (
    testId: string,
    summary?: {
      finalVoltage?: number;
      minimumVoltage?: number;
      averageCurrent?: number;
      maximumCurrent?: number;
      initialTemperature?: number;
      maximumTemperature?: number;
      testDurationSeconds?: number;
      stopReason?: string;
    }
  ) => {
    return apiClient<{
      success: boolean;
      data: {
        testId: string;
        cellId: string;
        status: string;
        score: number;
        classification: string;
        analysis: any;
        applications: any[];
      };
    }>(`/tests/${testId}/complete`, {
      method: 'POST',
      body: JSON.stringify(summary || {}),
    });
  },

  stop: async (testId: string, stopReason = 'USER_STOP') => {
    return apiClient<{ success: boolean; data: any }>(`/tests/${testId}/stop`, {
      method: 'POST',
      body: JSON.stringify({ stopReason }),
    });
  },

  simulateMock: async (testId: string, profile: 'GOOD' | 'WEAK' | 'HOT' | 'UNSTABLE' = 'GOOD') => {
    return apiClient<{
      success: boolean;
      data: {
        testId: string;
        cellId: string;
        status: string;
        profile: string;
        score: number;
        classification: string;
        voltageSag: number;
        temperatureRise: number;
        measurementsCount: number;
        analysis: any;
        applications: any[];
      };
    }>(`/mock/tests/${testId}/simulate`, {
      method: 'POST',
      body: JSON.stringify({ profile }),
    });
  },
};
