import 'dotenv/config';
import pg from 'pg';
import { CATEGORIES, STATUSES, USER_TYPES } from '../src/schemas/inquiry.js';

const count = Number(process.argv[2] ?? 100);
const url = process.env.DATABASE_URL;
if (!url || !Number.isInteger(count) || count < 1) {
  console.error('Usage: npm run db:seed-demo -- <row count>, with DATABASE_URL set.');
  process.exit(1);
}

const FIRST = ['Asha', 'Rohan', 'Meera', 'Kabir', 'Anika', 'Vihaan', 'Isha', 'Arjun', 'Diya', 'Neel', 'Tara', 'Dev', 'Sana', 'Karan', 'Riya'];
const LAST = ['Sharma', 'Verma', 'Iyer', 'Nair', 'Gupta', 'Singh', 'Mehta', 'Rao', 'Das', 'Khan', 'Patel', 'Joshi'];
const MESSAGES: Record<(typeof CATEGORIES)[number], string[]> = {
  scholarship: ['What documents are needed to apply for the merit scholarship this year?', 'Is the scholarship open to students who joined mid-year?'],
  concert: ['How many tickets can one family book for the annual concert?', 'Can our school choir take part in the annual concert?'],
  admission: ['Please share the admission dates and the fee structure for next year.', 'Is there a seat available in grade 6 for the coming session?'],
  general_query: ['Please send the contact number of the front office and its timings.', 'Where can I find the academic calendar for this term?'],
};

const pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)]!;

const client = new pg.Client({ connectionString: url });
try {
  await client.connect();
  const batchSize = 1000;
  for (let start = 0; start < count; start += batchSize) {
    const size = Math.min(batchSize, count - start);
    const values: unknown[] = [];
    const rows: string[] = [];
    for (let i = 0; i < size; i += 1) {
      const category = pick(CATEGORIES);
      const first = pick(FIRST);
      const last = pick(LAST);
      const phone = `9${Math.floor(Math.random() * 1e9).toString().padStart(9, '0')}`;
      const createdAt = new Date(Date.now() - Math.floor(Math.random() * 90 * 24 * 3600 * 1000));
      const base = values.length;
      values.push(
        pick(USER_TYPES),
        category,
        `${first} ${last}`,
        `${first}.${last}${start + i}@example.com`.toLowerCase(),
        phone,
        pick(MESSAGES[category]),
        pick(STATUSES),
        createdAt,
      );
      rows.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 8})`);
    }
    await client.query(
      `insert into inquiries (user_type, category, name, email, phone, message, status, created_at, updated_at)
       values ${rows.join(', ')}`,
      values,
    );
  }
  console.log(`Inserted ${count} demo inquiries.`);
} catch (error) {
  console.error(`seed-demo failed: ${(error as Error).message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
