import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/common/Skeleton';
import { PriceDisplay } from '@/components/products/PriceDisplay';
import { QuantitySelector } from '@/components/products/QuantitySelector';
import { ProductGallery } from '@/components/products/ProductGallery';
import { ProductCard } from '@/components/products/ProductCard';
import { MarketplacePageBanner } from '@/components/layout/MarketplacePageChrome';
import { useProduct } from '@/hooks/useProduct';
import { useCart } from '@/hooks/useCart';
import { useNotification } from '@/contexts/NotificationContext';
import { cn } from '@/utils/cn';

function availabilityLabel(available, stock) {
  if (!available) return { text: 'Out of stock', variant: 'danger' };
  if (stock > 0 && stock <= 5) return { text: `Low stock (${stock})`, variant: 'warning' };
  return { text: 'In stock', variant: 'success' };
}

/**
 * Marketplace product detail — gallery, sticky buy box, tabbed info.
 */
export function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useProduct(slug);
  const { addItem } = useCart();
  const { success, error } = useNotification();

  const product = data?.product;
  const related = data?.related || [];
  const variants = useMemo(() => product?.variants || [], [product]);

  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [tab, setTab] = useState('description');

  useEffect(() => {
    if (!product) return;
    const firstAvailable = variants.find((variant) => variant.available) || variants[0] || null;
    setSelectedVariantId(firstAvailable?.id || null);
    setQuantity(1);
    setTab('description');
  }, [product, variants]);

  const selectedVariant = useMemo(
    () => variants.find((variant) => variant.id === selectedVariantId) || null,
    [variants, selectedVariantId]
  );

  const displayPrice =
    selectedVariant?.price != null ? selectedVariant.price : (product?.price ?? null);
  const displayCompare =
    selectedVariant?.compareAtPrice != null
      ? selectedVariant.compareAtPrice
      : (product?.compareAtPrice ?? null);
  const stock =
    selectedVariant != null ? selectedVariant.stockQuantity : product?.stockQuantity || 0;
  const available =
    selectedVariant != null ? selectedVariant.available : Boolean(product?.available);
  const availability = availabilityLabel(available, stock);
  const maxQty = available ? Math.max(1, stock) : 1;
  const displayName = selectedVariant ? `${product.name} — ${selectedVariant.name}` : product?.name;
  const onSale =
    displayCompare != null && displayPrice != null && Number(displayCompare) > Number(displayPrice);
  const discountPct = onSale
    ? Math.round((1 - Number(displayPrice) / Number(displayCompare)) * 100)
    : null;

  useEffect(() => {
    if (product?.seoTitle) {
      document.title = `${product.seoTitle} · Shield Wolf`;
    } else if (product?.name) {
      document.title = `${product.name} · Shield Wolf`;
    }
    return () => {
      document.title = 'Shield Wolf';
    };
  }, [product]);

  function buildCartItem(qty) {
    return {
      productId: product.id,
      variantId: selectedVariant?.id ?? null,
      quantity: qty,
      name: displayName,
      imageUrl: product.images?.[0]?.url || product.imageUrl,
      size: selectedVariant?.size || product.size,
      slug: product.slug,
    };
  }

  function handleAddToCart() {
    if (!available || displayPrice == null) {
      error('This product is unavailable right now.');
      return;
    }
    addItem(buildCartItem(quantity));
    success('Added to cart');
  }

  function handleBuyNow() {
    if (!available || displayPrice == null) {
      error('This product is unavailable right now.');
      return;
    }
    addItem(buildCartItem(quantity));
    navigate('/checkout');
  }

  async function handleShare() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      success('Link copied');
    } catch {
      error('Unable to share right now');
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-2">
        <Skeleton className="aspect-square w-full" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorState
          title="Unable to load product"
          description="Please try again."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title="Product not found"
          description="This product may be unpublished or the link is incorrect."
          action={
            <Link
              to="/shop"
              className="rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white"
            >
              Back to shop
            </Link>
          }
        />
      </div>
    );
  }

  const tabs = [
    { id: 'description', label: 'Description' },
    { id: 'details', label: 'Details' },
    { id: 'delivery', label: 'Delivery' },
  ];

  return (
    <div className="bg-off-white">
      <MarketplacePageBanner
        title={product.name}
        subtitle={product.shortDescription || product.category || 'Shield Wolf product'}
      />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <Breadcrumb
          className="mb-6"
          items={[
            { label: 'Home', to: '/' },
            { label: 'Shop', to: '/shop' },
            ...(product.categorySlug
              ? [{ label: product.category, to: `/shop/${product.categorySlug}` }]
              : []),
            { label: product.name },
          ]}
        />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <ProductGallery images={product.images} productName={product.name} />

          <div className="rounded-md border border-border bg-surface p-5 sm:p-6 lg:sticky lg:top-28 lg:self-start">
            {product.category ? (
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">
                <Link to={`/shop/${product.categorySlug}`} className="hover:text-shield-red">
                  {product.category}
                </Link>
              </p>
            ) : null}

            <h2 className="font-display text-2xl font-semibold tracking-tight text-charcoal sm:text-3xl">
              {product.name}
            </h2>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <PriceDisplay
                amount={displayPrice}
                currency={product.currency}
                compareAt={onSale ? displayCompare : undefined}
                className="text-xl [&>span:first-child]:text-2xl [&>span:first-child]:text-shield-red"
              />
              {onSale ? <Badge variant="danger">{discountPct}% Off</Badge> : null}
              <Badge variant={availability.variant}>{availability.text}</Badge>
            </div>

            {product.sku || selectedVariant?.sku ? (
              <p className="mt-2 text-sm text-muted">SKU: {selectedVariant?.sku || product.sku}</p>
            ) : null}

            {product.shortDescription ? (
              <p className="mt-4 text-sm leading-relaxed text-muted">{product.shortDescription}</p>
            ) : null}

            {variants.length > 0 ? (
              <fieldset className="mt-5">
                <legend className="mb-2 text-sm font-semibold text-charcoal">Options</legend>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Product variants">
                  {variants.map((variant) => {
                    const selected = variant.id === selectedVariantId;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={!variant.available && variants.some((item) => item.available)}
                        onClick={() => {
                          setSelectedVariantId(variant.id);
                          setQuantity(1);
                        }}
                        className={cn(
                          'rounded-md border px-3 py-2 text-sm transition-colors',
                          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shield-red',
                          selected
                            ? 'border-shield-red bg-shield-red text-white'
                            : 'border-border bg-off-white text-charcoal hover:border-shield-red/40',
                          !variant.available && 'opacity-50'
                        )}
                      >
                        <span className="font-medium">{variant.name}</span>
                        {variant.size ? (
                          <span className="ml-1 text-xs opacity-80">({variant.size})</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ) : product.size ? (
              <p className="mt-4 text-sm text-muted">Size: {product.size}</p>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <QuantitySelector
                value={quantity}
                min={1}
                max={maxQty}
                disabled={!available}
                onChange={setQuantity}
              />
              <Button
                type="button"
                variant="accent"
                disabled={!available || displayPrice == null}
                onClick={handleAddToCart}
              >
                Add to cart
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={!available || displayPrice == null}
                onClick={handleBuyNow}
              >
                Buy now
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap gap-3 border-t border-border pt-4 text-xs text-muted">
              <button type="button" className="hover:text-shield-red" onClick={handleShare}>
                Share
              </button>
              <Link to="/delivery" className="hover:text-shield-red">
                Delivery info
              </Link>
              <Link to="/faq" className="hover:text-shield-red">
                FAQ
              </Link>
            </div>
          </div>
        </div>

        <section className="mt-10 overflow-hidden rounded-md border border-border bg-surface">
          <div className="flex flex-wrap gap-1 border-b border-border bg-off-white px-2 pt-2">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  'rounded-t-md px-4 py-2.5 text-sm font-semibold transition-colors',
                  tab === item.id
                    ? 'bg-surface text-shield-red'
                    : 'text-muted hover:text-charcoal'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="p-5 sm:p-6">
            {tab === 'description' ? (
              product.description ? (
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted">
                  {product.description}
                </p>
              ) : (
                <p className="text-sm text-muted">No description published yet.</p>
              )
            ) : null}
            {tab === 'details' ? (
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-charcoal">Category</dt>
                  <dd className="text-muted">{product.category || '—'}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-charcoal">Size</dt>
                  <dd className="text-muted">{selectedVariant?.size || product.size || '—'}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-charcoal">SKU</dt>
                  <dd className="text-muted">{selectedVariant?.sku || product.sku || '—'}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-charcoal">Brand</dt>
                  <dd className="text-muted">{product.brand || 'Shield Wolf'}</dd>
                </div>
              </dl>
            ) : null}
            {tab === 'delivery' ? (
              <div className="space-y-2 text-sm text-muted">
                <p>Delivery fees are calculated by Monrovia zone at checkout.</p>
                <p>Track your order anytime after purchase from the Track order page.</p>
                <Link to="/delivery" className="inline-flex font-medium text-shield-red hover:underline">
                  View delivery policy →
                </Link>
              </div>
            ) : null}
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-5 flex items-end justify-between gap-3">
            <h2 className="font-display text-2xl font-semibold text-charcoal">Related products</h2>
            <Link to="/shop" className="text-sm font-medium text-shield-red hover:underline">
              View all
            </Link>
          </div>
          {related.length === 0 ? (
            <EmptyState
              title="No related products"
              description="More products in this category will appear here when published."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((item) => (
                <ProductCard
                  key={item.id}
                  name={item.name}
                  slug={item.slug}
                  imageUrl={item.imageUrl}
                  category={item.category}
                  size={item.size}
                  price={item.price}
                  compareAtPrice={item.compareAtPrice}
                  currency={item.currency}
                  available={item.available}
                  onAddToCart={() => {
                    addItem({
                      productId: item.id,
                      name: item.name,
                      imageUrl: item.imageUrl,
                      quantity: 1,
                      size: item.size,
                      slug: item.slug,
                    });
                    success('Added to cart');
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
