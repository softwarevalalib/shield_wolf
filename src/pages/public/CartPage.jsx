import { Link } from 'react-router-dom';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/common/Skeleton';
import { QuantitySelector } from '@/components/products/QuantitySelector';
import { PriceDisplay } from '@/components/products/PriceDisplay';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import {
  CheckoutSteps,
  MarketplacePageBanner,
} from '@/components/layout/MarketplacePageChrome';
import { useCart } from '@/hooks/useCart';
import { useNotification } from '@/contexts/NotificationContext';
import { useState } from 'react';

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

export function CartPage() {
  const {
    items,
    itemCount,
    updateQuantity,
    removeItem,
    clearCart,
    quote,
    quoteLoading,
    quoteError,
    refetchQuote,
  } = useCart();
  const { success } = useNotification();
  const [confirmClear, setConfirmClear] = useState(false);

  const currency = quote?.currency || 'LRD';
  const summary = quote?.summary;
  const quoteLines = quote?.lines || [];

  // Prefer server-priced lines; fall back to local display while quoting.
  const rows =
    quoteLines.length > 0
      ? quoteLines
      : items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          name: item.name,
          slug: item.slug,
          imageUrl: item.imageUrl,
          size: item.size,
          quantity: item.quantity,
          unitPrice: null,
          lineTotal: null,
          available: true,
          stockQuantity: undefined,
        }));

  if (items.length === 0) {
    return (
      <div className="bg-off-white">
        <MarketplacePageBanner
          title="Shopping Cart"
          subtitle="Your cart is empty — browse the shop to get started."
        />
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <Breadcrumb className="mb-6" items={[{ label: 'Home', to: '/' }, { label: 'Cart' }]} />
          <EmptyState
            title="Your cart is empty"
            description="Browse the shop and add charcoal, palm oil, or other Shield Wolf products."
            action={
              <Link
                to="/shop"
                className="inline-flex rounded-md bg-shield-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-fire-red"
              >
                Continue shopping
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-off-white">
      <MarketplacePageBanner
        title="Shopping Cart"
        subtitle={`${itemCount} item${itemCount === 1 ? '' : 's'} · Prices verified by the server`}
      />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <Breadcrumb className="mb-4" items={[{ label: 'Home', to: '/' }, { label: 'Cart' }]} />
        <CheckoutSteps current="cart" />

        <div className="mb-5 flex justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmClear(true)}>
            Clear cart
          </Button>
        </div>

      {quoteError ? (
        <div className="mb-6">
          <ErrorState
            title="Unable to refresh cart totals"
            description="Your items are still saved. Retry to recalculate prices."
            onRetry={() => refetchQuote()}
          />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="overflow-hidden rounded-md border border-border bg-surface">
          {quoteLoading && quoteLines.length === 0 ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : (
            rows.map((line) => {
              const key = `${line.productId}:${line.variantId || 'base'}`;
              return (
                <article
                  key={key}
                  className="flex flex-col gap-3 border-b border-border px-3 py-3 last:border-b-0 sm:flex-row sm:items-center sm:px-4"
                >
                  <div className="size-16 shrink-0 overflow-hidden rounded-md bg-off-white sm:size-20">
                    {line.imageUrl ? (
                      <img src={line.imageUrl} alt="" className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-xs text-muted">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        {line.slug ? (
                          <Link
                            to={`/product/${line.slug}`}
                            className="text-sm font-semibold text-charcoal hover:text-shield-red"
                          >
                            {line.name}
                          </Link>
                        ) : (
                          <p className="text-sm font-semibold text-charcoal">{line.name}</p>
                        )}
                        {line.size ? (
                          <p className="mt-0.5 text-xs text-muted">Size: {line.size}</p>
                        ) : null}
                      </div>
                      <PriceDisplay amount={line.unitPrice} currency={currency} />
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <QuantitySelector
                        value={line.quantity}
                        min={1}
                        max={line.stockQuantity > 0 ? line.stockQuantity : undefined}
                        disabled={!line.available}
                        onChange={(next) =>
                          updateQuantity(line.productId, line.variantId ?? null, next)
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          removeItem(line.productId, line.variantId ?? null);
                          success('Item removed');
                        }}
                      >
                        Remove
                      </Button>
                      {!line.available ? (
                        <Badge variant="danger">Unavailable</Badge>
                      ) : line.adjusted ? (
                        <Badge variant="warning">Qty adjusted</Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="sm:min-w-24 sm:text-right">
                    <p className="text-[10px] uppercase tracking-wide text-muted">Total</p>
                    <p className="text-sm font-semibold text-shield-red">
                      {formatMoney(line.lineTotal, currency)}
                    </p>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <aside className="h-fit rounded-md border border-border bg-surface p-5 lg:sticky lg:top-28">
          <h2 className="font-display text-lg font-semibold text-charcoal">Order summary</h2>
          {quoteLoading && !summary ? (
            <div className="mt-4 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Subtotal</dt>
                <dd className="font-medium text-charcoal">
                  {formatMoney(summary?.subtotal ?? 0, currency)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Discount</dt>
                <dd className="font-medium text-charcoal">
                  {formatMoney(summary?.discountAmount ?? 0, currency)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Delivery</dt>
                <dd className="text-right font-medium text-charcoal">
                  {summary?.deliveryFee == null
                    ? 'At checkout'
                    : formatMoney(summary.deliveryFee, currency)}
                </dd>
              </div>
              {summary?.taxEnabled ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Tax</dt>
                  <dd className="font-medium text-charcoal">
                    {formatMoney(summary?.taxAmount ?? 0, currency)}
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4 border-t border-border pt-3 text-base">
                <dt className="font-semibold text-charcoal">Estimated total</dt>
                <dd className="font-semibold text-charcoal">
                  {formatMoney(summary?.grandTotal ?? 0, currency)}
                </dd>
              </div>
            </dl>
          )}

          <p className="mt-3 text-xs text-muted">
            {summary?.deliveryNote ||
              'Final delivery fee and discounts are confirmed during checkout.'}
          </p>

          <div className="mt-6 space-y-2">
            <Link
              to="/checkout"
              className="inline-flex w-full items-center justify-center rounded-md bg-shield-red px-4 py-2.5 text-sm font-medium text-white hover:bg-fire-red focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shield-red"
            >
              Proceed to checkout
            </Link>
            <Link
              to="/shop"
              className="inline-flex w-full items-center justify-center rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-charcoal hover:bg-off-white"
            >
              Continue shopping
            </Link>
          </div>
        </aside>
      </div>

      <ConfirmationDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Clear cart?"
        confirmLabel="Clear cart"
        variant="danger"
        onConfirm={() => {
          clearCart();
          setConfirmClear(false);
          success('Cart cleared');
        }}
      >
        <p className="text-sm text-muted">
          This removes all items from your cart. You can add products again from the shop.
        </p>
      </ConfirmationDialog>
      </div>
    </div>
  );
}
