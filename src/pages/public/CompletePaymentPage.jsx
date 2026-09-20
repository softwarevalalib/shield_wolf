import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { Alert } from '@/components/common/Alert';
import { Input } from '@/components/forms/Input';
import { PaymentSubmitForm } from '@/components/payments/PaymentSubmitForm';
import { ContentPageLayout } from '@/components/layout/MarketplacePageChrome';
import { apiClient } from '@/services/apiClient';
import { getErrorMessage } from '@/utils/errors';

function formatMoney(amount, currency = 'LRD') {
  if (amount == null) return '—';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      currencyDisplay: 'symbol',
    }).format(Number(amount));
  } catch {
    return `${currency} ${Number(amount).toFixed(2)}`;
  }
}

/**
 * Public page to complete Mobile Money payment for an order.
 */
export function CompletePaymentPage() {
  const [params] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(params.get('order') || '');
  const [phone, setPhone] = useState(params.get('phone') || '');
  const [lookupError, setLookupError] = useState('');
  const [lookup, setLookup] = useState(null);
  const [looking, setLooking] = useState(false);

  const prefilled = useMemo(() => Boolean(params.get('order')), [params]);

  async function handleLookup(event) {
    event.preventDefault();
    setLookupError('');
    setLooking(true);
    setLookup(null);
    try {
      const payload = await apiClient.post('/payments/lookup', {
        orderNumber: orderNumber.trim(),
        phone: phone.trim(),
      });
      setLookup(payload.data);
    } catch (err) {
      setLookupError(getErrorMessage(err, 'Unable to find payment for that order'));
    } finally {
      setLooking(false);
    }
  }

  const payment = lookup?.payment;
  const order = lookup?.order;
  const alreadyPaid = payment?.status === 'paid';
  const isCod = payment?.method === 'cod' && payment?.status === 'pending';

  return (
    <ContentPageLayout
      title="Complete payment"
      subtitle="Submit your Mobile Money reference for verification. Never share your PIN or OTP."
      breadcrumbItems={[
        { label: 'Home', to: '/' },
        { label: 'Complete payment' },
      ]}
    >
      <form
        onSubmit={handleLookup}
        className="space-y-4 rounded-md border border-border bg-surface p-5 sm:p-6"
      >
        {lookupError ? <Alert tone="error">{lookupError}</Alert> : null}
        {prefilled && !lookup ? (
          <Alert tone="info">
            Order number filled from confirmation. Enter your phone to continue.
          </Alert>
        ) : null}
        <Input
          label="Order number"
          required
          value={orderNumber}
          onChange={(event) => setOrderNumber(event.target.value)}
          placeholder="SW-2026-000001"
        />
        <Input
          label="Phone number"
          type="tel"
          required
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
        <Button type="submit" variant="accent" loading={looking}>
          Find payment
        </Button>
      </form>

      {lookup ? (
        <section className="mt-6 space-y-6 rounded-md border border-border bg-surface p-5 sm:p-6">
          <div className="text-sm">
            <p className="font-medium text-charcoal">{order.orderNumber}</p>
            <p className="text-muted">
              Total {formatMoney(order.total, order.currency)} · Order status{' '}
              <span className="capitalize">{order.status.replaceAll('_', ' ')}</span>
            </p>
            {payment ? (
              <p className="mt-1 text-muted">
                Payment:{' '}
                <span className="capitalize">
                  {(payment.method || '').replaceAll('_', ' ')} ·{' '}
                  {payment.status.replaceAll('_', ' ')}
                </span>
              </p>
            ) : null}
          </div>

          {alreadyPaid ? (
            <Alert tone="success" title="Payment confirmed">
              This order is already marked paid.{' '}
              <Link
                to={`/track-order?order=${encodeURIComponent(order.orderNumber)}`}
                className="underline"
              >
                Track order
              </Link>
            </Alert>
          ) : null}

          {isCod ? (
            <Alert tone="info" title="Cash on Delivery">
              No online payment is required. Pay the rider on delivery, or switch to MoMo below if
              you prefer to pay now.
            </Alert>
          ) : null}

          {!alreadyPaid ? (
            <PaymentSubmitForm
              orderNumber={order.orderNumber}
              phone={phone}
              requirePhone
              lockedOrder
              onSuccess={setLookup}
            />
          ) : null}
        </section>
      ) : null}
    </ContentPageLayout>
  );
}
