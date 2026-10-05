import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { AnalysisService } from '../services/analysisService';
import { ApplicationService } from '../services/applicationService';
import { LifecycleService } from '../services/lifecycleService';

export class MockController {
  public static async simulateTest(req: Request, res: Response, next: NextFunction) {
    try {
      const testId = req.params.testId as string;
      const profile = (req.body.profile || 'GOOD').toUpperCase();

      const test = await prisma.test.findUnique({
        where: { testId },
        include: { cell: true },
      });

      if (!test) {
        throw new AppError(`Test ${testId} was not found.`, 404, 'TEST_NOT_FOUND');
      }

      // Generate simulated measurement curve (24 points, step = 5 seconds, total 120s)
      const duration = 120;
      const step = 5;
      const measurementsData = [];

      let nominal = test.cell.nominalVoltage || 3.7;
      let startV = 4.15;
      let currentNominal = 0.82;
      let startT = 25.5;

      if (profile === 'GOOD') {
        startV = 4.15;
        for (let t = 0; t <= duration; t += step) {
          const sag = t === 0 ? 0 : 0.12 + (t / duration) * 0.22;
          const noise = (Math.random() - 0.5) * 0.01;
          const v = Number((startV - sag + noise).toFixed(3));
          const c = Number((currentNominal + (Math.random() - 0.5) * 0.02).toFixed(3));
          const temp = Number((startT + (t / duration) * 3.2 + (Math.random() - 0.5) * 0.2).toFixed(2));
          measurementsData.push({
            testId,
            elapsedSeconds: t,
            voltage: v,
            current: c,
            temperature: temp,
            loadEnabled: true,
          });
        }
      } else if (profile === 'WEAK') {
        startV = 4.05;
        for (let t = 0; t <= duration; t += step) {
          const sag = t === 0 ? 0 : 0.45 + Math.pow(t / duration, 1.2) * 0.45;
          const noise = (Math.random() - 0.5) * 0.02;
          const v = Math.max(2.8, Number((startV - sag + noise).toFixed(3)));
          const c = Number((0.74 + (Math.random() - 0.5) * 0.03).toFixed(3));
          const temp = Number((startT + (t / duration) * 7.5 + (Math.random() - 0.5) * 0.3).toFixed(2));
          measurementsData.push({
            testId,
            elapsedSeconds: t,
            voltage: v,
            current: c,
            temperature: temp,
            loadEnabled: true,
          });
        }
      } else if (profile === 'HOT') {
        startV = 4.10;
        for (let t = 0; t <= duration; t += step) {
          const sag = t === 0 ? 0 : 0.25 + (t / duration) * 0.4;
          const v = Number((startV - sag).toFixed(3));
          const c = Number((0.85 + (Math.random() - 0.5) * 0.02).toFixed(3));
          // Rapid temperature rise exceeding safety limits
          const temp = Number((startT + Math.pow(t / duration, 1.3) * 26.0).toFixed(2));
          measurementsData.push({
            testId,
            elapsedSeconds: t,
            voltage: v,
            current: c,
            temperature: temp,
            loadEnabled: true,
          });
        }
      } else {
        // UNSTABLE
        startV = 4.08;
        for (let t = 0; t <= duration; t += step) {
          // Erratic fluctuations
          const jump = Math.sin(t * 0.3) * 0.18 + (Math.random() - 0.5) * 0.12;
          const v = Number((startV - (t / duration) * 0.35 + jump).toFixed(3));
          const c = Number((currentNominal + Math.sin(t * 0.5) * 0.08).toFixed(3));
          const temp = Number((startT + (t / duration) * 9.0).toFixed(2));
          measurementsData.push({
            testId,
            elapsedSeconds: t,
            voltage: Math.max(2.5, v),
            current: Math.max(0.1, c),
            temperature: temp,
            loadEnabled: true,
          });
        }
      }

      // Delete any previous measurements for this test and insert new
      await prisma.testMeasurement.deleteMany({ where: { testId } });
      await prisma.testMeasurement.createMany({ data: measurementsData });

      // Compute summary fields
      const initV = measurementsData[0].voltage;
      const finalV = measurementsData[measurementsData.length - 1].voltage;
      const minV = Math.min(...measurementsData.map((m) => m.voltage));
      const avgC = Number(
        (measurementsData.reduce((acc, m) => acc + m.current, 0) / measurementsData.length).toFixed(3)
      );
      const maxC = Math.max(...measurementsData.map((m) => m.current));
      const initT = measurementsData[0].temperature;
      const maxT = Math.max(...measurementsData.map((m) => m.temperature));
      const tempRise = Number((maxT - initT).toFixed(2));

      let stopReason = 'COMPLETED';
      if (profile === 'HOT' && maxT > 48) {
        stopReason = 'OVER_TEMPERATURE';
      }

      // Update test record
      const updatedTest = await prisma.test.update({
        where: { testId },
        data: {
          status: 'COMPLETED',
          startedAt: new Date(Date.now() - duration * 1000),
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

      // Run Analysis
      const analysisOutput = AnalysisService.calculateAnalysis({
        test: updatedTest,
        measurements: measurementsData,
        cell: test.cell,
      });

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

      // Run Applications
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

      // Update cell status
      await prisma.cell.update({
        where: { cellId: test.cellId },
        data: { status: 'TESTED' },
      });

      // Add lifecycle event
      await LifecycleService.addEvent(
        test.cellId,
        'TESTED',
        `Simulated ${profile} profile discharge test completed (${duration}s). Score: ${analysisOutput.score}/100.`
      );

      res.json({
        success: true,
        data: {
          testId: updatedTest.testId,
          cellId: updatedTest.cellId,
          status: updatedTest.status,
          profile,
          score: analysis.score,
          classification: analysis.classification,
          voltageSag: analysis.voltageSag,
          temperatureRise: analysis.temperatureRise,
          measurementsCount: measurementsData.length,
          analysis,
          applications: appMatches,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
