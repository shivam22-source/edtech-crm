import { render } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { appRoutes } from '../src/routes';

export type Handler = (url: URL, init: RequestInit) => Response | Promise<Response> | undefined;

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export function stubFetch(handler: Handler) {
  const mock = vi.fn(async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    return handler(url, init) ?? json(404, { error: { code: 'NOT_FOUND', message: 'Not found.' } });
  });
  vi.stubGlobal('fetch', mock);
  return mock;
}

export function renderApp(path: string) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

export const sampleRow = {
  id: '11111111-1111-4111-8111-111111111111',
  userType: 'parent',
  category: 'admission',
  name: 'Asha Verma',
  email: 'asha@example.com',
  phone: '9876543210',
  message: 'Please share the admission dates.',
  status: 'new',
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
};
