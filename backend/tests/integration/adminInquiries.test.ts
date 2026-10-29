import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { signToken } from '../../src/lib/jwt.js';
import { createTestContext, insertAdmin, insertInquiry, resetTables } from '../helpers.js';

const ctx = createTestContext();
let auth = '';

beforeAll(async () => {
  await resetTables(ctx.pool);
  const adminId = await insertAdmin(ctx.pool, ctx.config);
  auth = `Bearer ${signToken(adminId, ctx.config.JWT_SECRET, '1h').token}`;
});
beforeEach(() => ctx.pool.query('truncate table inquiries'));
afterAll(() => ctx.pool.end());

const list = (query = '') => request(ctx.app).get(`/api/admin/inquiries${query}`).set('Authorization', auth);

async function seedMix() {
  await insertInquiry(ctx.pool, { name: 'Asha Verma', user_type: 'parent', category: 'admission', phone: '9876543210' });
  await insertInquiry(ctx.pool, { name: 'Rohan Iyer', user_type: 'student', category: 'scholarship', phone: '9123456780' });
  await insertInquiry(ctx.pool, { name: 'Greenfield School', user_type: 'school', category: 'concert', phone: '+912212345678' });
  await insertInquiry(ctx.pool, { name: '100% Sure_Name', user_type: 'parent', category: 'general_query', phone: '9000000001' });
}

describe('authentication', () => {
  it('returns 401 for no token, a bad token and an expired token on both routes', async () => {
    const expired = jwt.sign({}, ctx.config.JWT_SECRET, { algorithm: 'HS256', subject: 'x', expiresIn: -10 });
    const headers = [undefined, 'Bearer garbage', `Bearer ${expired}`];
    for (const header of headers) {
      const get = request(ctx.app).get('/api/admin/inquiries');
      const patch = request(ctx.app).patch('/api/admin/inquiries/00000000-0000-4000-8000-000000000000').send({ status: 'new' });
      if (header) {
        get.set('Authorization', header);
        patch.set('Authorization', header);
      }
      expect((await get).status).toBe(401);
      expect((await patch).status).toBe(401);
    }
  });
});

describe('GET /api/admin/inquiries filters', () => {
  beforeEach(seedMix);

  it('lists newest first with paging fields', async () => {
    const res = await list();
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ page: 1, limit: 20, total: 4 });
    const dates = res.body.data.map((row: { createdAt: string }) => row.createdAt);
    expect([...dates].sort().reverse()).toEqual(dates);
    expect(res.body.data[0]).toHaveProperty('userType');
  });

  it('filters by category', async () => {
    const res = await list('?category=concert');
    expect(res.body.data.map((r: { name: string }) => r.name)).toEqual(['Greenfield School']);
  });

  it('filters by user type', async () => {
    const res = await list('?userType=parent');
    expect(res.body.total).toBe(2);
  });

  it('combines category and user type', async () => {
    const res = await list('?userType=parent&category=admission');
    expect(res.body.data.map((r: { name: string }) => r.name)).toEqual(['Asha Verma']);
  });

  it('searches names partially and case-insensitively', async () => {
    const res = await list('?q=ROHAN');
    expect(res.body.data.map((r: { name: string }) => r.name)).toEqual(['Rohan Iyer']);
  });

  it('searches phones typed with spaces and dashes', async () => {
    const res = await list(`?q=${encodeURIComponent('98765 43-210')}`);
    expect(res.body.data.map((r: { name: string }) => r.name)).toEqual(['Asha Verma']);
  });

  it('does not match every row for a query with fewer than 3 digits', async () => {
    const res = await list('?q=9');
    expect(res.body.total).toBe(0);
  });

  it('combines search with filters', async () => {
    const res = await list('?q=school&userType=school');
    expect(res.body.data.map((r: { name: string }) => r.name)).toEqual(['Greenfield School']);
  });

  it('treats % and _ literally', async () => {
    const percent = await list(`?q=${encodeURIComponent('%')}`);
    expect(percent.body.data.map((r: { name: string }) => r.name)).toEqual(['100% Sure_Name']);
    const underscore = await list(`?q=${encodeURIComponent('_')}`);
    expect(underscore.body.data.map((r: { name: string }) => r.name)).toEqual(['100% Sure_Name']);
  });

  it('handles quotes and injection strings without a 500', async () => {
    for (const q of ["'", "x' or '1'='1", "'; drop table inquiries; --", '\\']) {
      const res = await list(`?q=${encodeURIComponent(q)}`);
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(0);
    }
    for (const bad of ["category=x' or '1'='1", "userType=1; drop table inquiries"]) {
      const res = await list(`?${encodeURIComponent(bad.split('=')[0]!)}=${encodeURIComponent(bad.split('=').slice(1).join('='))}`);
      expect(res.status).toBe(400);
    }
    expect((await list()).body.total).toBe(4);
  });
});

describe('GET /api/admin/inquiries pagination', () => {
  beforeEach(async () => {
    for (let i = 0; i < 5; i += 1) await insertInquiry(ctx.pool, { name: `Person ${i}` });
  });

  it('returns the first and last pages', async () => {
    const first = await list('?limit=2&page=1');
    expect(first.body.data).toHaveLength(2);
    const last = await list('?limit=2&page=3');
    expect(last.body.data).toHaveLength(1);
    expect(last.body.total).toBe(5);
  });

  it('returns an empty page beyond the end', async () => {
    const res = await list('?limit=2&page=10');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.total).toBe(5);
  });

  it.each(['limit=0', 'limit=101', 'limit=abc', 'page=0', 'page=-1', 'page=x'])('rejects %s with 400', async (query) => {
    const res = await list(`?${query}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('accepts limit 100', async () => {
    expect((await list('?limit=100')).status).toBe(200);
  });
});

describe('PATCH /api/admin/inquiries/:id', () => {
  const patch = (id: string, body: unknown) =>
    request(ctx.app).patch(`/api/admin/inquiries/${id}`).set('Authorization', auth).send(body as object);

  it('changes the status and updated_at', async () => {
    const id = await insertInquiry(ctx.pool);
    const before = await ctx.pool.query('select updated_at from inquiries where id = $1', [id]);
    await new Promise((resolve) => setTimeout(resolve, 20));
    const res = await patch(id, { status: 'resolved' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('resolved');
    const after = await ctx.pool.query('select status, updated_at from inquiries where id = $1', [id]);
    expect(after.rows[0].status).toBe('resolved');
    expect(after.rows[0].updated_at.getTime()).toBeGreaterThan(before.rows[0].updated_at.getTime());
  });

  it('rejects a bad status with 400', async () => {
    const id = await insertInquiry(ctx.pool);
    const res = await patch(id, { status: 'done' });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.status).toBeDefined();
  });

  it('returns 404 for an unknown id', async () => {
    const res = await patch('00000000-0000-4000-8000-000000000000', { status: 'new' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 for a malformed uuid', async () => {
    const res = await patch('not-a-uuid', { status: 'new' });
    expect(res.status).toBe(400);
  });
});
