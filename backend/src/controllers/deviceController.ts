import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';

export class DeviceController {
  public static async receiveDeviceData(req: Request, res: Response, next: NextFunction) {
    try {
      const { deviceId, cellId, testId, elapsedSeconds, voltage, current, temperature, loadEnabled } = req.body;

      // Verify cell and test
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
        },
      });

      res.status(201).json({
        success: true,
        data: {
          received: true,
          deviceId: deviceId || 'REVOLTCELL-ESP32-001',
          testId,
          measurementId: measurement.id,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
