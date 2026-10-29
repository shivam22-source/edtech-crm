import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CATEGORIES, STATUSES, USER_TYPES } from '../src/lib/constants';

// Tests run with the frontend folder as the working directory.
const schema = readFileSync(resolve(process.cwd(), '../schema.sql'), 'utf8');

function checkValues(column: string): string[] {
  const match = new RegExp(`${column} text[^\\n]*check \\(${column} in \\(([^)]*)\\)\\)`).exec(schema);
  if (!match) throw new Error(`No check constraint found for ${column}`);
  return [...match[1]!.matchAll(/'([^']+)'/g)].map((m) => m[1]!);
}

describe('constants match schema.sql', () => {
  it('user types', () => expect(USER_TYPES.map((o) => o.value)).toEqual(checkValues('user_type')));
  it('categories', () => expect(CATEGORIES.map((o) => o.value)).toEqual(checkValues('category')));
  it('statuses', () => expect(STATUSES.map((o) => o.value)).toEqual(checkValues('status')));
});
