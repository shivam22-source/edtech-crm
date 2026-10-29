import pg from 'pg';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { insertInquiry, testConfig } from '../helpers.js';

const pool = new pg.Pool({ connectionString: testConfig().DATABASE_URL, max: 2 });

beforeEach(async () => {
  await pool.query('truncate table inquiries, admins');
});
afterAll(async () => {
  await pool.end();
});

const base = {
  user_type: 'parent',
  category: 'admission',
  name: 'Asha Verma',
  email: 'a@example.com',
  phone: '9876543210',
  message: 'A message that is long enough.',
};

describe('inquiries constraints', () => {
  const bad: Array<[string, Record<string, unknown>]> = [
    ['user_type', { user_type: 'teacher' }],
    ['category', { category: 'sports' }],
    ['status', { status: 'done' }],
    ['phone format', { phone: '12ab567' }],
    ['phone too short', { phone: '123456' }],
    ['name too short', { name: 'A' }],
    ['name too long', { name: 'a'.repeat(101) }],
    ['message too short', { message: 'short' }],
    ['message too long', { message: 'a'.repeat(2001) }],
    ['email too long', { email: `${'a'.repeat(250)}@x.com` }],
  ];

  it.each(bad)('rejects bad %s', async (_label, override) => {
    await expect(insertInquiry(pool, override)).rejects.toThrow(/violates check constraint/);
  });

  it('applies defaults', async () => {
    const result = await pool.query(
      `insert into inquiries (user_type, category, name, email, phone, message)
       values ($1,$2,$3,$4,$5,$6) returning status, created_at, updated_at, id`,
      Object.values(base),
    );
    const row = result.rows[0];
    expect(row.status).toBe('new');
    expect(row.created_at).toBeInstanceOf(Date);
    expect(row.updated_at).toBeInstanceOf(Date);
    expect(row.id).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('admins constraints', () => {
  it('rejects an email that differs only by case', async () => {
    await pool.query("insert into admins (email, password_hash) values ('Admin@Example.com', 'h')");
    await expect(pool.query("insert into admins (email, password_hash) values ('admin@example.com', 'h')")).rejects.toThrow(
      /admins_email_key/,
    );
  });
});

describe('row level security', () => {
  it('is enabled on both tables', async () => {
    const result = await pool.query(
      "select relname, relrowsecurity from pg_class where relname in ('admins','inquiries') order by relname",
    );
    expect(result.rows).toEqual([
      { relname: 'admins', relrowsecurity: true },
      { relname: 'inquiries', relrowsecurity: true },
    ]);
  });
});
