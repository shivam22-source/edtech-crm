import { Router, type RequestHandler } from 'express';
import type pg from 'pg';
import { AppError } from '../errors.js';
import { parseOrThrow } from '../middleware/validate.js';
import { idParamsSchema, listQuerySchema, updateStatusSchema } from '../schemas/inquiry.js';
import { listInquiries, updateInquiryStatus } from '../services/adminInquiryService.js';

export function adminInquiriesRouter(pool: pg.Pool, requireAdmin: RequestHandler): Router {
  const router = Router();
  router.use(requireAdmin);

  router.get('/', async (req, res) => {
    const query = parseOrThrow(listQuerySchema, req.query);
    res.json(await listInquiries(pool, query));
  });

  router.patch('/:id', async (req, res) => {
    const { id } = parseOrThrow(idParamsSchema, req.params);
    const { status } = parseOrThrow(updateStatusSchema, req.body);
    const updated = await updateInquiryStatus(pool, id, status);
    if (!updated) throw new AppError(404, 'NOT_FOUND', 'Inquiry not found.');
    res.json(updated);
  });

  return router;
}
