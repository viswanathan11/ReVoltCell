import { Request, Response, NextFunction } from 'express';
import { AiService } from '../services/ai/aiService';
import { AiRateLimiter } from '../services/ai/rateLimiter';
import { AppError } from '../middleware/errorHandler';

export class AiController {
  /**
   * POST /api/ai/tests/:testId/chat
   * Chat about a specific battery test session or cell report.
   */
  public static async chatAboutTest(req: Request, res: Response, next: NextFunction) {
    try {
      const testId = req.params.testId as string;
      if (!testId || testId.trim() === '') {
        throw new AppError('Test ID is required.', 400, 'INVALID_TEST_ID');
      }

      // Check rate limits per client IP / session
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
      const rateCheck = AiRateLimiter.checkLimit(clientIp);

      if (!rateCheck.allowed) {
        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `VoltIQ message limit reached. Please wait ${Math.ceil(rateCheck.resetMs / 1000)}s before trying again.`,
          },
        });
        return;
      }

      const result = await AiService.chatAboutReport({
        identifier: testId,
        body: req.body,
        clientIp,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/ai/passport/:cellId/chat
   * Dedicated QR passport chat entry point.
   */
  public static async chatAboutPassport(req: Request, res: Response, next: NextFunction) {
    try {
      const cellId = req.params.cellId as string;
      if (!cellId || cellId.trim() === '') {
        throw new AppError('Cell ID is required.', 400, 'INVALID_CELL_ID');
      }

      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
      const rateCheck = AiRateLimiter.checkLimit(clientIp);

      if (!rateCheck.allowed) {
        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `VoltIQ message limit reached. Please wait ${Math.ceil(rateCheck.resetMs / 1000)}s before trying again.`,
          },
        });
        return;
      }

      // Force mode to 'passport' for public passport route
      const body = {
        ...req.body,
        mode: 'passport' as const,
      };

      const result = await AiService.chatAboutReport({
        identifier: cellId,
        body,
        clientIp,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}
