import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { ENV } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { realtimeService } from '../services/realtimeService';
import { AnalysisService } from '../services/analysisService';
import { ApplicationService } from '../services/applicationService';
import { TestController } from './testController';

export class DeviceController {
  private static async generateUniqueCellId(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
      const randPart = crypto.randomBytes(2).toString('hex').toUpperCase();
      const candidate = `CELL-${datePart}-${randPart}`;
      const exists = await prisma.cell.findUnique({ where: { cellId: candidate } });
      if (!exists) return candidate;
    }
    return `CELL-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  }

  private static async generateUniqueTestId(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
      const randPart = crypto.randomBytes(2).toString('hex').toUpperCase();
      const candidate = `TEST-${datePart}-${randPart}`;
      const exists = await prisma.test.findUnique({ where: { testId: candidate } });
      if (!exists) return candidate;
    }
    return `TEST-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  }

  /**
   * POST /api/device/screening
   * Accepts ESP32 automated screening payload, creates a new Cell, Test,
   * TestMeasurements, runs Analysis & Application matching, and logs Lifecycle events.
   */
  public static async processScreening(req: Request, res: Response, next: NextFunction) {
    try {
      const { voltage, temperature, current_mA, testDurationSeconds, deviceId } = req.body;

      const cellId = await DeviceController.generateUniqueCellId();
      const testId = await DeviceController.generateUniqueTestId();

      const duration = testDurationSeconds || 4;
      const currentAmps = Number((current_mA / 1000).toFixed(3));
      const completedAt = new Date();
      const startedAt = new Date(completedAt.getTime() - duration * 1000);

      const devId = deviceId || 'REVOLTCELL-ESP32-001';

      // Determine hardware stop reason if threshold breached
      const stopReason =
        temperature >= 55.0 ? 'OVER_TEMPERATURE' : voltage < 3.0 ? 'LOW_VOLTAGE' : 'COMPLETED';

      // Atomic database transaction to prevent orphaned or partial records
      const result = await prisma.$transaction(async (tx) => {
        // 1. Create Cell record
        const cell = await tx.cell.create({
          data: {
            cellId,
            cellType: '18650',
            manufacturer: 'Recovered EV Module',
            model: '18650',
            chemistry: 'Li-ion',
            nominalVoltage: 3.7,
            ratedCapacityMah: 2500,
            source: `ESP32 Screening Unit (${devId})`,
            status: 'TESTED',
          },
        });

        // 2. Create Test record
        const test = await tx.test.create({
          data: {
            testId,
            cellId,
            startedAt,
            completedAt,
            initialVoltage: voltage,
            finalVoltage: voltage,
            minimumVoltage: voltage,
            averageCurrent: currentAmps,
            maximumCurrent: currentAmps,
            initialTemperature: temperature,
            maximumTemperature: temperature,
            temperatureRise: 0.0,
            testDurationSeconds: duration,
            loadResistanceOhms: 5.0,
            loadPowerRatingWatts: 10.0,
            status: 'COMPLETED',
            stopReason,
          },
        });

        // 3. Create test measurement points (beginning and end of screening)
        const measurementsData = [
          {
            testId,
            elapsedSeconds: 0,
            voltage,
            current: currentAmps,
            temperature,
            loadEnabled: true,
            timestamp: startedAt,
          },
          {
            testId,
            elapsedSeconds: duration,
            voltage,
            current: currentAmps,
            temperature,
            loadEnabled: true,
            timestamp: completedAt,
          },
        ];

        await tx.testMeasurement.createMany({
          data: measurementsData,
        });

        // 4. Calculate Screening Analysis using authoritative backend engine
        const analysisOutput = AnalysisService.calculateAnalysis({
          test,
          measurements: measurementsData,
          cell: {
            nominalVoltage: cell.nominalVoltage,
            ratedCapacityMah: cell.ratedCapacityMah,
            chemistry: cell.chemistry,
          },
        });

        // 5. Store Analysis record
        const analysis = await tx.analysis.create({
          data: {
            testId,
            cellId,
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

        // 6. Generate Application Recommendations
        const appMatches = ApplicationService.evaluateApplications(
          analysisOutput.score,
          analysisOutput.classification,
          analysisOutput.voltageSag,
          analysisOutput.temperatureRise
        );

        await tx.applicationRecommendation.createMany({
          data: appMatches.map((app) => ({
            cellId,
            testId,
            application: app.application,
            suitability: app.suitability,
            reason: app.reason,
          })),
        });

        // 7. Append immutable lifecycle events
        const candidateEvent =
          analysisOutput.classification === 'GOOD' || analysisOutput.classification === 'FURTHER_EVALUATION'
            ? 'SECOND_LIFE_CANDIDATE'
            : 'RECYCLE';

        const candidateDesc =
          analysisOutput.classification === 'GOOD' || analysisOutput.classification === 'FURTHER_EVALUATION'
            ? 'Designated candidate for potential low-draw or buffered second-life usage.'
            : 'Slated for certified recycling and mineral reclamation due to screening thresholds.';

        await tx.lifecycleEvent.createMany({
          data: [
            {
              cellId,
              event: 'EV_BATTERY',
              description: `Recovered battery unit registered for automated triage.`,
              timestamp: startedAt,
            },
            {
              cellId,
              event: 'TESTED',
              description: `Screening evaluation finished (${duration}s) on ${devId}. Score: ${analysisOutput.score}/100 (${analysisOutput.classification}).`,
              timestamp: completedAt,
            },
            {
              cellId,
              event: 'SECOND_LIFE_EVALUATION',
              description: `Readiness: ${analysisOutput.classification}. ${analysisOutput.recommendation}`,
              timestamp: completedAt,
            },
            {
              cellId,
              event: candidateEvent,
              description: candidateDesc,
              timestamp: completedAt,
            },
          ],
        });

        return {
          cell,
          test,
          analysis,
          appMatches,
        };
      });

      // Emit real-time updates to connected browsers & dashboard
      realtimeService.emitTestEvent(testId, {
        type: 'COMPLETE',
        data: {
          test: result.test,
          analysis: result.analysis,
          applications: result.appMatches,
        },
      });
      realtimeService.emitDashboardUpdate();

      const passportUrl = `${ENV.PASSPORT_BASE_URL}/${cellId}`;

      res.status(201).json({
        success: true,
        data: {
          cellId,
          testId,
          status: 'COMPLETED',
          score: result.analysis.score,
          classification: result.analysis.classification,
          recommendation: result.analysis.recommendation,
          passportUrl,
          measured: {
            voltage,
            temperature,
            current_mA,
            current_A: currentAmps,
            durationSeconds: duration,
          },
          scores: {
            overall: result.analysis.score,
            electrical: result.analysis.electricalScore,
            thermal: result.analysis.thermalScore,
            stability: result.analysis.stabilityScore,
          },
          applications: result.appMatches,
          deviceId: devId,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async receiveDeviceData(req: Request, res: Response, next: NextFunction) {
    try {
      const { deviceId, cellId, testId, elapsedSeconds, voltage, current, temperature, loadEnabled, timestamp } = req.body;

      const test = await prisma.test.findUnique({ where: { testId } });
      if (!test) {
        throw new AppError(`Test ${testId} was not found.`, 404, 'TEST_NOT_FOUND');
      }

      const measurement = await prisma.testMeasurement.create({
        data: {
          testId,
          elapsedSeconds,
          voltage,
          current,
          temperature,
          loadEnabled: loadEnabled ?? true,
          timestamp: timestamp ? new Date(timestamp) : new Date(),
        },
      });

      realtimeService.emitTestEvent(testId, {
        type: 'MEASUREMENT',
        data: measurement,
      });

      res.status(201).json({
        success: true,
        data: {
          received: true,
          deviceId: deviceId || 'REVOLTCELL-ESP32-001',
          testId,
          cellId,
          measurementId: measurement.id,
          elapsedSeconds: measurement.elapsedSeconds,
          voltage: measurement.voltage,
          current: measurement.current,
          temperature: measurement.temperature,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async completeDeviceTest(req: Request, res: Response, next: NextFunction) {
    try {
      const { testId, stopReason, testDurationSeconds } = req.body;
      req.params.testId = testId;
      req.body = {
        stopReason: stopReason || 'COMPLETED',
        testDurationSeconds,
      };

      await TestController.completeTest(req, res, next);
    } catch (err) {
      next(err);
    }
  }
}
