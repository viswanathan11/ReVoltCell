import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

export class DashboardController {
  public static async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const totalCells = await prisma.cell.count();
      const testedCells = await prisma.cell.count({ where: { status: 'TESTED' } });
      const testingCells = await prisma.cell.count({ where: { status: 'TESTING' } });
      const registeredCells = await prisma.cell.count({ where: { status: 'REGISTERED' } });
      const archivedCells = await prisma.cell.count({ where: { status: 'ARCHIVED' } });

      const goodCells = await prisma.analysis.count({ where: { classification: 'GOOD' } });
      const furtherEvaluation = await prisma.analysis.count({ where: { classification: 'FURTHER_EVALUATION' } });
      const lowPerformance = await prisma.analysis.count({ where: { classification: 'LOW_PERFORMANCE' } });
      const unsuitable = await prisma.analysis.count({ where: { classification: 'UNSUITABLE' } });

      const totalTests = await prisma.test.count();
      const activeTests = await prisma.test.count({ where: { status: 'RUNNING' } });

      res.json({
        success: true,
        data: {
          totalCells,
          testedCells,
          testingCells,
          registeredCells,
          archivedCells,
          goodCells,
          furtherEvaluation,
          lowPerformance,
          unsuitable,
          totalTests,
          activeTests,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getRecentTests(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      const recentTests = await prisma.test.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          cell: true,
          analysis: true,
        },
      });

      const formatted = recentTests.map((t) => ({
        testId: t.testId,
        cellId: t.cellId,
        status: t.status,
        createdAt: t.createdAt,
        completedAt: t.completedAt,
        initialVoltage: t.initialVoltage,
        finalVoltage: t.finalVoltage,
        temperatureRise: t.temperatureRise,
        durationSeconds: t.testDurationSeconds,
        score: t.analysis?.score ?? null,
        classification: t.analysis?.classification ?? null,
        cellModel: t.cell.model,
        cellChemistry: t.cell.chemistry,
      }));

      res.json({
        success: true,
        data: formatted,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getScoreDistribution(req: Request, res: Response, next: NextFunction) {
    try {
      const analyses = await prisma.analysis.findMany({
        select: {
          score: true,
          classification: true,
        },
      });

      const buckets = [
        { range: '0 - 44 (Unsuitable)', count: 0, classification: 'UNSUITABLE' },
        { range: '45 - 64 (Low Perf)', count: 0, classification: 'LOW_PERFORMANCE' },
        { range: '65 - 79 (Further Eval)', count: 0, classification: 'FURTHER_EVALUATION' },
        { range: '80 - 100 (Good)', count: 0, classification: 'GOOD' },
      ];

      for (const a of analyses) {
        if (a.score < 45) buckets[0].count++;
        else if (a.score < 65) buckets[1].count++;
        else if (a.score < 80) buckets[2].count++;
        else buckets[3].count++;
      }

      res.json({
        success: true,
        data: {
          distribution: buckets,
          totalAnalyses: analyses.length,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
