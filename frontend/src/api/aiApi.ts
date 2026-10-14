import { apiClient } from './client';
import { ChatResponseData, SendMessageParams } from '../types/ai';

export const aiApi = {
  chatAboutTest: async (params: SendMessageParams): Promise<{ success: boolean; data: ChatResponseData }> => {
    const { testId, message, conversationId, mode = 'dashboard', history } = params;
    return apiClient<{ success: boolean; data: ChatResponseData }>(`/ai/tests/${encodeURIComponent(testId)}/chat`, {
      method: 'POST',
      body: JSON.stringify({
        message,
        conversationId,
        mode,
        history,
      }),
    });
  },

  chatAboutPassport: async (cellId: string, message: string, conversationId?: string, history?: any[]): Promise<{ success: boolean; data: ChatResponseData }> => {
    return apiClient<{ success: boolean; data: ChatResponseData }>(`/ai/passport/${encodeURIComponent(cellId)}/chat`, {
      method: 'POST',
      body: JSON.stringify({
        message,
        conversationId,
        mode: 'passport',
        history,
      }),
    });
  },
};
