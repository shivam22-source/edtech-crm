import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

/** Recreates the public schema in the test database from schema.sql before the suites run. */
export default async function setup(): Promise<void> {
  const url = process.env.TEST_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/crm_test';
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query('drop schema public cascade; create schema public;');
    await client.query(readFileSync(fileURLToPath(new URL('../../schema.sql', import.meta.url)), 'utf8'));
  } finally {
    await client.end();
  }
}
