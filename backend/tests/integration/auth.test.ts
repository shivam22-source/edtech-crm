import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { signToken } from '../../src/lib/jwt.js';
import { ADMIN_EMAIL, ADMIN_PASSWORD, createTestContext, insertAdmin, resetTables } from '../helpers.js';

const ctx = createTestContext();
let adminId = '';

beforeAll(() => resetTables(ctx.pool));
beforeEach(async () => {
  await resetTables(ctx.pool);
  adminId = await insertAdmin(ctx.pool, ctx.config);
});
afterAll(() => ctx.pool.end());

describe('POST /api/auth/login', () => {
  it('returns a token on success', async () => {
    const res = await request(ctx.app).post('/api/auth/login').send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(new Date(res.body.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('matches the email case-insensitively', async () => {
    const res = await request(ctx.app).post('/api/auth/login').send({ email: 'ADMIN@example.com', password: ADMIN_PASSWORD });
    expect(res.status).toBe(200);
  });

  it('gives the same status and message for a wrong password and an unknown email', async () => {
    const wrong = await request(ctx.app).post('/api/auth/login').send({ email: ADMIN_EMAIL, password: 'wrong-password' });
    const unknown = await request(ctx.app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'wrong-password' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
  });

  it('returns 400 when fields are missing', async () => {
    const res = await request(ctx.app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.error.fields)).toEqual(expect.arrayContaining(['email', 'password']));
  });

  it('returns 429 over the login rate limit', async () => {
    const limited = createTestContext({ RATE_LIMIT_LOGIN_MAX: 2 });
    const statuses: number[] = [];
    for (let i = 0; i < 3; i += 1) {
      statuses.push((await request(limited.app).post('/api/auth/login').send({ email: ADMIN_EMAIL, password: 'bad' })).status);
    }
    expect(statuses).toEqual([401, 401, 429]);
    await limited.pool.end();
  });
});

describe('GET /api/auth/me', () => {
  it('returns the admin email with a valid token', async () => {
    const { token } = signToken(adminId, ctx.config.JWT_SECRET, '1h');
    const res = await request(ctx.app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ email: ADMIN_EMAIL });
  });

  it('returns 401 without a token', async () => {
    const res = await request(ctx.app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 when the admin no longer exists', async () => {
    await ctx.pool.query('delete from admins');
    const { token } = signToken(adminId, ctx.config.JWT_SECRET, '1h');
    const res = await request(ctx.app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });
});
