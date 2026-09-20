import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isStaffUser } from '@/utils/permissions';

/**
 * Guards admin routes. Backend permission checks remain mandatory.
 */
export function RequireAdmin({ children }) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center text-sm text-muted"
        role="status"
      >
        Checking admin session…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  if (!isStaffUser(user)) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  return children;
}
