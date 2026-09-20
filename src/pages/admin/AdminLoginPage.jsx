import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/utils/errors';
import { isStaffUser } from '@/utils/permissions';

/**
 * Separate staff/admin sign-in.
 */
export function AdminLoginPage() {
  const { adminLogin, isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/admin';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isLoading && isAuthenticated && isStaffUser(user)) {
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await adminLogin({ identifier, password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to sign in to admin'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-deep-black px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 20% 20%, rgba(196,30,30,0.35), transparent 55%), radial-gradient(ellipse 60% 40% at 90% 80%, rgba(212,160,23,0.2), transparent 50%)',
        }}
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-lg border border-white/10 bg-charcoal/95 p-6 text-off-white shadow-soft backdrop-blur sm:p-8">
        <div className="flex items-center gap-3">
          <img src="/logo.jpeg" alt="" className="size-12 rounded-md object-cover" width={48} height={48} />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-gold">
              Staff access
            </p>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Shield Wolf Admin</h1>
          </div>
        </div>
        <p className="mt-4 text-sm text-off-white/70">
          Sign in with your staff email to manage catalog, orders, payments, and delivery.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
          {error ? (
            <div
              className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-[#fca5a5]"
              role="alert"
            >
              {error}
            </div>
          ) : null}

          <div>
            <label htmlFor="admin-identifier" className="mb-1.5 block text-sm font-medium">
              Email or phone
            </label>
            <input
              id="admin-identifier"
              name="identifier"
              autoComplete="username"
              required
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              className="block w-full rounded-md border border-white/15 bg-deep-black px-3 py-2.5 text-sm text-off-white placeholder:text-off-white/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold"
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="mb-1.5 block text-sm font-medium">
              Password
            </label>
            <input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="block w-full rounded-md border border-white/15 bg-deep-black px-3 py-2.5 text-sm text-off-white placeholder:text-off-white/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold"
            />
          </div>

          <Button type="submit" fullWidth variant="accent" loading={submitting}>
            Sign in to admin
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-off-white/60">
          Customer account?{' '}
          <Link to="/login" className="text-brand-gold underline-offset-2 hover:underline">
            Storefront sign-in
          </Link>
        </p>
      </div>
    </div>
  );
}
