import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { setToken } from '../src/lib/auth';
import { setUnauthorizedHandler } from '../src/lib/api';
import { json, renderApp, sampleRow, stubFetch, type Handler } from './helpers';

const okHandler: Handler = (url) => {
  if (url.pathname === '/api/auth/me') return json(200, { email: 'admin@example.com' });
  if (url.pathname === '/api/admin/inquiries') return json(200, { data: [sampleRow], page: 1, limit: 20, total: 1 });
  return undefined;
};

const listCalls = (mock: ReturnType<typeof stubFetch>) =>
  mock.mock.calls.map((call) => new URL(String(call[0]))).filter((url) => url.pathname === '/api/admin/inquiries');

describe('login', () => {
  it('redirects an unauthenticated visit to the login page', async () => {
    stubFetch(okHandler);
    renderApp('/admin');
    expect(await screen.findByRole('heading', { name: 'Staff sign in' })).toBeInTheDocument();
  });

  it('shows the error for a wrong password', async () => {
    stubFetch((url) =>
      url.pathname === '/api/auth/login' ? json(401, { error: { code: 'UNAUTHORIZED', message: 'Email or password is incorrect.' } }) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/login');
    await user.type(screen.getByLabelText('Email'), 'admin@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect.');
  });

  it('stores the token and opens the dashboard on success', async () => {
    stubFetch((url) =>
      url.pathname === '/api/auth/login' ? json(200, { token: 't', expiresAt: '2030-01-01T00:00:00Z' }) : okHandler(url, {}),
    );
    const user = userEvent.setup();
    renderApp('/login');
    await user.type(screen.getByLabelText('Email'), 'admin@example.com');
    await user.type(screen.getByLabelText('Password'), 'right-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(sessionStorage.getItem('crm_token')).toBe('t');
  });
});

describe('dashboard', () => {
  it('renders the table with the required columns', async () => {
    setToken('t');
    stubFetch(okHandler);
    renderApp('/admin');
    const table = await screen.findByRole('table');
    for (const heading of ['Name', 'Phone', 'Email', 'User Type', 'Category', 'Date', 'Status']) {
      expect(within(table).getByRole('columnheader', { name: heading })).toBeInTheDocument();
    }
    expect(within(table).getByText('Asha Verma')).toBeInTheDocument();
  });

  it('sends the filter in the query and keeps it in the URL', async () => {
    setToken('t');
    const mock = stubFetch(okHandler);
    const user = userEvent.setup();
    const router = renderApp('/admin');
    await screen.findByRole('table');
    await user.selectOptions(screen.getByLabelText('Category'), 'concert');
    await waitFor(() => expect(listCalls(mock).at(-1)!.searchParams.get('category')).toBe('concert'));
    expect(router.state.location.search).toContain('category=concert');
  });

  it('restores filters from the URL', async () => {
    setToken('t');
    const mock = stubFetch(okHandler);
    renderApp('/admin?userType=school&page=2');
    await screen.findByRole('table');
    const first = listCalls(mock)[0]!;
    expect(first.searchParams.get('userType')).toBe('school');
    expect(first.searchParams.get('page')).toBe('2');
  });

  it('sends one search request after the pause', async () => {
    setToken('t');
    const mock = stubFetch(okHandler);
    const user = userEvent.setup();
    renderApp('/admin');
    await screen.findByRole('table');
    expect(listCalls(mock)).toHaveLength(1);
    await user.type(screen.getByLabelText('Search by name or phone'), 'ashaa');
    expect(listCalls(mock)).toHaveLength(1);
    await waitFor(() => expect(listCalls(mock)).toHaveLength(2), { timeout: 2000 });
    expect(listCalls(mock)[1]!.searchParams.get('q')).toBe('ashaa');
  });

  it('shows the empty state', async () => {
    setToken('t');
    stubFetch((url) =>
      url.pathname === '/api/admin/inquiries' ? json(200, { data: [], page: 1, limit: 20, total: 0 }) : okHandler(url, {}),
    );
    renderApp('/admin');
    expect(await screen.findByText('No inquiries match these filters.')).toBeInTheDocument();
  });

  it('shows the error state', async () => {
    setToken('t');
    stubFetch((url) =>
      url.pathname === '/api/admin/inquiries' ? json(500, { error: { code: 'INTERNAL', message: 'Something went wrong. Try again later.' } }) : okHandler(url, {}),
    );
    renderApp('/admin');
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
  });

  it('changes status with a PATCH and updates the row', async () => {
    setToken('t');
    const mock = stubFetch((url, init) => {
      if (init.method === 'PATCH') return json(200, { ...sampleRow, status: 'resolved' });
      return okHandler(url, init);
    });
    const user = userEvent.setup();
    renderApp('/admin');
    const select = await screen.findByLabelText('Status for Asha Verma');
    await user.selectOptions(select, 'resolved');
    await waitFor(() => expect(select).toHaveValue('resolved'));
    const patch = mock.mock.calls.find((call) => (call[1] as RequestInit).method === 'PATCH')!;
    expect(String(patch[0])).toContain(`/api/admin/inquiries/${sampleRow.id}`);
    expect(JSON.parse((patch[1] as RequestInit).body as string)).toEqual({ status: 'resolved' });
  });

  it('shows an error when saving the status fails and keeps the old value', async () => {
    setToken('t');
    stubFetch((url, init) => {
      if (init.method === 'PATCH') return json(500, { error: { code: 'INTERNAL', message: 'Could not save.' } });
      return okHandler(url, init);
    });
    const user = userEvent.setup();
    renderApp('/admin');
    const select = await screen.findByLabelText('Status for Asha Verma');
    await user.selectOptions(select, 'resolved');
    expect(await screen.findByText('Could not save.')).toBeInTheDocument();
    expect(select).toHaveValue('new');
  });

  it('sends the user to login when the token has expired', async () => {
    setToken('expired');
    stubFetch((url) =>
      url.pathname === '/api/auth/me' ? json(401, { error: { code: 'UNAUTHORIZED', message: 'Your session is not valid. Sign in again.' } }) : undefined,
    );
    renderApp('/admin');
    expect(await screen.findByRole('heading', { name: 'Staff sign in' })).toBeInTheDocument();
    expect(sessionStorage.getItem('crm_token')).toBeNull();
  });

  it('goes to login when a later request returns 401', async () => {
    setToken('t');
    stubFetch((url) =>
      url.pathname === '/api/admin/inquiries'
        ? json(401, { error: { code: 'UNAUTHORIZED', message: 'Your session is not valid. Sign in again.' } })
        : okHandler(url, {}),
    );
    const router = renderApp('/admin');
    setUnauthorizedHandler(() => void router.navigate('/login', { replace: true }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    setUnauthorizedHandler(null);
  });

  it('signs out', async () => {
    setToken('t');
    stubFetch(okHandler);
    const user = userEvent.setup();
    renderApp('/admin');
    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('heading', { name: 'Staff sign in' })).toBeInTheDocument();
    expect(sessionStorage.getItem('crm_token')).toBeNull();
  });
});
