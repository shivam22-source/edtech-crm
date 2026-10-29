import type pg from 'pg';
import { buildSearchTerms } from '../lib/search.js';
import type { ListQuery } from '../schemas/inquiry.js';

export interface InquiryDto {
  id: string;
  userType: string;
  category: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface InquiryRow {
  id: string;
  user_type: string;
  category: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

const COLUMNS = 'id, user_type, category, name, email, phone, message, status, created_at, updated_at';

function toDto(row: InquiryRow): InquiryDto {
  return {
    id: row.id,
    userType: row.user_type,
    category: row.category,
    name: row.name,
    email: row.email,
    phone: row.phone,
    message: row.message,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/** Builds the where clause. Column names are fixed strings; every value is a parameter. */
export function buildWhere(query: Pick<ListQuery, 'category' | 'userType' | 'q'>): { clause: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (query.category) {
    params.push(query.category);
    conditions.push(`category = $${params.length}`);
  }
  if (query.userType) {
    params.push(query.userType);
    conditions.push(`user_type = $${params.length}`);
  }
  const terms = query.q ? buildSearchTerms(query.q) : null;
  if (terms) {
    params.push(terms.namePattern);
    let search = `name ilike $${params.length}`;
    if (terms.phonePattern) {
      params.push(terms.phonePattern);
      search += ` or phone like $${params.length}`;
    }
    conditions.push(`(${search})`);
  }

  return { clause: conditions.length > 0 ? `where ${conditions.join(' and ')}` : '', params };
}

export async function listInquiries(pool: pg.Pool, query: ListQuery) {
  const { clause, params } = buildWhere(query);
  const offset = (query.page - 1) * query.limit;

  const [rows, count] = await Promise.all([
    pool.query<InquiryRow>(
      `select ${COLUMNS} from inquiries ${clause}
       order by created_at desc, id desc
       limit $${params.length + 1} offset $${params.length + 2}`,
      [...params, query.limit, offset],
    ),
    pool.query<{ total: string }>(`select count(*) as total from inquiries ${clause}`, params),
  ]);

  return {
    data: rows.rows.map(toDto),
    page: query.page,
    limit: query.limit,
    total: Number(count.rows[0]!.total),
  };
}

export async function updateInquiryStatus(pool: pg.Pool, id: string, status: string): Promise<InquiryDto | null> {
  const result = await pool.query<InquiryRow>(
    `update inquiries set status = $1, updated_at = now() where id = $2 returning ${COLUMNS}`,
    [status, id],
  );
  const row = result.rows[0];
  return row ? toDto(row) : null;
}
