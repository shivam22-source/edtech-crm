import type { RequestHandler } from 'express';
import { AppError } from '../errors.js';
import { verifyToken } from '../lib/jwt.js';

declare module 'express-serve-static-core' {
  interface Request {
    adminId?: string;
  }
}

export function requireAdmin(secret: string): RequestHandler {
  return (req, _res, next) => {
    const header = req.headers.authorization;
    if (!header) return next(new AppError(401, 'UNAUTHORIZED', 'Sign in to continue.'));
    const [scheme, token, ...rest] = header.split(' ');
    if (scheme !== 'Bearer' || !token || rest.length > 0) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Sign in to continue.'));
    }
    const claims = verifyToken(token, secret);
    if (!claims) return next(new AppError(401, 'UNAUTHORIZED', 'Your session is not valid. Sign in again.'));
    req.adminId = claims.sub;
    next();
  };
}
