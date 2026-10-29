import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { ApiError, fetchMe } from '../lib/api';
import { clearToken, getToken } from '../lib/auth';

type State = 'checking' | 'allowed' | 'denied' | 'error';

export function ProtectedRoute() {
  const hasToken = getToken() !== null;
  const [state, setState] = useState<State>(hasToken ? 'checking' : 'denied');

  useEffect(() => {
    if (!hasToken) return;
    let active = true;
    fetchMe().then(
      () => active && setState('allowed'),
      (error: unknown) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401) {
          clearToken();
          setState('denied');
        } else {
          setState('error');
        }
      },
    );
    return () => {
      active = false;
    };
  }, [hasToken]);

  if (state === 'denied') return <Navigate to="/login" replace />;
  if (state === 'checking') return <p className="page-note">Checking your session.</p>;
  if (state === 'error') return <p className="page-note" role="alert">Could not check your session. Reload the page to try again.</p>;
  return <Outlet />;
}
