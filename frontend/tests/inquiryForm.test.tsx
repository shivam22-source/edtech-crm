import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { json, renderApp, stubFetch } from './helpers';

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText('User type'), 'parent');
  await user.selectOptions(screen.getByLabelText('Category'), 'admission');
  await user.type(screen.getByLabelText('Name'), 'Asha Verma');
  await user.type(screen.getByLabelText('Email'), 'asha@example.com');
  await user.type(screen.getByLabelText('Phone number'), '98765 43210');
  await user.type(screen.getByLabelText('Message'), 'Please share the admission dates.');
}

describe('inquiry form', () => {
  it('shows every error on an empty submit', async () => {
    const fetchMock = stubFetch(() => json(201, { id: 'x' }));
    const user = userEvent.setup();
    renderApp('/');
    await user.click(screen.getByRole('button', { name: 'Submit inquiry' }));
    expect(screen.getByText('Select a user type.')).toBeInTheDocument();
    expect(screen.getByText('Select a category.')).toBeInTheDocument();
    expect(screen.getByText('Enter a name with at least 2 characters.')).toBeInTheDocument();
    expect(screen.getByText('Enter your email address.')).toBeInTheDocument();
    expect(screen.getByText('Enter a phone number with 7 to 15 digits.')).toBeInTheDocument();
    expect(screen.getByText('Enter a message with at least 10 characters.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('links errors to fields with aria-describedby', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await user.click(screen.getByRole('button', { name: 'Submit inquiry' }));
    const phone = screen.getByLabelText('Phone number');
    expect(phone).toHaveAttribute('aria-describedby', 'phone-error');
    expect(document.getElementById('phone-error')).toHaveTextContent('Enter a phone number with 7 to 15 digits.');
  });

  it('validates on blur', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.tab();
    expect(screen.getByText('Enter an email address such as name@example.com.')).toBeInTheDocument();
  });

  it('sends the exact payload and shows a confirmation', async () => {
    const fetchMock = stubFetch(() => json(201, { id: 'abc' }));
    const user = userEvent.setup();
    renderApp('/');
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: 'Submit inquiry' }));
    expect(await screen.findByText('Inquiry received')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({
      userType: 'parent',
      category: 'admission',
      name: 'Asha Verma',
      email: 'asha@example.com',
      phone: '98765 43210',
      message: 'Please share the admission dates.',
      website: '',
    });
    await user.click(screen.getByRole('button', { name: 'Submit another inquiry' }));
    expect(screen.getByLabelText('Name')).toHaveValue('');
  });

  it('shows a server error and maps field errors', async () => {
    stubFetch(() =>
      json(400, { error: { code: 'VALIDATION_ERROR', message: 'Some fields need to be corrected.', fields: { email: 'Server says bad email.' } } }),
    );
    const user = userEvent.setup();
    renderApp('/');
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: 'Submit inquiry' }));
    expect(await screen.findByText('Server says bad email.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Some fields need to be corrected.');
  });

  it('shows a network error', async () => {
    stubFetch(() => {
      throw new TypeError('Failed to fetch');
    });
    const user = userEvent.setup();
    renderApp('/');
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: 'Submit inquiry' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the server');
  });

  it('sends one request on a double click', async () => {
    const fetchMock = stubFetch(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return json(201, { id: 'abc' });
    });
    const user = userEvent.setup();
    renderApp('/');
    await fillValid(user);
    const button = screen.getByRole('button', { name: 'Submit inquiry' });
    await user.dblClick(button);
    await waitFor(() => expect(screen.getByText('Inquiry received')).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the honeypot out of the tab order and assistive tech', () => {
    renderApp('/');
    const trap = document.getElementById('website')!;
    expect(trap).toHaveAttribute('tabindex', '-1');
    expect(trap.closest('[aria-hidden="true"]')).not.toBeNull();
  });
});
