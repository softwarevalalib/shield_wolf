import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { Button } from '@/components/common/Button';
import { Alert } from '@/components/common/Alert';
import { Input } from '@/components/forms/Input';
import { Textarea } from '@/components/forms/Textarea';
import { Select } from '@/components/forms/Select';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Skeleton } from '@/components/common/Skeleton';
import {
  CheckoutSteps,
  MarketplacePageBanner,
} from '@/components/layout/MarketplacePageChrome';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
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

function createIdempotencyKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `chk_${crypto.randomUUID()}`;
  }
  return `chk_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { items, itemCount, quote, quoteLoading, clearCart } = useCart();
  const idempotencyKey = useRef(createIdempotencyKey());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const zonesQuery = useQuery({
    queryKey: ['delivery-zones'],
    queryFn: async () => {
      const payload = await apiClient.get('/delivery-zones');
      return payload.data?.zones || [];
    },
  });

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    whatsapp: '',
    email: '',
    zoneId: '',
    county: '',
    city: 'Monrovia',
    community: '',
    streetLandmark: '',
    deliveryInstructions: '',
    paymentMethod: 'cod',
    paymentReference: '',
    paymentNote: '',
  });

  useEffect(() => {
    if (!user) return;
    setForm((current) => ({
      ...current,
      firstName: user.customerProfile?.firstName || current.firstName,
      lastName: user.customerProfile?.lastName || current.lastName,
      phone: user.phone || current.phone,
      whatsapp: user.customerProfile?.whatsapp || current.whatsapp,
      email: user.email || current.email,
    }));
  }, [user]);

  const selectedZone = useMemo(
    () => (zonesQuery.data || []).find((zone) => zone.id === form.zoneId) || null,
    [zonesQuery.data, form.zoneId]
  );

  const subtotal = quote?.summary?.subtotal ?? 0;
  const discountAmount = quote?.summary?.discountAmount ?? 0;
  const taxAmount = quote?.summary?.taxAmount ?? 0;
  const currency = quote?.currency || 'LRD';

  const deliveryFee = useMemo(() => {
    if (!selectedZone) return null;
    if (
      selectedZone.minimumFreeDeliveryAmount != null &&
      subtotal >= selectedZone.minimumFreeDeliveryAmount
    ) {
      return 0;
    }
    return selectedZone.deliveryFee;
  }, [selectedZone, subtotal]);

  const estimatedTotal = useMemo(() => {
    if (deliveryFee == null) return subtotal - discountAmount + taxAmount;
    return subtotal - discountAmount + deliveryFee + taxAmount;
  }, [subtotal, discountAmount, deliveryFee, taxAmount]);

  function updateField(field) {
    return (event) => {
      const value = event.target.value;
      setForm((current) => {
        const next = { ...current, [field]: value };
        if (field === 'zoneId') {
          const zone = (zonesQuery.data || []).find((item) => item.id === value);
          if (zone?.county) next.county = zone.county;
        }
        return next;
      });
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setFieldErrors({});
    setSubmitting(true);

    try {
      const payload = {
        items: items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        customer: {
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          whatsapp: form.whatsapp,
          email: form.email,
          paymentReference: form.paymentReference,
          paymentNote: form.paymentNote,
        },
        delivery: {
          zoneId: form.zoneId,
          county: form.county,
          city: form.city,
          community: form.community,
          streetLandmark: form.streetLandmark,
          deliveryInstructions: form.deliveryInstructions,
        },
        paymentMethod: form.paymentMethod,
        idempotencyKey: idempotencyKey.current,
      };

      const result = await apiClient.post('/checkout', payload, {
        idempotencyKey: idempotencyKey.current,
      });

      clearCart();
      navigate(`/order-success?order=${encodeURIComponent(result.data.order.orderNumber)}`, {
        replace: true,
      });
    } catch (err) {
      const details = err?.details;
      if (Array.isArray(details)) {
        const mapped = {};
        details.forEach((detail) => {
          if (detail.path) mapped[detail.path] = detail.message;
        });
        setFieldErrors(mapped);
      }
      setError(getErrorMessage(err, 'Unable to place order'));
      // New key only for non-idempotent failures (validation); keep key on network retry
      if (err?.status && err.status >= 500) {
        // keep same key for safe retry
      } else if (err?.code === 'INSUFFICIENT_STOCK' || err?.code === 'NO_AVAILABLE_ITEMS') {
        idempotencyKey.current = createIdempotencyKey();
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (itemCount === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Breadcrumb
          className="mb-6"
          items={[
            { label: 'Home', to: '/' },
            { label: 'Cart', to: '/cart' },
            { label: 'Checkout' },
          ]}
        />
        <EmptyState
          title="Your cart is empty"
          description="Add products before checking out."
          action={
            <Link
              to="/shop"
              className="inline-flex rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white"
            >
              Browse shop
            </Link>
          }
        />
      </div>
    );
  }

  const momoSelected = form.paymentMethod === 'mtn_momo' || form.paymentMethod === 'orange_money';

  return (
    <div className="bg-off-white">
      <MarketplacePageBanner
        title="Checkout"
        subtitle={
          isAuthenticated
            ? 'Review your details and place your order.'
            : 'Guest checkout is available — no account required.'
        }
      />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <Breadcrumb
          className="mb-4"
          items={[{ label: 'Home', to: '/' }, { label: 'Cart', to: '/cart' }, { label: 'Checkout' }]}
        />
        <CheckoutSteps current="checkout" />

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-5">
            {error ? <Alert tone="error">{error}</Alert> : null}

            <section className="space-y-4 rounded-md border border-border bg-surface p-5">
              <h2 className="font-display text-lg font-semibold text-charcoal">
                Contact information
              </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="First name"
                required
                value={form.firstName}
                onChange={updateField('firstName')}
                error={fieldErrors['customer.firstName']}
              />
              <Input
                label="Last name"
                required
                value={form.lastName}
                onChange={updateField('lastName')}
                error={fieldErrors['customer.lastName']}
              />
            </div>
            <Input
              label="Phone"
              type="tel"
              required
              value={form.phone}
              onChange={updateField('phone')}
              error={fieldErrors['customer.phone']}
            />
            <Input
              label="WhatsApp"
              type="tel"
              value={form.whatsapp}
              onChange={updateField('whatsapp')}
              hint="Optional"
            />
            <Input
              label="Email"
              type="email"
              required
              value={form.email}
              onChange={updateField('email')}
              error={fieldErrors['customer.email']}
            />
          </section>

          <section className="space-y-4 rounded-md border border-border bg-surface p-5">
            <h2 className="font-display text-lg font-semibold text-charcoal">Delivery</h2>
            {zonesQuery.isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select
                label="Delivery zone"
                required
                value={form.zoneId}
                onChange={updateField('zoneId')}
                error={fieldErrors['delivery.zoneId']}
                options={[
                  { value: '', label: 'Select a delivery zone' },
                  ...(zonesQuery.data || []).map((zone) => ({
                    value: zone.id,
                    label: `${zone.name} — ${formatMoney(zone.deliveryFee, currency)}`,
                  })),
                ]}
              />
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="County"
                required
                value={form.county}
                onChange={updateField('county')}
                error={fieldErrors['delivery.county']}
              />
              <Input
                label="City"
                required
                value={form.city}
                onChange={updateField('city')}
                error={fieldErrors['delivery.city']}
              />
            </div>
            <Input
              label="Community"
              required
              value={form.community}
              onChange={updateField('community')}
              error={fieldErrors['delivery.community']}
            />
            <Input
              label="Street / landmark"
              required
              value={form.streetLandmark}
              onChange={updateField('streetLandmark')}
              error={fieldErrors['delivery.streetLandmark']}
              hint="Describe the location clearly for the rider"
            />
            <Textarea
              label="Delivery instructions"
              value={form.deliveryInstructions}
              onChange={updateField('deliveryInstructions')}
              rows={3}
            />
            {selectedZone?.estimatedTime ? (
              <p className="text-sm text-muted">Estimated time: {selectedZone.estimatedTime}</p>
            ) : null}
          </section>

          <section className="space-y-4 rounded-md border border-border bg-surface p-5">
            <h2 className="font-display text-lg font-semibold text-charcoal">Payment method</h2>
            <Select
              label="Payment"
              required
              value={form.paymentMethod}
              onChange={updateField('paymentMethod')}
              options={[
                { value: 'cod', label: 'Cash on Delivery' },
                { value: 'mtn_momo', label: 'MTN MoMo' },
                { value: 'orange_money', label: 'Orange Money' },
              ]}
            />
            {momoSelected ? (
              <>
                <Input
                  label="Payment reference"
                  value={form.paymentReference}
                  onChange={updateField('paymentReference')}
                  hint="Optional — add your MoMo reference if you already paid"
                />
                <Textarea
                  label="Payment note"
                  value={form.paymentNote}
                  onChange={updateField('paymentNote')}
                  rows={2}
                  hint="Manual verification may be required before fulfillment"
                />
              </>
            ) : null}
          </section>
        </div>

        <aside className="h-fit rounded-md border border-border bg-surface p-5 lg:sticky lg:top-28">
          <h2 className="font-display text-lg font-semibold text-charcoal">Order summary</h2>
          {quoteLoading && !quote ? (
            <div className="mt-4 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : (
            <ul className="mt-4 space-y-3 text-sm">
              {(quote?.lines || [])
                .filter((line) => line.available)
                .map((line) => (
                  <li
                    key={`${line.productId}:${line.variantId || 'base'}`}
                    className="flex justify-between gap-3"
                  >
                    <span className="text-muted">
                      {line.name} × {line.quantity}
                    </span>
                    <span className="font-medium text-charcoal">
                      {formatMoney(line.lineTotal, currency)}
                    </span>
                  </li>
                ))}
            </ul>
          )}

          <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Subtotal</dt>
              <dd className="font-medium">{formatMoney(subtotal, currency)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Discount</dt>
              <dd className="font-medium">{formatMoney(discountAmount, currency)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Delivery</dt>
              <dd className="font-medium">
                {deliveryFee == null ? 'Select zone' : formatMoney(deliveryFee, currency)}
              </dd>
            </div>
            {quote?.summary?.taxEnabled ? (
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Tax</dt>
                <dd className="font-medium">{formatMoney(taxAmount, currency)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-3 border-t border-border pt-3 text-base">
              <dt className="font-semibold">Total</dt>
              <dd className="font-semibold text-shield-red">
                {formatMoney(estimatedTotal, currency)}
              </dd>
            </div>
          </dl>

          <p className="mt-3 text-xs text-muted">
            Final totals are recalculated on the server when you place the order.
          </p>

          <Button type="submit" variant="accent" fullWidth className="mt-6" loading={submitting}>
            Place order
          </Button>
          <Link
            to="/cart"
            className="mt-3 inline-flex w-full items-center justify-center text-sm text-muted hover:text-charcoal"
          >
            Return to cart
          </Link>
        </aside>
      </form>
      </div>
    </div>
  );
}
