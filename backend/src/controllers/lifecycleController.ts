import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { LifecycleService } from '../services/lifecycleService';

export class LifecycleController {
  public static async getCellLifecycle(req: Request, res: Response, next: NextFunction) {
    try {
      const cellId = req.params.cellId as string;
      const cell = await prisma.cell.findUnique({ where: { cellId } });
      if (!cell) {
        throw new AppError(`Cell ${cellId} was not found.`, 404, 'CELL_NOT_FOUND');
      }

      const events = await LifecycleService.getLifecycle(cellId);

      res.json({
        success: true,
        data: events,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async addLifecycleEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const cellId = req.params.cellId as string;
      const { event, description } = req.body;

      const cell = await prisma.cell.findUnique({ where: { cellId } });
      if (!cell) {
        throw new AppError(`Cell ${cellId} was not found.`, 404, 'CELL_NOT_FOUND');
      }

      const created = await LifecycleService.addEvent(cellId, event, description);

      res.status(201).json({
        success: true,
        data: created,
      });
    } catch (err) {
      next(err);
    }
  }
}
