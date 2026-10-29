import { Router } from 'express';
import type pg from 'pg';

export function healthRouter(pool: pg.Pool): Router {
  const router = Router();
  router.get('/', async (_req, res) => {
    try {
      await pool.query('select 1');
      res.status(200).json({ status: 'ok' });
    } catch {
      res.status(503).json({ status: 'unavailable' });
    }
  });
  return router;
}
