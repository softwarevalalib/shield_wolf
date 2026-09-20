import { Link } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { PriceDisplay } from '@/components/products/PriceDisplay';
import { cn } from '@/utils/cn';

/**
 * Marketplace product card — sale badge, compare price, hover cart action.
 */
export function ProductCard({
  name,
  slug,
  imageUrl,
  category,
  size,
  price,
  compareAtPrice,
  currency = 'LRD',
  available = true,
  onAddToCart,
  onQuickView,
  className,
  ...props
}) {
  const href = slug ? `/product/${slug}` : undefined;
  const priceUnavailable = price == null;
  const onSale =
    compareAtPrice != null && price != null && Number(compareAtPrice) > Number(price);
  const discountPct = onSale
    ? Math.round((1 - Number(price) / Number(compareAtPrice)) * 100)
    : null;

  return (
    <article
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-md border border-border bg-surface transition-all duration-300 hover:-translate-y-0.5 hover:shadow-soft',
        className
      )}
      {...props}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-off-white">
        {imageUrl ? (
          href ? (
            <Link to={href} className="block size-full" tabIndex={-1} aria-hidden="true">
              <img
                src={imageUrl}
                alt=""
                loading="lazy"
                decoding="async"
                className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </Link>
          ) : (
            <img
              src={imageUrl}
              alt={name ? `${name} product` : ''}
              loading="lazy"
              decoding="async"
              className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          )
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-muted">
            No image
          </div>
        )}

        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {onSale ? (
            <Badge variant="danger" className="shadow-soft">
              {discountPct}% Off
            </Badge>
          ) : null}
          {!available ? <Badge variant="neutral">Unavailable</Badge> : null}
        </div>

        {onAddToCart ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 p-2 opacity-0 transition-all duration-300 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="w-full shadow-soft"
              disabled={!available || priceUnavailable}
              onClick={onAddToCart}
            >
              Add to cart
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
        {category ? (
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{category}</p>
        ) : null}

        {href ? (
          <Link
            to={href}
            className="line-clamp-2 text-sm font-semibold text-charcoal transition-colors hover:text-shield-red focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shield-red sm:text-base"
          >
            {name}
          </Link>
        ) : (
          <h3 className="line-clamp-2 text-sm font-semibold text-charcoal sm:text-base">{name}</h3>
        )}

        {size ? <p className="text-xs text-muted">{size}</p> : null}

        <div className="mt-auto pt-2">
          {priceUnavailable ? (
            <p className="text-sm text-muted">Price unavailable</p>
          ) : (
            <PriceDisplay
              amount={price}
              compareAt={onSale ? compareAtPrice : undefined}
              currency={currency}
              className="[&>span:first-child]:text-shield-red"
            />
          )}
        </div>

        {onQuickView ? (
          <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={onQuickView}>
            Quick view
          </Button>
        ) : null}
      </div>
    </article>
  );
}
