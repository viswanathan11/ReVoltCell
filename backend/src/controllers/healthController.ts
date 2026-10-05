import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export class HealthController {
  public static async getHealth(req: Request, res: Response) {
    try {
      // Test database connectivity
      await prisma.$queryRaw`SELECT 1`;
      res.json({
        success: true,
        status: 'OK',
        service: 'ReVoltCell Backend',
        database: 'CONNECTED',
      });
    } catch (err: any) {
      res.status(503).json({
        success: false,
        status: 'ERROR',
        service: 'ReVoltCell Backend',
        database: 'DISCONNECTED',
        error: err.message,
      });
    }
  }
}
