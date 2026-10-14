export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmCompletionRequest {
  messages: LlmMessage[];
  maxTokens?: number;
  temperature?: number;
}

export interface LlmCompletionResponse {
  content: string;
  tokensUsed?: number;
  modelUsed: string;
}

export interface ILlmAdapter {
  complete(request: LlmCompletionRequest): Promise<LlmCompletionResponse>;
}

export type ChatMode = 'dashboard' | 'passport';

export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequestBody {
  message: string;
  conversationId?: string;
  mode?: ChatMode;
  history?: ChatHistoryMessage[];
}

export interface CanonicalMeasurementField {
  label: string;
  value: string | number | null;
  unit?: string;
  status: 'MEASURED' | 'SIMULATED' | 'DERIVED' | 'NOT_MEASURED';
  note?: string;
}

export interface CanonicalReportContext {
  reportId: string;
  cellId: string;
  mode: ChatMode;
  cellSpecs: {
    manufacturer: string;
    model: string;
    chemistry: string;
    formFactor: string;
    nominalVoltage: number;
    ratedCapacityMah: number;
    provenance: string;
  };
  dischargeTest: {
    status: string;
    durationSeconds: number | null;
    stopReason: string | null;
    loadResistanceOhms: number | null;
    loadPowerRatingWatts: number | null;
    measurements: CanonicalMeasurementField[];
  };
  screeningOutcome: {
    prototypeScore: number | null;
    classification: string | null;
    electricalScore: number | null;
    thermalScore: number | null;
    stabilityScore: number | null;
    voltageSag: number | null;
    temperatureRise: number | null;
    officialRecommendation: string | null;
  };
  applicationRecommendations: Array<{
    application: string;
    suitability: string;
    reason: string;
  }>;
  lifecycleHistoryCount?: number;
  publicPassportUrl: string;
  disclaimer: string;
}

export interface ChatResponseBody {
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
