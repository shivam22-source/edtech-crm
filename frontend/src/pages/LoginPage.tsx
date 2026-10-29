import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Field, describedBy } from '../components/Field';
import { ApiError, login } from '../lib/api';
import { setToken } from '../lib/auth';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState('');
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (sending) return;
    const found: { email?: string; password?: string } = {};
    if (email.trim() === '') found.email = 'Enter your email address.';
    if (password === '') found.password = 'Enter your password.';
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length > 0) return;

    setSending(true);
    try {
      const result = await login(email.trim(), password);
      setToken(result.token);
      navigate('/admin', { replace: true });
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Something went wrong. Try again later.');
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="page narrow" aria-labelledby="login-heading">
      <h1 id="login-heading">Staff sign in</h1>
      <form onSubmit={submit} noValidate>
        <Field id="login-email" label="Email" error={errors.email}>
          <input
            {...describedBy('login-email', errors.email)}
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field id="login-password" label="Password" error={errors.password}>
          <input
            {...describedBy('login-password', errors.password)}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {formError ? (
          <p className="form-error" role="alert">
            {formError}
          </p>
        ) : null}
        <button type="submit" className="button" disabled={sending}>
          Sign in
        </button>
      </form>
    </section>
  );
}
