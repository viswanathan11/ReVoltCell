import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';

export class ApplicationController {
  public static async getCellApplications(req: Request, res: Response, next: NextFunction) {
    try {
      const cellId = req.params.cellId as string;
      const cell = await prisma.cell.findUnique({ where: { cellId } });
      if (!cell) {
        throw new AppError(`Cell ${cellId} was not found.`, 404, 'CELL_NOT_FOUND');
      }

      const recommendations = await prisma.applicationRecommendation.findMany({
        where: { cellId },
        orderBy: { createdAt: 'desc' },
      });

      // Filter distinct applications
      const distinctMap = new Map<string, (typeof recommendations)[0]>();
      for (const rec of recommendations) {
        if (!distinctMap.has(rec.application)) {
          distinctMap.set(rec.application, rec);
        }
      }
      const distinct = Array.from(distinctMap.values());

      // Separate into primary (highest suitability) and alternatives
      const high = distinct.filter((r) => r.suitability === 'HIGH');
      const medium = distinct.filter((r) => r.suitability === 'MEDIUM');
      const low = distinct.filter((r) => r.suitability === 'LOW');
      const notRec = distinct.filter((r) => r.suitability === 'NOT_RECOMMENDED');

      const primary = high[0] || medium[0] || low[0] || notRec[0] || null;
      const alternatives = distinct.filter((r) => r !== primary);

      res.json({
        success: true,
        data: {
          cellId,
          primary: primary
            ? {
                application: primary.application,
                suitability: primary.suitability,
                reason: primary.reason,
              }
            : null,
          alternatives: alternatives.map((r) => ({
            application: r.application,
            suitability: r.suitability,
            reason: r.reason,
          })),
          allRecommendations: distinct,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
