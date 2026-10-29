import { describe, expect, it } from 'vitest';
import { createInquirySchema, listQuerySchema, updateStatusSchema } from '../../src/schemas/inquiry.js';
import { validInquiry } from '../helpers.js';

const valid = { ...validInquiry };

describe('createInquirySchema', () => {
  it('accepts a valid body and normalizes values', () => {
    const result = createInquirySchema.parse(valid);
    expect(result.email).toBe('asha.verma@example.com');
    expect(result.phone).toBe('+919876543210');
  });

  it('drops unknown fields', () => {
    const result = createInquirySchema.parse({ ...valid, status: 'resolved', extra: 1 });
    expect(result).not.toHaveProperty('status');
    expect(result).not.toHaveProperty('extra');
  });

  const cases: Array<[string, Record<string, unknown>, boolean]> = [
    ['name 1 char', { name: 'A' }, false],
    ['name 2 chars', { name: 'Al' }, true],
    ['name 100 chars', { name: 'a'.repeat(100) }, true],
    ['name 101 chars', { name: 'a'.repeat(101) }, false],
    ['message 9 chars', { message: '123456789' }, false],
    ['message 10 chars', { message: '1234567890' }, true],
    ['message 2000 chars', { message: 'a'.repeat(2000) }, true],
    ['message 2001 chars', { message: 'a'.repeat(2001) }, false],
    ['phone 6 digits', { phone: '123456' }, false],
    ['phone 7 digits', { phone: '1234567' }, true],
    ['phone 15 digits', { phone: '123456789012345' }, true],
    ['phone 16 digits', { phone: '1234567890123456' }, false],
    ['phone with letters', { phone: '98765abcde' }, false],
    ['email without at', { email: 'nope.example.com' }, false],
    ['email without domain dot', { email: 'a@b' }, false],
    ['bad user type', { userType: 'teacher' }, false],
    ['bad category', { category: 'sports' }, false],
    ['empty user type', { userType: '' }, false],
  ];

  it.each(cases)('%s', (_label, override, ok) => {
    expect(createInquirySchema.safeParse({ ...valid, ...override }).success).toBe(ok);
  });

  it('reports every missing field', () => {
    const result = createInquirySchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const keys = new Set(result.error.issues.map((issue) => issue.path[0]));
      expect(keys).toEqual(new Set(['userType', 'category', 'name', 'email', 'phone', 'message']));
    }
  });
});

describe('listQuerySchema', () => {
  it('applies defaults', () => {
    expect(listQuerySchema.parse({})).toMatchObject({ page: 1, limit: 20 });
  });

  it.each([['0'], ['101'], ['abc'], ['1.5'], ['']])('rejects limit %s', (limit) => {
    expect(listQuerySchema.safeParse({ limit }).success).toBe(false);
  });

  it('rejects page 0', () => {
    expect(listQuerySchema.safeParse({ page: '0' }).success).toBe(false);
  });
});

describe('updateStatusSchema', () => {
  it('accepts a known status only', () => {
    expect(updateStatusSchema.safeParse({ status: 'resolved' }).success).toBe(true);
    expect(updateStatusSchema.safeParse({ status: 'done' }).success).toBe(false);
  });

  it('rejects extra fields', () => {
    expect(updateStatusSchema.safeParse({ status: 'new', name: 'x' }).success).toBe(false);
  });
});
