import { randomUUID } from 'node:crypto';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pino } from 'pino';
import { pinoHttp } from 'pino-http';
import type pg from 'pg';
import type { Config } from './config.js';
import { requireAdmin } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { createRateLimiter } from './middleware/rateLimit.js';
import { adminInquiriesRouter } from './routes/adminInquiries.js';
import { authRouter } from './routes/auth.js';
import { healthRouter } from './routes/health.js';
import { inquiriesRouter } from './routes/inquiries.js';

export function createApp(config: Config, pool: pg.Pool): Express {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  const logger = pino({ level: config.LOG_LEVEL });
  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const incoming = req.headers['x-request-id'];
        const id = typeof incoming === 'string' && incoming.length <= 100 ? incoming : randomUUID();
        res.setHeader('X-Request-Id', id);
        return id;
      },
    }),
  );
  app.use(helmet());
  app.use(cors({ origin: config.FRONTEND_ORIGIN, methods: ['GET', 'POST', 'PATCH'] }));
  app.use(express.json({ limit: '10kb' }));

  const submitLimiter = createRateLimiter(config.RATE_LIMIT_WINDOW_MS, config.RATE_LIMIT_SUBMIT_MAX);
  const loginLimiter = createRateLimiter(config.RATE_LIMIT_WINDOW_MS, config.RATE_LIMIT_LOGIN_MAX);
  const adminGuard = requireAdmin(config.JWT_SECRET);

  app.use('/api/health', healthRouter(pool));
  app.use('/api/inquiries', inquiriesRouter(pool, submitLimiter));
  app.use('/api/auth', authRouter(pool, config, loginLimiter, adminGuard));
  app.use('/api/admin/inquiries', adminInquiriesRouter(pool, adminGuard));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
