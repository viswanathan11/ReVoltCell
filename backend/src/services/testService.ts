import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { AnalysisService } from './analysisService';
import { ApplicationService } from './applicationService';
import { LifecycleService } from './lifecycleService';

export interface FinalizeTestParams {
  testId: string;
  stopReason?: string;
  cellId?: string;
  deviceId?: string;
  summaryOverrides?: {
    finalVoltage?: number;
    minimumVoltage?: number;
    averageCurrent?: number;
    maximumCurrent?: number;
    initialTemperature?: number;
    maximumTemperature?: number;
    testDurationSeconds?: number;
  };
}

export interface FinalizeTestResult {
  test: any;
  analysis: any;
  applications: any[];
  idempotent: boolean;
}

export class TestService {
  /**
   * Finalizes a test session by computing summary metrics from actual measurements,
   * assigning correct statuses, running the screening analysis, generating recommendations,
   * and logging lifecycle history idempotently.
   */
  public static async finalizeTest(params: FinalizeTestParams): Promise<FinalizeTestResult> {
    const { testId, stopReason = 'COMPLETED', cellId, summaryOverrides } = params;

    // 1. Fetch test with all existing relationships
    const test = await prisma.test.findUnique({
      where: { testId },
      include: {
        cell: true,
        measurements: {
          orderBy: { elapsedSeconds: 'asc' },
        },
        analysis: true,
        applications: true,
      },
    });

    if (!test) {
      throw new AppError(`Test ${testId} was not found.`, 404, 'TEST_NOT_FOUND');
    }

    // 2. Validate cellId association if provided
    if (cellId && test.cellId !== cellId) {
      throw new AppError(
        `Test ${testId} belongs to cell ${test.cellId}, but received cellId ${cellId}.`,
        400,
        'CELL_TEST_MISMATCH'
      );
    }

    // 3. Idempotency Check: If already finalized, return existing result without duplicate records
    if (test.status === 'COMPLETED' || test.status === 'STOPPED' || test.status === 'FAILED') {
      return {
        test,
        analysis: test.analysis,
        applications: test.applications || [],
        idempotent: true,
      };
    }

    // 4. Verify test is in a state that allows completion
    if (test.status !== 'RUNNING') {
      throw new AppError(
        `Cannot complete test ${testId} with status '${test.status}'. Test must be in RUNNING status.`,
        400,
        'TEST_NOT_RUNNING'
      );
    }

    // 5. Strictly verify valid measurements exist — do not fabricate or invent sensor readings
    const measurements = test.measurements;
    if (!measurements || measurements.length === 0) {
      throw new AppError(
        `Cannot complete test ${testId}: No measurements recorded. Real sensor measurements are required.`,
        400,
        'NO_MEASUREMENTS'
      );
    }

    // 6. Compute summary aggregates from actual measurements
    const initV = measurements[0].voltage;
    const finalV = summaryOverrides?.finalVoltage ?? measurements[measurements.length - 1].voltage;
    const minV = summaryOverrides?.minimumVoltage ?? Math.min(...measurements.map((m) => m.voltage));
    const avgC =
      summaryOverrides?.averageCurrent ??
      Number((measurements.reduce((sum, m) => sum + m.current, 0) / measurements.length).toFixed(3));
    const maxC = summaryOverrides?.maximumCurrent ?? Math.max(...measurements.map((m) => m.current));
    const initT = summaryOverrides?.initialTemperature ?? measurements[0].temperature;
    const maxT = summaryOverrides?.maximumTemperature ?? Math.max(...measurements.map((m) => m.temperature));
    const tempRise = Number((maxT - initT).toFixed(2));
    const duration = summaryOverrides?.testDurationSeconds ?? measurements[measurements.length - 1].elapsedSeconds;

    // 7. Map stopReason to appropriate final Test and Cell statuses
    let finalTestStatus: 'COMPLETED' | 'STOPPED' | 'FAILED' = 'COMPLETED';
    let finalCellStatus: 'TESTED' | 'FAILED' = 'TESTED';

    if (stopReason === 'OVER_TEMPERATURE' || stopReason === 'ERROR') {
      finalTestStatus = 'FAILED';
      finalCellStatus = 'FAILED';
    } else if (stopReason === 'USER_STOP' || stopReason === 'TIMEOUT') {
      finalTestStatus = 'STOPPED';
      finalCellStatus = 'TESTED';
    } else {
      // COMPLETED or LOW_VOLTAGE
      finalTestStatus = 'COMPLETED';
      finalCellStatus = 'TESTED';
    }

    // 8. Update Test record
    const updatedTest = await prisma.test.update({
      where: { testId },
      data: {
        status: finalTestStatus,
        completedAt: new Date(),
        initialVoltage: initV,
        finalVoltage: finalV,
        minimumVoltage: minV,
        averageCurrent: avgC,
        maximumCurrent: maxC,
        initialTemperature: initT,
        maximumTemperature: maxT,
        temperatureRise: tempRise,
        testDurationSeconds: duration,
        stopReason,
      },
    });

    // 9. Run Screening Analysis Engine
    const analysisOutput = AnalysisService.calculateAnalysis({
      test: updatedTest,
      measurements,
      cell: test.cell,
    });

    // 10. Upsert Analysis record
    const analysis = await prisma.analysis.upsert({
      where: { testId },
      update: {
        score: analysisOutput.score,
        electricalScore: analysisOutput.electricalScore,
        thermalScore: analysisOutput.thermalScore,
        stabilityScore: analysisOutput.stabilityScore,
        classification: analysisOutput.classification,
        voltageSag: analysisOutput.voltageSag,
        temperatureRise: analysisOutput.temperatureRise,
        recommendation: analysisOutput.recommendation,
      },
      create: {
        testId,
        cellId: test.cellId,
        score: analysisOutput.score,
        electricalScore: analysisOutput.electricalScore,
        thermalScore: analysisOutput.thermalScore,
        stabilityScore: analysisOutput.stabilityScore,
        classification: analysisOutput.classification,
        voltageSag: analysisOutput.voltageSag,
        temperatureRise: analysisOutput.temperatureRise,
        recommendation: analysisOutput.recommendation,
      },
    });

    // 11. Generate Application Recommendations
    const appMatches = ApplicationService.evaluateApplications(
      analysisOutput.score,
      analysisOutput.classification,
      analysisOutput.voltageSag,
      analysisOutput.temperatureRise
    );

    await prisma.applicationRecommendation.deleteMany({ where: { testId } });
    await prisma.applicationRecommendation.createMany({
      data: appMatches.map((app) => ({
        cellId: test.cellId,
        testId,
        application: app.application,
        suitability: app.suitability,
        reason: app.reason,
      })),
    });

    // 12. Update Cell Status
    await prisma.cell.update({
      where: { cellId: test.cellId },
      data: { status: finalCellStatus },
    });

    // 13. Log Lifecycle Events consistently without duplicates
    if (finalTestStatus === 'FAILED') {
      await LifecycleService.addEvent(
        test.cellId,
        'TESTED',
        `Discharge test stopped with failure (${stopReason}) after ${duration}s. Score: ${analysisOutput.score}/100.`
      );
      await LifecycleService.addEvent(
        test.cellId,
        'SECOND_LIFE_EVALUATION',
        `Triage evaluation: ${analysisOutput.classification}. ${analysisOutput.recommendation}`
      );
      await LifecycleService.addEvent(
        test.cellId,
        'RECYCLE',
        `Cell failed test criteria (${stopReason}). Flagged for certified mineral recovery and recycling.`
      );
    } else if (finalTestStatus === 'STOPPED') {
      await LifecycleService.addEvent(
        test.cellId,
        'TESTED',
        `Discharge screening interrupted (${stopReason}) after ${duration}s. Score: ${analysisOutput.score}/100.`
      );
      await LifecycleService.addEvent(
        test.cellId,
        'SECOND_LIFE_EVALUATION',
        `Triage evaluation: ${analysisOutput.classification}. ${analysisOutput.recommendation}`
      );
      if (analysisOutput.classification === 'UNSUITABLE') {
        await LifecycleService.addEvent(
          test.cellId,
          'RECYCLE',
          'Interrupted test revealed critical degradation or unsafe response. Marked for recycling.'
        );
      } else {
        await LifecycleService.addEvent(
          test.cellId,
          'RETEST',
          'Incomplete discharge profile due to interruption. Cell flagged for re-test before second-life repurposing.'
        );
      }
    } else {
      // Normal COMPLETED
      await LifecycleService.addEvent(
        test.cellId,
        'TESTED',
        `Discharge evaluation completed in ${duration}s. Prototype screening score: ${analysisOutput.score}/100 (${analysisOutput.classification}).`
      );
      await LifecycleService.addEvent(
        test.cellId,
        'SECOND_LIFE_EVALUATION',
        `Evaluated for second-life readiness: ${analysisOutput.classification}. ${analysisOutput.recommendation}`
      );
      if (analysisOutput.classification === 'GOOD' || analysisOutput.classification === 'FURTHER_EVALUATION') {
        await LifecycleService.addEvent(
          test.cellId,
          'SECOND_LIFE_CANDIDATE',
          `Designated candidate for potential low-draw or buffered second-life usage.`
        );
      } else {
        await LifecycleService.addEvent(
          test.cellId,
          'RECYCLE',
          'Not recommended for secondary repurposing. Marked for certified recycling and mineral reclamation.'
        );
      }
    }

    return {
      test: updatedTest,
      analysis,
      applications: appMatches,
      idempotent: false,
    };
  }
}
