import type pg from 'pg';
import type { CreateInquiryInput } from '../schemas/inquiry.js';

export async function createInquiry(pool: pg.Pool, input: CreateInquiryInput): Promise<string> {
  const result = await pool.query<{ id: string }>(
    `insert into inquiries (user_type, category, name, email, phone, message)
     values ($1, $2, $3, $4, $5, $6)
     returning id`,
    [input.userType, input.category, input.name, input.email, input.phone, input.message],
  );
  return result.rows[0]!.id;
}
