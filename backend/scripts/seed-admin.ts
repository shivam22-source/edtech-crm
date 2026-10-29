import 'dotenv/config';
import pg from 'pg';
import { hashPassword } from '../src/lib/password.js';

const url = process.env.DATABASE_URL;
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const cost = Number(process.env.BCRYPT_COST ?? 12);

if (!url || !email || !password) {
  console.error('DATABASE_URL, ADMIN_EMAIL and ADMIN_PASSWORD must be set.');
  process.exit(1);
}
if (password.length < 12) {
  console.error('ADMIN_PASSWORD must have at least 12 characters.');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
try {
  await client.connect();
  const hash = await hashPassword(password, cost);
  const result = await client.query(
    `insert into admins (email, password_hash) values ($1, $2)
     on conflict (lower(email)) do update set password_hash = excluded.password_hash`,
    [email, hash],
  );
  console.log(`Admin ${email} ready (${result.rowCount} row written).`);
} catch (error) {
  console.error(`seed-admin failed: ${(error as Error).message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
