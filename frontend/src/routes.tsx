import type { RouteObject } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardPage } from './pages/DashboardPage';
import { InquiryPage } from './pages/InquiryPage';
import { LoginPage } from './pages/LoginPage';

export const appRoutes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { path: '/', element: <InquiryPage /> },
      { path: '/login', element: <LoginPage /> },
      { element: <ProtectedRoute />, children: [{ path: '/admin', element: <DashboardPage /> }] },
      { path: '*', element: <p className="page-note">This page does not exist.</p> },
    ],
  },
];
