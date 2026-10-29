import { describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest, setUnauthorizedHandler } from '../src/lib/api';
import { getToken, setToken } from '../src/lib/auth';
import { json, stubFetch } from './helpers';

describe('apiRequest', () => {
  it('attaches the token', async () => {
    setToken('abc');
    const fetchMock = stubFetch(() => json(200, { ok: true }));
    await apiRequest('/api/auth/me');
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer abc');
  });

  it('sends no Authorization header without a token', async () => {
    const fetchMock = stubFetch(() => json(200, {}));
    await apiRequest('/api/health');
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('clears the token and calls the handler on 401', async () => {
    setToken('abc');
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    stubFetch(() => json(401, { error: { code: 'UNAUTHORIZED', message: 'Sign in again.' } }));
    await expect(apiRequest('/api/auth/me')).rejects.toMatchObject({ status: 401, message: 'Sign in again.' });
    expect(getToken()).toBeNull();
    expect(handler).toHaveBeenCalledTimes(1);
    setUnauthorizedHandler(null);
  });

  it('does not call the handler for a 401 without a token (failed login)', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    stubFetch(() => json(401, { error: { code: 'UNAUTHORIZED', message: 'Email or password is incorrect.' } }));
    await expect(apiRequest('/api/auth/login', { method: 'POST', body: {} })).rejects.toBeInstanceOf(ApiError);
    expect(handler).not.toHaveBeenCalled();
    setUnauthorizedHandler(null);
  });

  it('returns a readable message on network failure', async () => {
    stubFetch(() => {
      throw new TypeError('Failed to fetch');
    });
    await expect(apiRequest('/api/health')).rejects.toMatchObject({
      status: 0,
      message: 'Could not reach the server. Check your connection and try again.',
    });
  });

  it('exposes field errors', async () => {
    stubFetch(() => json(400, { error: { code: 'VALIDATION_ERROR', message: 'Fix fields.', fields: { phone: 'Bad phone.' } } }));
    await expect(apiRequest('/x')).rejects.toMatchObject({ fields: { phone: 'Bad phone.' } });
  });
});
