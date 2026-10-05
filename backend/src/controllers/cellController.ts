import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { LifecycleService } from '../services/lifecycleService';

export class CellController {
  public static async createCell(req: Request, res: Response, next: NextFunction) {
    try {
      const { cellId, manufacturer, model, chemistry, nominalVoltage, ratedCapacityMah, source, manufactureDate } = req.body;

      // Check uniqueness
      const existing = await prisma.cell.findUnique({ where: { cellId } });
      if (existing) {
        throw new AppError(`Cell with cellId "${cellId}" already exists.`, 409, 'CELL_ALREADY_EXISTS');
      }

      const cell = await prisma.cell.create({
        data: {
          cellId,
          manufacturer: manufacturer || 'Unknown',
          model: model || '18650',
          chemistry: chemistry || 'Li-ion',
          nominalVoltage,
          ratedCapacityMah,
          source: source || 'Recovered EV battery',
          manufactureDate,
          status: 'REGISTERED',
        },
      });

      // Initialize lifecycle events
      await LifecycleService.initializeCellLifecycle(cell.cellId, cell.source);

      res.status(201).json({
        success: true,
        data: {
          cellId: cell.cellId,
          status: cell.status,
          manufacturer: cell.manufacturer,
          model: cell.model,
          chemistry: cell.chemistry,
          nominalVoltage: cell.nominalVoltage,
          ratedCapacityMah: cell.ratedCapacityMah,
          source: cell.source,
          createdAt: cell.createdAt,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getCells(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const status = req.query.status as string | undefined;
      const search = req.query.search as string | undefined;

      const where: any = {};
      if (status) {
        where.status = status;
      }
      if (search) {
        where.OR = [
          { cellId: { contains: search } },
          { manufacturer: { contains: search } },
          { model: { contains: search } },
          { chemistry: { contains: search } },
        ];
      }

      const total = await prisma.cell.count({ where });
      const totalPages = Math.ceil(total / limit) || 1;

      const cells = await prisma.cell.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          analyses: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          tests: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      const formatted = cells.map((cell) => ({
        id: cell.id,
        cellId: cell.cellId,
        manufacturer: cell.manufacturer,
        model: cell.model,
        chemistry: cell.chemistry,
        nominalVoltage: cell.nominalVoltage,
        ratedCapacityMah: cell.ratedCapacityMah,
        source: cell.source,
        status: cell.status,
        createdAt: cell.createdAt,
        updatedAt: cell.updatedAt,
        latestScore: cell.analyses[0]?.score ?? null,
        classification: cell.analyses[0]?.classification ?? null,
        latestTestId: cell.tests[0]?.testId ?? null,
      }));

      res.json({
        success: true,
        data: formatted,
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

  public static async getCellById(req: Request, res: Response, next: NextFunction) {
    try {
      const cellId = req.params.cellId as string;
      const cell = await prisma.cell.findUnique({
        where: { cellId },
        include: {
          tests: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
              analysis: true,
            },
          },
          analyses: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          applications: {
            orderBy: { createdAt: 'desc' },
          },
          lifecycleEvents: {
            orderBy: { timestamp: 'asc' },
          },
        },
      });

      if (!cell) {
        throw new AppError(`Cell ${cellId} was not found.`, 404, 'CELL_NOT_FOUND');
      }

      res.json({
        success: true,
        data: {
          cell,
          latestTest: cell.tests[0] || null,
          latestAnalysis: cell.analyses[0] || null,
          latestScore: cell.analyses[0]?.score ?? null,
          classification: cell.analyses[0]?.classification ?? null,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateCell(req: Request, res: Response, next: NextFunction) {
    try {
      const cellId = req.params.cellId as string;
      const cell = await prisma.cell.findUnique({ where: { cellId } });
      if (!cell) {
        throw new AppError(`Cell ${cellId} was not found.`, 404, 'CELL_NOT_FOUND');
      }

      const updated = await prisma.cell.update({
        where: { cellId },
        data: req.body,
      });

      res.json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async deleteCell(req: Request, res: Response, next: NextFunction) {
    try {
      const cellId = req.params.cellId as string;
      const cell = await prisma.cell.findUnique({ where: { cellId } });
      if (!cell) {
        throw new AppError(`Cell ${cellId} was not found.`, 404, 'CELL_NOT_FOUND');
      }

      // Soft delete: set status to ARCHIVED
      const archived = await prisma.cell.update({
        where: { cellId },
        data: { status: 'ARCHIVED' },
      });

      await LifecycleService.addEvent(cellId, 'RECYCLE', 'Cell archived from active screening pool.');

      res.json({
        success: true,
        data: {
          cellId: archived.cellId,
          status: archived.status,
          message: 'Cell successfully archived.',
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
