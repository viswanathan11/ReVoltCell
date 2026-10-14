import { ENV } from '../../config/env';
import { CanonicalReportContext, CanonicalMeasurementField, ChatMode } from './types';

export class ReportContextBuilder {
  /**
   * Builds a structured canonical context projection for VoltIQ from the database record.
   * Ensures that measured, simulated, derived, and missing fields are explicitly delineated.
   */
  public static buildContext(data: {
    test: any;
    cell: any;
    analysis: any;
    applications: any[];
    mode: ChatMode;
  }): CanonicalReportContext {
    const { test, cell, analysis, applications, mode } = data;

    const measurements: CanonicalMeasurementField[] = [
      {
        label: 'Initial Voltage',
        value: test.initialVoltage !== null && test.initialVoltage !== undefined ? `${test.initialVoltage}` : null,
        unit: 'V',
        status: 'MEASURED',
        note: 'Open-circuit / starting terminal voltage measured at start of discharge',
      },
      {
        label: 'Final Voltage',
        value: test.finalVoltage !== null && test.finalVoltage !== undefined ? `${test.finalVoltage}` : null,
        unit: 'V',
        status: 'MEASURED',
        note: 'Terminal voltage recorded at test conclusion',
      },
      {
        label: 'Minimum Voltage',
        value: test.minimumVoltage !== null && test.minimumVoltage !== undefined ? `${test.minimumVoltage}` : null,
        unit: 'V',
        status: 'MEASURED',
        note: 'Lowest voltage dip under load',
      },
      {
        label: 'Initial Temperature',
        value: test.initialTemperature !== null && test.initialTemperature !== undefined ? `${test.initialTemperature}` : null,
        unit: '°C',
        status: 'MEASURED',
        note: 'Ambient / starting cell skin temperature',
      },
      {
        label: 'Maximum Temperature',
        value: test.maximumTemperature !== null && test.maximumTemperature !== undefined ? `${test.maximumTemperature}` : null,
        unit: '°C',
        status: 'MEASURED',
        note: 'Peak temperature reached during discharge session',
      },
      {
        label: 'Temperature Rise',
        value: test.temperatureRise !== null && test.temperatureRise !== undefined ? `${test.temperatureRise}` : null,
        unit: '°C',
        status: 'DERIVED',
        note: 'Derived delta (Max Temp - Initial Temp)',
      },
      {
        label: 'Discharge Current',
        value: test.averageCurrent !== null && test.averageCurrent !== undefined ? `${test.averageCurrent}` : null,
        unit: 'A',
        status: 'SIMULATED',
        note: 'Simulated / derived from nominal 5.0Ω resistive load resistor using Ohm law (not active closed-loop load)',
      },
      {
        label: 'Dynamic Discharge Capacity (Ah / mAh)',
        value: null,
        unit: 'mAh',
        status: 'NOT_MEASURED',
        note: 'NOT MEASURED. ReVoltCell performs rapid voltage/thermal triage; full 1C ampere-hour discharge capacity is not measured.',
      },
      {
        label: 'AC Internal Resistance / Impedance',
        value: null,
        unit: 'mΩ',
        status: 'NOT_MEASURED',
        note: 'NOT MEASURED. No AC milliohm impedance or 1kHz spectroscopy measurement recorded.',
      },
      {
        label: 'Certified State of Health (SOH)',
        value: null,
        unit: '%',
        status: 'NOT_MEASURED',
        note: 'NOT CERTIFIED. ReVoltCell score is an experimental triage prototype score (0-100), not an official certified SOH rating.',
      },
    ];

    // Sample evenly spaced checkpoints from the ESP32 measurements curve if available
    let timeseriesSample: any[] | undefined = undefined;
    if (Array.isArray(test.measurements) && test.measurements.length > 0) {
      const total = test.measurements.length;
      const sampleIndices = [0, Math.floor(total * 0.25), Math.floor(total * 0.5), Math.floor(total * 0.75), total - 1];
      const uniqueIndices = Array.from(new Set(sampleIndices)).filter((i) => i >= 0 && i < total);
      timeseriesSample = uniqueIndices.map((idx) => {
        const m = test.measurements[idx];
        return {
          elapsedSeconds: m.elapsedSeconds,
          voltage: m.voltage,
          temperature: m.temperature,
          current: m.current,
        };
      });
    }

    return {
      reportId: test.testId,
      cellId: cell.cellId,
      mode,
      cellSpecs: {
        manufacturer: cell.manufacturer,
        model: cell.model,
        chemistry: cell.chemistry,
        formFactor: cell.cellType || '18650',
        nominalVoltage: cell.nominalVoltage,
        ratedCapacityMah: cell.ratedCapacityMah,
        provenance: cell.source,
      },
      dischargeTest: {
        status: test.status,
        durationSeconds: test.testDurationSeconds ?? null,
        stopReason: test.stopReason ?? null,
        loadResistanceOhms: test.loadResistanceOhms ?? 5.0,
        loadPowerRatingWatts: test.loadPowerRatingWatts ?? 10.0,
        measurements,
        timeseriesSample,
      },
      screeningOutcome: {
        prototypeScore: analysis?.score ?? null,
        classification: analysis?.classification ?? 'UNTESTED',
        electricalScore: analysis?.electricalScore ?? null,
        thermalScore: analysis?.thermalScore ?? null,
        stabilityScore: analysis?.stabilityScore ?? null,
        voltageSag: analysis?.voltageSag ?? null,
        temperatureRise: analysis?.temperatureRise ?? null,
        officialRecommendation: analysis?.recommendation ?? null,
      },
      applicationRecommendations: applications.map((app) => ({
        application: app.application,
        suitability: app.suitability,
        reason: app.reason,
      })),
      lifecycleHistoryCount: cell.lifecycleEvents ? cell.lifecycleEvents.length : undefined,
      publicPassportUrl: `${ENV.PASSPORT_BASE_URL}/${cell.cellId}`,
      disclaimer:
        'ReVoltCell VoltIQ provides rapid preliminary screening explanations for research and second-life repurposing triage. This is decision support only and does not replace certified testing or qualified BMS state-of-health diagnostics.',
    };
  }

  /**
   * Serializes the canonical context into an injection-resistant textual block for LLM prompts.
   */
  public static formatPromptContext(context: CanonicalReportContext): string {
    const lines: string[] = [];

    lines.push('<<<BEGIN_CANONICAL_REPORT>>>');
    lines.push(`REPORT_ID: ${context.reportId}`);
    lines.push(`CELL_ID: ${context.cellId}`);
    lines.push(`MODE: ${context.mode.toUpperCase()}`);
    lines.push('');
    lines.push('--- CELL SPECIFICATIONS ---');
    lines.push(`Manufacturer: ${context.cellSpecs.manufacturer}`);
    lines.push(`Model: ${context.cellSpecs.model}`);
    lines.push(`Chemistry: ${context.cellSpecs.chemistry}`);
    lines.push(`Form Factor: ${context.cellSpecs.formFactor}`);
    lines.push(`Nominal Voltage: ${context.cellSpecs.nominalVoltage} V`);
    lines.push(`Manufacturer Catalog Rated Capacity: ${context.cellSpecs.ratedCapacityMah} mAh (Catalog specification only)`);
    lines.push(`Provenance: ${context.cellSpecs.provenance}`);
    lines.push('');
    lines.push('--- TEST EXECUTION & MEASUREMENTS ---');
    lines.push(`Test Status: ${context.dischargeTest.status}`);
    lines.push(`Stop Reason: ${context.dischargeTest.stopReason || 'Normal Completion'}`);
    lines.push(`Duration: ${context.dischargeTest.durationSeconds ? `${context.dischargeTest.durationSeconds} seconds` : 'Unknown'}`);
    lines.push(`Load Resistance: ${context.dischargeTest.loadResistanceOhms} Ω nominal`);
    lines.push('');
    lines.push('RECORDED PARAMETERS & SENSOR DATA:');
    for (const m of context.dischargeTest.measurements) {
      lines.push(
        `- [${m.status}] ${m.label}: ${m.value !== null ? `${m.value} ${m.unit || ''}` : 'NOT AVAILABLE'} (${m.note || ''})`
      );
    }

    if (context.dischargeTest.timeseriesSample && context.dischargeTest.timeseriesSample.length > 0) {
      lines.push('');
      lines.push('ESP32 DISCHARGE CURVE SENSOR TELEMETRY (Sampled Checkpoints across test):');
      for (const pt of context.dischargeTest.timeseriesSample) {
        lines.push(
          `- t=${pt.elapsedSeconds}s: Terminal Voltage = ${pt.voltage} V, Temperature = ${pt.temperature !== null && pt.temperature !== undefined ? `${pt.temperature} °C` : 'N/A'}, Load Current = ${pt.current !== null && pt.current !== undefined ? `${pt.current} A` : 'N/A'}`
        );
      }
    }
    lines.push('');
    lines.push('--- SCREENING EVALUATION OUTCOME ---');
    lines.push(`Overall Prototype Score: ${context.screeningOutcome.prototypeScore !== null ? `${context.screeningOutcome.prototypeScore} / 100` : 'NOT SCORED'}`);
    lines.push(`Screening Classification: ${context.screeningOutcome.classification}`);
    lines.push(`Electrical Component Score: ${context.screeningOutcome.electricalScore ?? 'N/A'} / 40`);
    lines.push(`Thermal Component Score: ${context.screeningOutcome.thermalScore ?? 'N/A'} / 30`);
    lines.push(`Stability Component Score: ${context.screeningOutcome.stabilityScore ?? 'N/A'} / 30`);
    lines.push(`Derived Voltage Sag: ${context.screeningOutcome.voltageSag !== null ? `${context.screeningOutcome.voltageSag} V` : 'N/A'}`);
    lines.push(`Derived Temperature Rise: ${context.screeningOutcome.temperatureRise !== null ? `+${context.screeningOutcome.temperatureRise} °C` : 'N/A'}`);
    lines.push(`Official Rule Engine Recommendation: "${context.screeningOutcome.officialRecommendation || 'None'}"`);
    lines.push('');
    lines.push('--- SECOND-LIFE APPLICATION SUITABILITY ---');
    if (context.applicationRecommendations.length === 0) {
      lines.push('No application recommendations generated.');
    } else {
      for (const app of context.applicationRecommendations) {
        lines.push(`- ${app.application}: [${app.suitability}] — ${app.reason}`);
      }
    }
    lines.push('');
    lines.push('--- OFFICIAL DISCLAIMER ---');
    lines.push(context.disclaimer);
    lines.push('<<<END_CANONICAL_REPORT>>>');

    return lines.join('\n');
  }
}
