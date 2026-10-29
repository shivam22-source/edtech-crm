import jwt from 'jsonwebtoken';
import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../../src/errors.js';
import { signToken } from '../../src/lib/jwt.js';
import { requireAdmin } from '../../src/middleware/auth.js';

const SECRET = 'middleware-secret-middleware-secret-12';

function run(authorization?: string) {
  const req = { headers: authorization === undefined ? {} : { authorization } } as never;
  const next = vi.fn();
  requireAdmin(SECRET)(req, {} as never, next);
  const arg = next.mock.calls[0]?.[0];
  return { req: req as { adminId?: string }, error: arg as AppError | undefined };
}

describe('requireAdmin', () => {
  it('rejects a missing header', () => {
    expect(run().error?.status).toBe(401);
  });

  it('rejects a wrong scheme', () => {
    const { token } = signToken('a', SECRET, '1h');
    expect(run(`Basic ${token}`).error?.status).toBe(401);
  });

  it('rejects a malformed token', () => {
    expect(run('Bearer not-a-token').error?.status).toBe(401);
  });

  it('rejects a token signed with another secret', () => {
    const { token } = signToken('a', 'other-secret-other-secret-other-1234', '1h');
    expect(run(`Bearer ${token}`).error?.status).toBe(401);
  });

  it('rejects an expired token', () => {
    const token = jwt.sign({}, SECRET, { algorithm: 'HS256', subject: 'a', expiresIn: -5 });
    expect(run(`Bearer ${token}`).error?.status).toBe(401);
  });

  it('rejects a token with alg none', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ sub: 'a' })).toString('base64url');
    expect(run(`Bearer ${header}.${body}.`).error?.status).toBe(401);
  });

  it('accepts a valid token and sets adminId', () => {
    const { token } = signToken('admin-42', SECRET, '1h');
    const { req, error } = run(`Bearer ${token}`);
    expect(error).toBeUndefined();
    expect(req.adminId).toBe('admin-42');
  });
});
