import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, resetTables, validInquiry } from '../helpers.js';

const ctx = createTestContext();

beforeEach(() => resetTables(ctx.pool));
afterAll(() => ctx.pool.end());

describe('GET /api/health', () => {
  it('returns 200 when the database answers', async () => {
    const res = await request(ctx.app).get('/api/health');
    expect(res.status).toBe(200);
  });

  it('returns 503 when the pool is closed', async () => {
    const closed = createTestContext();
    await closed.pool.end();
    const res = await request(closed.app).get('/api/health');
    expect(res.status).toBe(503);
  });
});

describe('POST /api/inquiries', () => {
  it('creates a row with normalized values', async () => {
    const res = await request(ctx.app).post('/api/inquiries').send(validInquiry);
    expect(res.status).toBe(201);
    const rows = await ctx.pool.query('select * from inquiries where id = $1', [res.body.id]);
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0]).toMatchObject({
      email: 'asha.verma@example.com',
      phone: '+919876543210',
      status: 'new',
      user_type: 'parent',
      category: 'admission',
    });
  });

  it.each(['userType', 'category', 'name', 'email', 'phone', 'message'])('names the field when %s is missing', async (field) => {
    const body: Record<string, unknown> = { ...validInquiry };
    delete body[field];
    const res = await request(ctx.app).post('/api/inquiries').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(res.body.error.fields)).toContain(field);
  });

  it('rejects a bad phone with a clear message', async () => {
    const res = await request(ctx.app).post('/api/inquiries').send({ ...validInquiry, phone: '123' });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.phone).toBe('Enter a phone number with 7 to 15 digits.');
  });

  it('returns 201 and stores nothing when the honeypot is filled', async () => {
    const res = await request(ctx.app).post('/api/inquiries').send({ ...validInquiry, website: 'http://spam.example' });
    expect(res.status).toBe(201);
    const count = await ctx.pool.query('select count(*)::int as n from inquiries');
    expect(count.rows[0].n).toBe(0);
  });

  it('returns 413 for an oversized body', async () => {
    const res = await request(ctx.app)
      .post('/api/inquiries')
      .send({ ...validInquiry, message: 'a'.repeat(20000) });
    expect(res.status).toBe(413);
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await request(ctx.app).post('/api/inquiries').set('Content-Type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
  });

  it('does not store unknown fields', async () => {
    const res = await request(ctx.app)
      .post('/api/inquiries')
      .send({ ...validInquiry, status: 'resolved', id: '00000000-0000-0000-0000-000000000000' });
    expect(res.status).toBe(201);
    const row = await ctx.pool.query('select id, status from inquiries');
    expect(row.rows[0].status).toBe('new');
    expect(row.rows[0].id).not.toBe('00000000-0000-0000-0000-000000000000');
  });

  it('returns 429 over the rate limit', async () => {
    const limited = createTestContext({ RATE_LIMIT_SUBMIT_MAX: 2 });
    const statuses: number[] = [];
    for (let i = 0; i < 3; i += 1) {
      statuses.push((await request(limited.app).post('/api/inquiries').send(validInquiry)).status);
    }
    expect(statuses).toEqual([201, 201, 429]);
    await limited.pool.end();
  });

  it('returns 404 in the error format for unknown routes', async () => {
    const res = await request(ctx.app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('sends helmet headers and no stack traces', async () => {
    const res = await request(ctx.app).post('/api/inquiries').send({});
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toMatch(/at .*\.(ts|js)/);
  });
});
