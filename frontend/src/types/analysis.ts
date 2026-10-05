export interface Analysis {
  id: string;
  testId: string;
  cellId: string;
  score: number;
  electricalScore: number;
  thermalScore: number;
  stabilityScore: number;
  classification: 'GOOD' | 'FURTHER_EVALUATION' | 'LOW_PERFORMANCE' | 'UNSUITABLE';
  voltageSag: number;
  temperatureRise: number;
  recommendation: string;
  createdAt: string;
  test?: any;
  cell?: any;
}

export interface ApplicationRecommendation {
  id?: string;
  application: string;
  suitability: 'HIGH' | 'MEDIUM' | 'LOW' | 'NOT_RECOMMENDED';
  reason: string;
}

export interface CellMatch {
  cellId: string;
  score: number;
  scoreDifference: number;
  classification: string;
  chemistry: string;
  nominalVoltage: number;
  voltageSag: number;
  temperatureRise: number;
}

export interface LifecycleEvent {
  id: string;
  cellId: string;
  event: string;
  timestamp: string;
  description: string;
}

export interface BatteryPassportData {
  batteryId: string;
  cell: {
    id: string;
    cellId: string;
    manufacturer: string;
    model: string;
    chemistry: string;
    nominalVoltage: number;
    ratedCapacityMah: number;
    source: string;
    manufactureDate?: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  latestTest?: any;
  latestMeasurements: any[];
  latestAnalysis?: Analysis | null;
  prototypeScore?: number | null;
  classification: string;
  potentialApplications: ApplicationRecommendation[];
  matches: CellMatch[];
  lifecycle: LifecycleEvent[];
  testHistory: any[];
  passportUrl: string;
  createdDate: string;
  updatedDate: string;
  disclaimer: string;
}
