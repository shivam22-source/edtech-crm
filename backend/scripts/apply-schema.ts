import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

// schema.sql is not idempotent: running it twice fails with "already exists" and changes nothing.
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const sql = readFileSync(fileURLToPath(new URL('../../schema.sql', import.meta.url)), 'utf8');
const client = new pg.Client({ connectionString: url });

try {
  await client.connect();
  await client.query(sql);
  console.log('schema.sql applied.');
} catch (error) {
  console.error(`schema.sql failed: ${(error as Error).message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
