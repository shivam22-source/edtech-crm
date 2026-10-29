import { Router, type RequestHandler } from 'express';
import type pg from 'pg';
import type { Config } from '../config.js';
import { AppError } from '../errors.js';
import { signToken } from '../lib/jwt.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { parseOrThrow } from '../middleware/validate.js';
import { loginSchema } from '../schemas/inquiry.js';

const INVALID_LOGIN = 'Email or password is incorrect.';

export function authRouter(
  pool: pg.Pool,
  config: Pick<Config, 'JWT_SECRET' | 'JWT_EXPIRES_IN' | 'BCRYPT_COST'>,
  loginLimiter: RequestHandler,
  requireAdmin: RequestHandler,
): Router {
  const router = Router();
  // Compared against when the email is unknown so response time does not reveal which emails exist.
  const dummyHash = hashPassword('dummy-password-for-timing', config.BCRYPT_COST);

  router.post('/login', loginLimiter, async (req, res) => {
    const { email, password } = parseOrThrow(loginSchema, req.body);
    const result = await pool.query<{ id: string; password_hash: string }>(
      'select id, password_hash from admins where lower(email) = lower($1)',
      [email],
    );
    const admin = result.rows[0];
    const valid = await verifyPassword(password, admin ? admin.password_hash : await dummyHash);
    if (!admin || !valid) throw new AppError(401, 'UNAUTHORIZED', INVALID_LOGIN);
    res.json(signToken(admin.id, config.JWT_SECRET, config.JWT_EXPIRES_IN));
  });

  router.get('/me', requireAdmin, async (req, res) => {
    const result = await pool.query<{ email: string }>('select email from admins where id = $1', [req.adminId]);
    const admin = result.rows[0];
    if (!admin) throw new AppError(401, 'UNAUTHORIZED', 'Your session is not valid. Sign in again.');
    res.json({ email: admin.email });
  });

  return router;
}
