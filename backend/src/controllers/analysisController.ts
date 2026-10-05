import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { AnalysisService } from '../services/analysisService';
import { ApplicationService } from '../services/applicationService';

export class AnalysisController {
  public static async generateAnalysis(req: Request, res: Response, next: NextFunction) {
    try {
      const testId = req.params.testId as string;
      const test = await prisma.test.findUnique({
        where: { testId },
        include: {
          cell: true,
          measurements: { orderBy: { elapsedSeconds: 'asc' } },
        },
      });

      if (!test) {
        throw new AppError(`Test ${testId} was not found.`, 404, 'TEST_NOT_FOUND');
      }

      const analysisOutput = AnalysisService.calculateAnalysis({
        test,
        measurements: test.measurements,
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

      // Update recommendations
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

      res.json({
        success: true,
        data: {
          analysis,
          applications: appMatches,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getCellAnalysis(req: Request, res: Response, next: NextFunction) {
    try {
      const cellId = req.params.cellId as string;
      const cell = await prisma.cell.findUnique({ where: { cellId } });
      if (!cell) {
        throw new AppError(`Cell ${cellId} was not found.`, 404, 'CELL_NOT_FOUND');
      }

      const analysis = await prisma.analysis.findFirst({
        where: { cellId },
        orderBy: { createdAt: 'desc' },
        include: {
          test: true,
        },
      });

      if (!analysis) {
        throw new AppError(`No analysis found for cell ${cellId}. Run a test first.`, 404, 'ANALYSIS_NOT_FOUND');
      }

      res.json({
        success: true,
        data: analysis,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getTestAnalysis(req: Request, res: Response, next: NextFunction) {
    try {
      const testId = req.params.testId as string;
      const analysis = await prisma.analysis.findUnique({
        where: { testId },
        include: {
          test: true,
          cell: true,
        },
      });

      if (!analysis) {
        throw new AppError(`No analysis found for test ${testId}.`, 404, 'ANALYSIS_NOT_FOUND');
      }

      res.json({
        success: true,
        data: analysis,
      });
    } catch (err) {
      next(err);
    }
  }
}
