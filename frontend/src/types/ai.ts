export type ChatMode = 'dashboard' | 'passport';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  evidenceUsed?: string[];
  missingInformation?: string[];
  suggestedNextSteps?: string[];
  isError?: boolean;
}

export interface ChatResponseData {
  testId: string;
  cellId: string;
  mode: ChatMode;
  conversationId: string;
  answer: string;
  evidenceUsed: string[];
  missingInformation: string[];
  suggestedQuestions: string[];
  disclaimer: string;
}

export interface ChatHistoryPayload {
  role: 'user' | 'assistant';
  content: string;
}

export interface SendMessageParams {
  testId: string;
  message: string;
  conversationId?: string;
  mode?: ChatMode;
  history?: ChatHistoryPayload[];
}
