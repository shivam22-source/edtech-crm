import { randomUUID } from 'node:crypto';
import { Router, type RequestHandler } from 'express';
import type pg from 'pg';
import { parseOrThrow } from '../middleware/validate.js';
import { createInquirySchema } from '../schemas/inquiry.js';
import { createInquiry } from '../services/inquiryService.js';

export function inquiriesRouter(pool: pg.Pool, limiter: RequestHandler): Router {
  const router = Router();
  router.post('/', limiter, async (req, res) => {
    const body: unknown = req.body;
    const honeypot = typeof body === 'object' && body !== null ? (body as Record<string, unknown>).website : undefined;
    if (typeof honeypot === 'string' && honeypot !== '') {
      res.status(201).json({ id: randomUUID() });
      return;
    }
    const input = parseOrThrow(createInquirySchema, body);
    const id = await createInquiry(pool, input);
    res.status(201).json({ id });
  });
  return router;
}
