import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { realtimeService } from '../services/realtimeService';
import { TestController } from './testController';

export class DeviceController {
  public static async receiveDeviceData(req: Request, res: Response, next: NextFunction) {
    try {
      const { deviceId, cellId, testId, elapsedSeconds, voltage, current, temperature, loadEnabled, timestamp } = req.body;

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
          timestamp: timestamp ? new Date(timestamp) : new Date(),
        },
      });

      // Push real-time instantaneous event to connected browser dashboards
      realtimeService.emitTestEvent(testId, {
        type: 'MEASUREMENT',
        data: measurement,
      });

      res.status(201).json({
        success: true,
        data: {
          received: true,
          deviceId: deviceId || 'REVOLTCELL-ESP32-001',
          testId,
          cellId,
          measurementId: measurement.id,
          elapsedSeconds: measurement.elapsedSeconds,
          voltage: measurement.voltage,
          current: measurement.current,
          temperature: measurement.temperature,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async completeDeviceTest(req: Request, res: Response, next: NextFunction) {
    try {
      const { deviceId, testId, cellId, stopReason, testDurationSeconds } = req.body;
      req.params.testId = testId;
      req.body = {
        stopReason: stopReason || 'COMPLETED',
        testDurationSeconds,
      };

      await TestController.completeTest(req, res, next);
    } catch (err) {
      next(err);
    }
  }
}
