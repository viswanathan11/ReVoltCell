export interface TestMeasurement {
  id?: string;
  testId?: string;
  timestamp?: string;
  elapsedSeconds: number;
  voltage: number;
  current: number;
  temperature: number;
  loadEnabled: boolean;
}

export interface TestSession {
  id: string;
  testId: string;
  cellId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'STOPPED' | 'FAILED';
  startedAt?: string | null;
  completedAt?: string | null;
  initialVoltage?: number | null;
  finalVoltage?: number | null;
  minimumVoltage?: number | null;
  averageCurrent?: number | null;
  maximumCurrent?: number | null;
  initialTemperature?: number | null;
  maximumTemperature?: number | null;
  temperatureRise?: number | null;
  testDurationSeconds?: number | null;
  loadResistanceOhms?: number | null;
  loadPowerRatingWatts?: number | null;
  stopReason?: string | null;
  createdAt: string;
  measurements?: TestMeasurement[];
  analysis?: any;
  cell?: any;
}
