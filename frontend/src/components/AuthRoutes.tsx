import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import { SessionLoading } from './SessionLoading';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <SessionLoading />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

export function GuestRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <SessionLoading />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}
