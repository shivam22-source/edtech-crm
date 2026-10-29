import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../errors.js';

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new AppError(404, 'NOT_FOUND', 'Route not found.'));
};

interface HttpLikeError {
  status?: number;
  type?: string;
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, ...(err.fields ? { fields: err.fields } : {}) },
    });
    return;
  }

  const http = err as HttpLikeError;
  if (http.type === 'entity.too.large') {
    res.status(413).json({ error: { code: 'VALIDATION_ERROR', message: 'Request body is too large.' } });
    return;
  }
  if (http.type === 'entity.parse.failed' || http.type === 'encoding.unsupported') {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Request body is not valid JSON.' } });
    return;
  }

  req.log?.error({ err }, 'unhandled error');
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong. Try again later.' } });
};
