import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { ENV } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { HealthController } from './controllers/healthController';

// Route imports
import cellRoutes from './routes/cellRoutes';
import testRoutes from './routes/testRoutes';
import analysisRoutes from './routes/analysisRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import passportRoutes from './routes/passportRoutes';
import mockRoutes from './routes/mockRoutes';
import deviceRoutes from './routes/deviceRoutes';
import aiRoutes from './routes/aiRoutes';

export function createApp(): Application {
  const app = express();

  // Security and standard middlewares
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, ESP32)
        if (!origin) return callback(null, true);
        // Allow configured origin and local networks
        if (
          origin === ENV.CORS_ORIGIN ||
          origin.startsWith('http://localhost') ||
          origin.startsWith('http://127.0.0.1') ||
          origin.startsWith('http://192.168.') ||
          origin.startsWith('http://10.')
        ) {
          return callback(null, true);
        }
        return callback(null, true); // Permissive in dev/prototype mode
      },
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Id'],
    })
  );

  app.use(express.json({ limit: '10mb' }));
  if (ENV.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Health check endpoint
  app.get('/api/health', HealthController.getHealth);

  // Mount API routes under /api
  app.use('/api/cells', cellRoutes);
  app.use('/api/tests', testRoutes);
  app.use('/api/analysis', analysisRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/passport', passportRoutes);
  app.use('/api/mock', mockRoutes);
  app.use('/api/device', deviceRoutes);
  app.use('/api/ai', aiRoutes);

  // 404 handler for undefined API routes
  app.use('/api/*', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `Endpoint ${req.method} ${req.originalUrl} not found.`,
      },
    });
  });

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
}
