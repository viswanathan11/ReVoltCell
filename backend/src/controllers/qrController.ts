import { Request, Response, NextFunction } from 'express';
import QRCode from 'qrcode';
import { prisma } from '../config/prisma';
import { ENV } from '../config/env';
import { AppError } from '../middleware/errorHandler';

export class QrController {
  public static async getCellQr(req: Request, res: Response, next: NextFunction) {
    try {
      const cellId = req.params.cellId as string;
      const cell = await prisma.cell.findUnique({ where: { cellId } });
      if (!cell) {
        throw new AppError(`Cell ${cellId} was not found.`, 404, 'CELL_NOT_FOUND');
      }

      const passportUrl = `${ENV.PASSPORT_BASE_URL}/${cell.cellId}`;
      const format = (req.query.format as string || '').toLowerCase();
      const acceptHeader = req.headers['accept'] || '';

      // Generate SVG string
      const qrSvg = await QRCode.toString(passportUrl, { type: 'svg', margin: 2, width: 256 });

      // If client requests raw SVG image
      if (format === 'svg' || format === 'image' || acceptHeader.includes('image/svg+xml')) {
        res.setHeader('Content-Type', 'image/svg+xml');
        res.send(qrSvg);
        return;
      }

      // Generate Data URL for PNG/SVG
      const qrDataUrl = await QRCode.toDataURL(passportUrl, { margin: 2, width: 256 });

      res.json({
        success: true,
        data: {
          cellId: cell.cellId,
          passportUrl,
          qrSvg,
          qrDataUrl,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
