import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Input } from '@/components/forms/Input';
import { Button } from '@/components/common/Button';
import { Alert } from '@/components/common/Alert';
import { AuthPageLayout } from '@/components/layout/MarketplacePageChrome';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/utils/errors';

export function RegisterPage() {
  const { register, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    whatsapp: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/account" replace />;
  }

  function updateField(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(form);
      navigate('/account', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to create account'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthPageLayout
      title="Create account"
      subtitle="Register to track orders and manage deliveries."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-shield-red hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error ? <Alert tone="error">{error}</Alert> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="First name"
            name="firstName"
            autoComplete="given-name"
            required
            value={form.firstName}
            onChange={updateField('firstName')}
          />
          <Input
            label="Last name"
            name="lastName"
            autoComplete="family-name"
            required
            value={form.lastName}
            onChange={updateField('lastName')}
          />
        </div>
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={updateField('email')}
        />
        <Input
          label="Phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          value={form.phone}
          onChange={updateField('phone')}
          hint="Optional — recommended for delivery updates"
        />
        <Input
          label="WhatsApp"
          name="whatsapp"
          type="tel"
          value={form.whatsapp}
          onChange={updateField('whatsapp')}
          hint="Optional"
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={form.password}
          onChange={updateField('password')}
          hint="At least 8 characters"
        />

        <Button type="submit" fullWidth loading={submitting}>
          Create account
        </Button>
      </form>
    </AuthPageLayout>
  );
}
