import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config.js';
import { signToken, verifyToken } from '../../src/lib/jwt.js';
import { hashPassword, verifyPassword } from '../../src/lib/password.js';
import { normalizeEmail, normalizePhone } from '../../src/lib/phone.js';
import { buildSearchTerms, escapeLike } from '../../src/lib/search.js';
import { buildWhere } from '../../src/services/adminInquiryService.js';

const SECRET = 'unit-test-secret-unit-test-secret-1234';

describe('normalizePhone', () => {
  it.each([
    ['+91 98765-43210', '+919876543210'],
    ['(022) 2345 6789', '02223456789'],
    ['987.654.3210', '9876543210'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });
});

describe('normalizeEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  Name@Example.COM ')).toBe('name@example.com');
  });
});

describe('search', () => {
  it('escapes LIKE wildcards and backslash', () => {
    expect(escapeLike('50%_off\\')).toBe('50\\%\\_off\\\\');
  });

  it('returns null for an empty query', () => {
    expect(buildSearchTerms('   ')).toBeNull();
  });

  it('adds a phone pattern only with 3 or more digits', () => {
    expect(buildSearchTerms('ann')?.phonePattern).toBeNull();
    expect(buildSearchTerms('a1b2')?.phonePattern).toBeNull();
    expect(buildSearchTerms('98 76')?.phonePattern).toBe('%9876%');
  });
});

describe('buildWhere', () => {
  it('uses numbered parameters and no raw values', () => {
    const { clause, params } = buildWhere({ category: 'concert', userType: 'school', q: "x' or 1=1 --" });
    expect(clause).toBe('where category = $1 and user_type = $2 and (name ilike $3)');
    expect(clause).not.toContain('1=1');
    expect(params).toEqual(['concert', 'school', "%x' or 1=1 --%"]);
  });

  it('returns an empty clause without filters', () => {
    expect(buildWhere({})).toEqual({ clause: '', params: [] });
  });
});

describe('password', () => {
  it('verifies the right password and rejects a wrong one', async () => {
    const hash = await hashPassword('right-password-123', 4);
    expect(await verifyPassword('right-password-123', hash)).toBe(true);
    expect(await verifyPassword('wrong-password-123', hash)).toBe(false);
  });
});

describe('jwt', () => {
  it('signs and verifies', () => {
    const { token, expiresAt } = signToken('admin-1', SECRET, '2h');
    expect(verifyToken(token, SECRET)?.sub).toBe('admin-1');
    expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('rejects an expired token', () => {
    const token = jwt.sign({}, SECRET, { algorithm: 'HS256', subject: 'a', expiresIn: -10 });
    expect(verifyToken(token, SECRET)).toBeNull();
  });

  it('rejects a token signed with another secret', () => {
    const { token } = signToken('a', 'another-secret-another-secret-123456', '2h');
    expect(verifyToken(token, SECRET)).toBeNull();
  });

  it('rejects alg none', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ sub: 'a', exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url');
    expect(verifyToken(`${header}.${body}.`, SECRET)).toBeNull();
  });

  it('rejects another HMAC algorithm', () => {
    const token = jwt.sign({}, SECRET, { algorithm: 'HS512', subject: 'a', expiresIn: '1h' });
    expect(verifyToken(token, SECRET)).toBeNull();
  });
});

describe('loadConfig', () => {
  const base = { DATABASE_URL: 'postgres://x', JWT_SECRET: SECRET, FRONTEND_ORIGIN: 'http://localhost:5173' };

  it('applies defaults', () => {
    const config = loadConfig(base);
    expect(config.PORT).toBe(4000);
    expect(config.BCRYPT_COST).toBe(12);
    expect(config.JWT_EXPIRES_IN).toBe('2h');
  });

  it('refuses a short JWT secret', () => {
    expect(() => loadConfig({ ...base, JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/);
  });
});
