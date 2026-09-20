import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { hasAnyPermission, hasPermission } from '@/utils/permissions';

/**
 * UI gate for a permission (or any of several). Backend still enforces.
 */
export function RequirePermission({ permission, anyOf, children, fallback = null }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="p-6 text-sm text-muted" role="status">
        Checking permissions…
      </div>
    );
  }

  const allowed = anyOf?.length
    ? hasAnyPermission(user, anyOf)
    : permission
      ? hasPermission(user, permission)
      : false;

  if (!allowed) {
    if (fallback === 'redirect') {
      return <Navigate to="/admin" replace />;
    }
    return (
      fallback || (
        <div className="rounded-md border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          You do not have permission to view this section.
        </div>
      )
    );
  }

  return children;
}
