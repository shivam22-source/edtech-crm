import type { Express } from 'express';
import pg from 'pg';
import { createApp } from '../src/app.js';
import { loadConfig, type Config } from '../src/config.js';
import { hashPassword } from '../src/lib/password.js';

export function testConfig(overrides: Partial<Config> = {}): Config {
  return { ...loadConfig(), RATE_LIMIT_SUBMIT_MAX: 1000, RATE_LIMIT_LOGIN_MAX: 1000, ...overrides };
}

export interface TestContext {
  app: Express;
  pool: pg.Pool;
  config: Config;
}

export function createTestContext(overrides: Partial<Config> = {}): TestContext {
  const config = testConfig(overrides);
  const pool = new pg.Pool({ connectionString: config.DATABASE_URL, max: 4 });
  return { app: createApp(config, pool), pool, config };
}

export async function resetTables(pool: pg.Pool): Promise<void> {
  await pool.query('truncate table inquiries, admins');
}

export const ADMIN_EMAIL = 'admin@example.com';
export const ADMIN_PASSWORD = 'correct-horse-battery';

export async function insertAdmin(pool: pg.Pool, config: Config): Promise<string> {
  const hash = await hashPassword(ADMIN_PASSWORD, config.BCRYPT_COST);
  const result = await pool.query<{ id: string }>(
    'insert into admins (email, password_hash) values ($1, $2) returning id',
    [ADMIN_EMAIL, hash],
  );
  return result.rows[0]!.id;
}

export const validInquiry = {
  userType: 'parent',
  category: 'admission',
  name: 'Asha Verma',
  email: 'Asha.Verma@Example.com',
  phone: '+91 98765-43210',
  message: 'Please share the admission dates for next year.',
};

export async function insertInquiry(pool: pg.Pool, overrides: Record<string, unknown> = {}): Promise<string> {
  const row = { user_type: 'parent', category: 'admission', name: 'Asha Verma', email: 'a@example.com', phone: '9876543210', message: 'A message that is long enough.', status: 'new', ...overrides };
  const result = await pool.query<{ id: string }>(
    `insert into inquiries (user_type, category, name, email, phone, message, status)
     values ($1, $2, $3, $4, $5, $6, $7) returning id`,
    [row.user_type, row.category, row.name, row.email, row.phone, row.message, row.status],
  );
  return result.rows[0]!.id;
}
