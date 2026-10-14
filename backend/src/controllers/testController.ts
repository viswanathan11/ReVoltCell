import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { AnalysisService } from '../services/analysisService';
import { ApplicationService } from '../services/applicationService';
import { LifecycleService } from '../services/lifecycleService';
import { realtimeService } from '../services/realtimeService';

export class TestController {
  public static async createTest(req: Request, res: Response, next: NextFunction) {
    try {
      const { cellId, loadResistanceOhms, loadPowerRatingWatts } = req.body;

      // Verify cell exists
      const cell = await prisma.cell.findUnique({ where: { cellId } });
      if (!cell) {
        throw new AppError(`Cell ${cellId} was not found.`, 404, 'CELL_NOT_FOUND');
      }

      // Generate testId TEST-0001, TEST-0002...
      const count = await prisma.test.count();
      const testId = `TEST-${String(count + 1).padStart(4, '0')}`;

      const test = await prisma.test.create({
        data: {
          testId,
          cellId,
          loadResistanceOhms: loadResistanceOhms ?? 5.0,
          loadPowerRatingWatts: loadPowerRatingWatts ?? 10.0,
          status: 'PENDING',
        },
      });

      res.status(201).json({
        success: true,
        data: {
          testId: test.testId,
          cellId: test.cellId,
          status: test.status,
          loadResistanceOhms: test.loadResistanceOhms,
          loadPowerRatingWatts: test.loadPowerRatingWatts,
          createdAt: test.createdAt,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async startTest(req: Request, res: Response, next: NextFunction) {
    try {
      const testId = req.params.testId as string;
      const test = await prisma.test.findUnique({ where: { testId } });
      if (!test) {
        throw new AppError(`Test ${testId} was not found.`, 404, 'TEST_NOT_FOUND');
      }

      const updated = await prisma.test.update({
        where: { testId },
        data: {
          status: 'RUNNING',
          startedAt: new Date(),
        },
      });

      // Update cell status
      await prisma.cell.update({
        where: { cellId: test.cellId },
        data: { status: 'TESTING' },
      });

      realtimeService.emitTestEvent(testId, {
        type: 'START',
        data: {
          testId: updated.testId,
          status: updated.status,
          startedAt: updated.startedAt,
        },
      });
      realtimeService.emitDashboardUpdate();

      res.json({
        success: true,
        data: {
          testId: updated.testId,
          status: updated.status,
          startedAt: updated.startedAt,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async addMeasurement(req: Request, res: Response, next: NextFunction) {
    try {
      const testId = req.params.testId as string;
      const { elapsedSeconds, voltage, current, temperature, loadEnabled, timestamp } = req.body;

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

      // Realtime instantaneous SSE push to connected browsers
      realtimeService.emitTestEvent(testId, {
        type: 'MEASUREMENT',
        data: measurement,
      });

      res.status(201).json({
        success: true,
        data: measurement,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async addBatchMeasurements(req: Request, res: Response, next: NextFunction) {
    try {
      const testId = req.params.testId as string;
      const { measurements } = req.body;

      const test = await prisma.test.findUnique({ where: { testId } });
      if (!test) {
        throw new AppError(`Test ${testId} was not found.`, 404, 'TEST_NOT_FOUND');
      }

      const dataToInsert = measurements.map((m: any) => ({
        testId,
        elapsedSeconds: m.elapsedSeconds,
        voltage: m.voltage,
        current: m.current,
        temperature: m.temperature,
        loadEnabled: m.loadEnabled ?? true,
        timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
      }));

      await prisma.testMeasurement.createMany({
        data: dataToInsert,
      });

      // Realtime push of batch points
      realtimeService.emitTestEvent(testId, {
        type: 'BATCH_MEASUREMENTS',
        data: dataToInsert,
      });

      res.status(201).json({
        success: true,
        data: {
          testId,
          insertedCount: dataToInsert.length,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async completeTest(req: Request, res: Response, next: NextFunction) {
    try {
      const testId = req.params.testId as string;
      const test = await prisma.test.findUnique({
        where: { testId },
        include: {
          cell: true,
          measurements: {
            orderBy: { elapsedSeconds: 'asc' },
          },
        },
      });

      if (!test) {
        throw new AppError(`Test ${testId} was not found.`, 404, 'TEST_NOT_FOUND');
      }

      const measurements = test.measurements;
      const body = req.body || {};

      // Compute aggregates from measurements if not provided in payload
      const initialVoltage =
        body.initialVoltage ?? (measurements.length > 0 ? measurements[0].voltage : test.cell.nominalVoltage);
      const finalVoltage =
        body.finalVoltage ?? (measurements.length > 0 ? measurements[measurements.length - 1].voltage : initialVoltage);
      const minimumVoltage =
        body.minimumVoltage ?? (measurements.length > 0 ? Math.min(...measurements.map((m: any) => m.voltage)) : finalVoltage);

      const averageCurrent =
        body.averageCurrent ??
        (measurements.length > 0
          ? Number((measurements.reduce((sum: number, m: any) => sum + m.current, 0) / measurements.length).toFixed(3))
          : 0.8);
      const maximumCurrent =
        body.maximumCurrent ?? (measurements.length > 0 ? Math.max(...measurements.map((m: any) => m.current)) : averageCurrent);

      const initialTemperature =
        body.initialTemperature ?? (measurements.length > 0 ? measurements[0].temperature : 25.0);
      const maximumTemperature =
        body.maximumTemperature ??
        (measurements.length > 0 ? Math.max(...measurements.map((m: any) => m.temperature)) : initialTemperature);
      const temperatureRise = Number((maximumTemperature - initialTemperature).toFixed(2));

      const testDurationSeconds =
        body.testDurationSeconds ??
        (measurements.length > 0 ? measurements[measurements.length - 1].elapsedSeconds : 120);

      const stopReason = body.stopReason || 'COMPLETED';

      // 1. Update Test record
      const updatedTest = await prisma.test.update({
        where: { testId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          initialVoltage,
          finalVoltage,
          minimumVoltage,
          averageCurrent,
          maximumCurrent,
          initialTemperature,
          maximumTemperature,
          temperatureRise,
          testDurationSeconds,
          stopReason,
        },
      });

      // 2. Generate Analysis
      const analysisOutput = AnalysisService.calculateAnalysis({
        test: updatedTest,
        measurements,
        cell: test.cell,
      });

      // Upsert analysis
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

      // 3. Generate Application Recommendations
      const appMatches = ApplicationService.evaluateApplications(
        analysisOutput.score,
        analysisOutput.classification,
        analysisOutput.voltageSag,
        analysisOutput.temperatureRise
      );

      // Clean existing recommendations for this test if any
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

      // 4. Update Cell Status to TESTED
      await prisma.cell.update({
        where: { cellId: test.cellId },
        data: { status: 'TESTED' },
      });

      // 5. Add Lifecycle Events
      await LifecycleService.addEvent(
        test.cellId,
        'TESTED',
        `Discharge evaluation completed in ${testDurationSeconds}s. Prototype screening score: ${analysisOutput.score}/100 (${analysisOutput.classification}).`
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
          `Not recommended for secondary repurposing. Marked for certified recycling and mineral reclamation.`
        );
      }

      // Realtime push of completion & calculated scores
      realtimeService.emitTestEvent(testId, {
        type: 'COMPLETE',
        data: {
          testId: updatedTest.testId,
          cellId: updatedTest.cellId,
          status: updatedTest.status,
          score: analysis.score,
          classification: analysis.classification,
          analysis,
          applications: appMatches,
        },
      });
      realtimeService.emitDashboardUpdate();

      res.json({
        success: true,
        data: {
          testId: updatedTest.testId,
          cellId: updatedTest.cellId,
          status: updatedTest.status,
          score: analysis.score,
          classification: analysis.classification,
          analysis,
          applications: appMatches,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async stopTest(req: Request, res: Response, next: NextFunction) {
    try {
      const testId = req.params.testId as string;
      const { stopReason } = req.body;

      const test = await prisma.test.findUnique({ where: { testId } });
      if (!test) {
        throw new AppError(`Test ${testId} was not found.`, 404, 'TEST_NOT_FOUND');
      }

      const updated = await prisma.test.update({
        where: { testId },
        data: {
          status: 'STOPPED',
          stopReason: stopReason || 'USER_STOP',
          completedAt: new Date(),
        },
      });

      await prisma.cell.update({
        where: { cellId: test.cellId },
        data: { status: 'REGISTERED' },
      });

      realtimeService.emitTestEvent(testId, {
        type: 'STOP',
        data: {
          testId: updated.testId,
          status: updated.status,
          stopReason: updated.stopReason,
        },
      });
      realtimeService.emitDashboardUpdate();

      res.json({
        success: true,
        data: {
          testId: updated.testId,
          status: updated.status,
          stopReason: updated.stopReason,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Realtime SSE (Server-Sent Events) live streaming endpoint.
   * Browsers receive sensor measurements and status updates instantly in 0ms without polling delay.
   */
  public static streamTest(req: Request, res: Response) {
    const testId = req.params.testId as string;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof (res as any).flushHeaders === 'function') {
      (res as any).flushHeaders();
    }

    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', testId, timestamp: new Date().toISOString() })}\n\n`);

    const listener = (event: any) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    realtimeService.onTestEvent(testId, listener);

    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeat);
      realtimeService.offTestEvent(testId, listener);
    });
  }

  public static async getTestById(req: Request, res: Response, next: NextFunction) {
    try {
      const testId = req.params.testId as string;
      const test = await prisma.test.findUnique({
        where: { testId },
        include: {
          cell: true,
          analysis: true,
          applications: true,
          measurements: {
            orderBy: { elapsedSeconds: 'asc' },
          },
        },
      });

      if (!test) {
        throw new AppError(`Test ${testId} was not found.`, 404, 'TEST_NOT_FOUND');
      }

      res.json({
        success: true,
        data: test,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getTestsForCell(req: Request, res: Response, next: NextFunction) {
    try {
      const cellId = req.params.cellId as string;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const cell = await prisma.cell.findUnique({ where: { cellId } });
      if (!cell) {
        throw new AppError(`Cell ${cellId} was not found.`, 404, 'CELL_NOT_FOUND');
      }

      const total = await prisma.test.count({ where: { cellId } });
      const totalPages = Math.ceil(total / limit) || 1;

      const tests = await prisma.test.findMany({
        where: { cellId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          analysis: true,
          _count: {
            select: { measurements: true },
          },
        },
      });

      res.json({
        success: true,
        data: tests,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
