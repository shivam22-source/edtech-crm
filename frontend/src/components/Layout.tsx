import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { clearToken, getToken } from '../lib/auth';

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const signedIn = getToken() !== null;

  function signOut() {
    clearToken();
    navigate('/login');
  }

  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <Link to="/" className="site-name">
            Inquiries
          </Link>
          <nav aria-label="Main">
            <Link to="/" aria-current={location.pathname === '/' ? 'page' : undefined}>
              Inquiry form
            </Link>
            {signedIn ? (
              <>
                <Link to="/admin" aria-current={location.pathname === '/admin' ? 'page' : undefined}>
                  Dashboard
                </Link>
                <button type="button" className="link-button" onClick={signOut}>
                  Sign out
                </button>
              </>
            ) : (
              <Link to="/login" aria-current={location.pathname === '/login' ? 'page' : undefined}>
                Staff sign in
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}
