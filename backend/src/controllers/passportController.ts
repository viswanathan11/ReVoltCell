import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import { PassportService } from '../services/passportService';

export class PassportController {
  public static async getPassport(req: Request, res: Response, next: NextFunction) {
    try {
      const cellId = req.params.cellId as string;
      const passportData = await PassportService.getPassportData(cellId);

      if (!passportData) {
        throw new AppError(`Cell ${cellId} was not found.`, 404, 'CELL_NOT_FOUND');
      }

      res.json({
        success: true,
        data: passportData,
      });
    } catch (err) {
      next(err);
    }
  }
}
