export interface AnalysisInput {
  test: {
    testId: string;
    cellId: string;
    initialVoltage?: number | null;
    finalVoltage?: number | null;
    minimumVoltage?: number | null;
    averageCurrent?: number | null;
    maximumCurrent?: number | null;
    initialTemperature?: number | null;
    maximumTemperature?: number | null;
    temperatureRise?: number | null;
    testDurationSeconds?: number | null;
    stopReason?: string | null;
  };
  measurements: Array<{
    elapsedSeconds: number;
    voltage: number;
    current: number;
    temperature: number;
    loadEnabled: boolean;
  }>;
  cell: {
    nominalVoltage: number;
    ratedCapacityMah: number;
    chemistry: string;
  };
}

export interface AnalysisOutput {
  score: number;
  electricalScore: number;
  thermalScore: number;
  stabilityScore: number;
  classification: 'GOOD' | 'FURTHER_EVALUATION' | 'LOW_PERFORMANCE' | 'UNSUITABLE';
  voltageSag: number;
  temperatureRise: number;
  recommendation: string;
}

export class AnalysisService {
  public static calculateAnalysis(input: AnalysisInput): AnalysisOutput {
    const { test, measurements, cell } = input;

    // Derived electrical metrics from measurements if test summary fields are empty
    let initV = test.initialVoltage ?? (measurements.length > 0 ? measurements[0].voltage : cell.nominalVoltage);
    let minV = test.minimumVoltage ?? (measurements.length > 0 ? Math.min(...measurements.map((m) => m.voltage)) : initV);
    let finalV = test.finalVoltage ?? (measurements.length > 0 ? measurements[measurements.length - 1].voltage : minV);

    let initT = test.initialTemperature ?? (measurements.length > 0 ? measurements[0].temperature : 25.0);
    let maxT = test.maximumTemperature ?? (measurements.length > 0 ? Math.max(...measurements.map((m) => m.temperature)) : initT);

    const voltageSag = Math.max(0, Number((initV - minV).toFixed(3)));
    const temperatureRise = Math.max(0, Number((maxT - initT).toFixed(2)));

    // 1. Electrical Performance Score (0 - 40)
    let electricalScore = 40;
    if (voltageSag > 0.8) {
      electricalScore -= 30;
    } else if (voltageSag > 0.5) {
      electricalScore -= 20;
    } else if (voltageSag > 0.3) {
      electricalScore -= 10;
    } else if (voltageSag > 0.15) {
      electricalScore -= 4;
    }

    // Check final voltage health relative to nominal
    if (finalV < cell.nominalVoltage * 0.75) {
      electricalScore -= 8;
    } else if (finalV < cell.nominalVoltage * 0.85) {
      electricalScore -= 4;
    }
    electricalScore = Math.max(0, Math.min(40, Math.round(electricalScore)));

    // 2. Thermal Score (0 - 30)
    let thermalScore = 30;
    if (maxT > 55) {
      thermalScore -= 25;
    } else if (maxT > 45) {
      thermalScore -= 15;
    } else if (maxT > 38) {
      thermalScore -= 6;
    }

    if (temperatureRise > 15) {
      thermalScore -= 15;
    } else if (temperatureRise > 8) {
      thermalScore -= 8;
    } else if (temperatureRise > 4) {
      thermalScore -= 3;
    }
    thermalScore = Math.max(0, Math.min(30, Math.round(thermalScore)));

    // 3. Stability Score (0 - 30)
    let stabilityScore = 30;
    if (measurements.length > 3) {
      // Calculate voltage fluctuation / standard deviation of differences
      let fluctuationCount = 0;
      for (let i = 2; i < measurements.length; i++) {
        const delta1 = measurements[i].voltage - measurements[i - 1].voltage;
        const delta2 = measurements[i - 1].voltage - measurements[i - 2].voltage;
        // If voltage bounces up and down abruptly under constant load
        if ((delta1 > 0.05 && delta2 < -0.05) || (delta1 < -0.05 && delta2 > 0.05)) {
          fluctuationCount++;
        }
      }
      if (fluctuationCount > 4) {
        stabilityScore -= 20;
      } else if (fluctuationCount > 1) {
        stabilityScore -= 10;
      }
    }

    // Penalty for failure stop reasons
    if (test.stopReason === 'OVER_TEMPERATURE') {
      thermalScore = Math.min(thermalScore, 5);
      stabilityScore = Math.min(stabilityScore, 10);
    } else if (test.stopReason === 'LOW_VOLTAGE') {
      electricalScore = Math.min(electricalScore, 10);
    } else if (test.stopReason === 'ERROR') {
      electricalScore = Math.min(electricalScore, 10);
      stabilityScore = Math.min(stabilityScore, 10);
    }
    stabilityScore = Math.max(0, Math.min(30, Math.round(stabilityScore)));

    const score = Math.max(0, Math.min(100, electricalScore + thermalScore + stabilityScore));

    // Classification
    let classification: 'GOOD' | 'FURTHER_EVALUATION' | 'LOW_PERFORMANCE' | 'UNSUITABLE';
    let recommendation = '';

    if (score >= 80 && test.stopReason !== 'OVER_TEMPERATURE' && test.stopReason !== 'ERROR') {
      classification = 'GOOD';
      recommendation =
        'Cell exhibited strong discharge stability, minimal voltage sag, and low thermal rise. Good candidate for light energy storage applications.';
    } else if (score >= 65 && test.stopReason !== 'OVER_TEMPERATURE') {
      classification = 'FURTHER_EVALUATION';
      recommendation =
        'Moderate voltage stability or mild sag detected. Suitable for secondary testing or lower-drain applications such as LED lighting.';
    } else if (score >= 45 && test.stopReason !== 'OVER_TEMPERATURE') {
      classification = 'LOW_PERFORMANCE';
      recommendation =
        'Significant voltage sag or higher internal resistance observed. Restricted to low-demand intermittent electronic uses.';
    } else {
      classification = 'UNSUITABLE';
      recommendation =
        'High temperature rise, critical sag, or safety threshold reached. Not recommended for second-life reuse; route to recycling.';
    }

    return {
      score,
      electricalScore,
      thermalScore,
      stabilityScore,
      classification,
      voltageSag,
      temperatureRise,
      recommendation,
    };
  }
}
