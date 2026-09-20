import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/common/Skeleton';
import { ProductCard } from '@/components/products/ProductCard';
import { usePublicStorefront } from '@/hooks/usePublicStorefront';
import { useCart } from '@/hooks/useCart';
import bannerImage from '@/assets/brand/banner_1.jpeg';
import productImage from '@/assets/brand/product.jpeg';
import detailImage from '@/assets/brand/detail_1.jpeg';
import lifestyleImage from '@/assets/brand/img.jpeg';

const CATEGORY_FALLBACKS = [productImage, detailImage, bannerImage, lifestyleImage];

const TRUST_ITEMS = [
  { title: 'Quality Products', body: 'Premium charcoal & Divine Red Palm Oil.' },
  { title: 'Reliable Supply', body: 'Consistent stock for homes and cookshops.' },
  { title: 'Fast Delivery', body: 'Monrovia zones with clear fees.' },
  { title: 'Secure Ordering', body: 'Verified MoMo payments & tracking.' },
];

const FEATURE_STRIP = [
  { title: 'Free delivery tips', body: 'Clear Monrovia zone fees' },
  { title: 'Safe MoMo payments', body: 'Verified before dispatch' },
  { title: 'Quality guarantee', body: 'Premium charcoal & oil' },
  { title: 'Order tracking', body: 'Follow every delivery' },
];

/**
 * Marketplace homepage — Marketo-inspired density, Shield Wolf branding.
 */
export function HomePage() {
  const { data, isLoading, isError, refetch, isFetching } = usePublicStorefront();
  const { addItem } = useCart();
  const [productTab, setProductTab] = useState('featured');

  const site = data?.site;
  const business = data?.business;
  const banners = data?.banners || [];
  const categories = data?.categories || [];
  const featuredProducts = data?.featuredProducts || [];
  const testimonials = data?.testimonials || [];

  const headline = site?.hero_headline || 'Premium Quality. Delivered to Your Door.';
  const supporting =
    site?.hero_supporting_text ||
    'Shop Shield Wolf charcoal, Divine Red Palm Oil, and trusted essentials with reliable delivery.';

  const sidePromos =
    banners.length >= 2
      ? banners.slice(0, 2).map((banner, index) => ({
          ...banner,
          eyebrow: index === 0 ? 'Save today' : 'New arrivals',
        }))
      : [
          {
            title: 'Stock up on charcoal',
            eyebrow: 'Up to 12% Off',
            imageUrl: productImage,
            link: '/shop/charcoal',
          },
          {
            title: 'Divine Red Palm Oil',
            eyebrow: 'Best prices',
            imageUrl: detailImage,
            link: '/shop/red-palm-oil',
          },
        ];

  const hotProducts = featuredProducts.slice(0, 4);
  const tabProducts =
    productTab === 'trending' ? [...featuredProducts].reverse() : featuredProducts;
  const charcoalProducts = featuredProducts.filter((p) =>
    (p.categorySlug || '').includes('charcoal')
  );
  const palmProducts = featuredProducts.filter((p) =>
    (p.categorySlug || '').includes('palm')
  );

  function handleAdd(product) {
    addItem({
      productId: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      quantity: 1,
      size: product.size,
      slug: product.slug,
    });
  }

  return (
    <div className="bg-off-white">
      {/* Hero + side promos */}
      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
        <div className="grid gap-3 lg:grid-cols-12 lg:gap-4">
          <div className="relative min-h-[280px] overflow-hidden rounded-md bg-deep-black text-white sm:min-h-[360px] lg:col-span-8 lg:min-h-[420px]">
            <img
              src={site?.hero_image_url || bannerImage}
              alt=""
              className="absolute inset-0 size-full object-cover opacity-70"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-deep-black/90 via-deep-black/55 to-transparent" />
            <div className="relative flex h-full flex-col justify-end p-6 sm:p-8 lg:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-gold">
                Shield Wolf
              </p>
              <h1 className="mt-2 max-w-lg font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                {headline}
              </h1>
              <p className="mt-3 max-w-md text-sm text-white/85 sm:text-base">{supporting}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link
                  to="/shop"
                  className="inline-flex rounded-md bg-shield-red px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-fire-red"
                >
                  View collection
                </Link>
                <Link
                  to="/shop"
                  className="inline-flex rounded-md border border-white/40 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                >
                  Categories
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-1 lg:gap-4">
            {sidePromos.map((promo) => (
              <Link
                key={`${promo.title}-${promo.link}`}
                to={promo.link || '/shop'}
                className="group relative min-h-[140px] overflow-hidden rounded-md bg-graphite text-white lg:min-h-0 lg:flex-1"
              >
                <img
                  src={promo.imageUrl || lifestyleImage}
                  alt=""
                  className="absolute inset-0 size-full object-cover opacity-50 transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-deep-black/80 to-transparent" />
                <div className="relative flex h-full flex-col justify-end p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-brand-gold">
                    {promo.eyebrow || 'Special offer'}
                  </p>
                  <p className="mt-1 font-display text-lg font-semibold leading-snug">
                    {promo.title}
                  </p>
                  <span className="mt-2 text-xs font-semibold text-white/90 underline-offset-2 group-hover:underline">
                    Go shop →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Marketo-style feature strip */}
      <section className="border-y border-border bg-surface">
        <ul className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {FEATURE_STRIP.map((item) => (
            <li key={item.title} className="flex items-start gap-3">
              <span
                className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-shield-red/10 text-shield-red"
                aria-hidden="true"
              >
                ★
              </span>
              <div>
                <p className="text-sm font-semibold text-charcoal">{item.title}</p>
                <p className="text-xs text-muted">{item.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Top categories */}
      <section className="border-y border-border bg-surface py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-5 flex items-end justify-between gap-3">
            <h2 className="font-display text-xl font-semibold text-charcoal sm:text-2xl">
              Top Categories This Week
            </h2>
            <Link to="/shop" className="text-sm font-medium text-shield-red hover:underline">
              View all
            </Link>
          </div>
          {isLoading ? (
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="size-24 shrink-0 rounded-full" />
              ))}
            </div>
          ) : isError ? (
            <ErrorState title="Unable to load categories" onRetry={() => refetch()} />
          ) : categories.length === 0 ? (
            <EmptyState title="Categories coming soon" />
          ) : (
            <ul className="flex gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-6">
              {categories.map((category, index) => (
                <li key={category.id} className="shrink-0 sm:shrink">
                  <Link
                    to={`/shop/${category.slug}`}
                    className="group flex w-24 flex-col items-center gap-2 text-center sm:w-auto"
                  >
                    <span className="relative size-20 overflow-hidden rounded-full border border-border bg-off-white shadow-soft transition-transform duration-300 group-hover:-translate-y-0.5 sm:size-24">
                      <img
                        src={
                          category.image_url ||
                          CATEGORY_FALLBACKS[index % CATEGORY_FALLBACKS.length]
                        }
                        alt=""
                        className="size-full object-cover"
                      />
                    </span>
                    <span className="text-sm font-semibold text-charcoal group-hover:text-shield-red">
                      {category.name}
                    </span>
                  </Link>
                </li>
              ))}
              <li className="hidden lg:block">
                <Link
                  to="/shop"
                  className="group flex flex-col items-center gap-2 text-center"
                >
                  <span className="flex size-24 items-center justify-center rounded-full border border-dashed border-border bg-off-white text-sm font-semibold text-muted transition-colors group-hover:border-shield-red group-hover:text-shield-red">
                    All
                  </span>
                  <span className="text-sm font-semibold text-charcoal">Browse shop</span>
                </Link>
              </li>
            </ul>
          )}
        </div>
      </section>

      {/* Hot sale strip */}
      {hotProducts.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-shield-red">Hot sale</p>
              <h2 className="font-display text-2xl font-semibold text-charcoal">Featured deals</h2>
            </div>
            <Link to="/shop" className="text-sm font-medium text-shield-red hover:underline">
              Shop all deals
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {hotProducts.map((product) => (
              <ProductCard
                key={product.id}
                name={product.name}
                slug={product.slug}
                imageUrl={product.imageUrl}
                category={product.category}
                size={product.size}
                price={product.price}
                compareAtPrice={product.compareAtPrice}
                currency={product.currency}
                available={product.available}
                onAddToCart={() => handleAdd(product)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Mid promo banners */}
      {(banners.length ? banners : sidePromos).length > 0 ? (
        <section className="bg-surface py-6">
          <div className="mx-auto grid max-w-7xl gap-3 px-4 sm:grid-cols-3 sm:px-6">
            {(banners.length ? banners : sidePromos).slice(0, 3).map((banner, index) => (
              <Link
                key={`${banner.title}-${index}`}
                to={banner.link || '/shop'}
                className="group relative min-h-36 overflow-hidden rounded-md"
              >
                <img
                  src={banner.imageUrl || CATEGORY_FALLBACKS[index % CATEGORY_FALLBACKS.length]}
                  alt=""
                  className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-deep-black/45" />
                <div className="relative flex h-full flex-col justify-end p-4 text-white">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-brand-gold">
                    Collection
                  </p>
                  <p className="font-display text-lg font-semibold">{banner.title}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Tabbed products */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-3">
          <div className="flex flex-wrap gap-1">
            {[
              { id: 'featured', label: 'Featured Products' },
              { id: 'trending', label: 'Trending Products' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setProductTab(tab.id)}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                  productTab === tab.id
                    ? 'bg-shield-red text-white'
                    : 'text-muted hover:bg-off-white hover:text-charcoal'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <Link to="/shop" className="text-sm font-medium text-shield-red hover:underline">
            View all
          </Link>
        </div>

        {isLoading || isFetching ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-72" />
            ))}
          </div>
        ) : tabProducts.length === 0 ? (
          <EmptyState
            title="No featured products yet"
            description="Published featured products will appear here."
            action={
              <Link
                to="/shop"
                className="inline-flex rounded-md bg-shield-red px-4 py-2 text-sm font-medium text-white hover:bg-fire-red"
              >
                Browse shop
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {tabProducts.map((product) => (
              <ProductCard
                key={`${productTab}-${product.id}`}
                name={product.name}
                slug={product.slug}
                imageUrl={product.imageUrl}
                category={product.category}
                size={product.size}
                price={product.price}
                compareAtPrice={product.compareAtPrice}
                currency={product.currency}
                available={product.available}
                onAddToCart={() => handleAdd(product)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Department rows — Marketo category product bands */}
      {[
        { title: 'Charcoal', href: '/shop/charcoal', products: charcoalProducts },
        { title: 'Red Palm Oil', href: '/shop/red-palm-oil', products: palmProducts },
      ]
        .filter((section) => section.products.length > 0)
        .map((section) => (
          <section key={section.title} className="border-t border-border bg-surface py-10">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <h2 className="font-display text-2xl font-semibold text-charcoal">{section.title}</h2>
                <Link to={section.href} className="text-sm font-medium text-shield-red hover:underline">
                  View collection
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {section.products.slice(0, 4).map((product) => (
                  <ProductCard
                    key={`${section.title}-${product.id}`}
                    name={product.name}
                    slug={product.slug}
                    imageUrl={product.imageUrl}
                    category={product.category}
                    size={product.size}
                    price={product.price}
                    compareAtPrice={product.compareAtPrice}
                    currency={product.currency}
                    available={product.available}
                    onAddToCart={() => handleAdd(product)}
                  />
                ))}
              </div>
            </div>
          </section>
        ))}

      {/* Trust row */}
      <section className="border-y border-border bg-surface py-8">
        <ul className="mx-auto grid max-w-7xl gap-6 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {TRUST_ITEMS.map((item) => (
            <li key={item.title} className="border-l-2 border-brand-gold pl-3">
              <h3 className="font-display text-base font-semibold text-charcoal">{item.title}</h3>
              <p className="mt-1 text-sm text-muted">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Delivery CTA band */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="overflow-hidden rounded-md bg-charcoal text-white">
          <div className="grid lg:grid-cols-2">
            <div className="relative min-h-48">
              <img src={detailImage} alt="" className="absolute inset-0 size-full object-cover opacity-40" />
            </div>
            <div className="flex flex-col justify-center p-6 sm:p-8">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-gold">Delivery</p>
              <h2 className="mt-2 font-display text-2xl font-semibold">
                Got questions? Call us
              </h2>
              <p className="mt-2 text-2xl font-semibold text-white">
                {business?.phones?.[0] || '+231 778 450 169'}
              </p>
              <p className="mt-2 text-sm text-white/75">
                {[business?.address?.line, business?.address?.city, business?.address?.country]
                  .filter(Boolean)
                  .join(', ') || 'Gardnersville / Japanese Freeway, Monrovia, Liberia'}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  to="/track-order"
                  className="inline-flex rounded-md bg-shield-red px-4 py-2 text-sm font-semibold text-white hover:bg-fire-red"
                >
                  Track order
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex rounded-md border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Contact
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-t border-border bg-surface px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-display text-2xl font-semibold text-charcoal">Customer love</h2>
          <p className="mt-1 text-sm text-muted">Stories from Shield Wolf customers.</p>
          {testimonials.length === 0 ? (
            <div className="mt-6">
              <EmptyState title="No testimonials yet" />
            </div>
          ) : (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.slice(0, 6).map((item) => (
                <li
                  key={item.id}
                  className="rounded-md border border-border bg-off-white p-5 transition-shadow hover:shadow-soft"
                >
                  {item.rating ? (
                    <p className="text-sm text-brand-gold" aria-label={`Rated ${item.rating} of 5`}>
                      {'★'.repeat(Math.max(0, Math.min(5, Number(item.rating) || 0)))}
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm leading-relaxed text-charcoal">
                    &ldquo;{item.body}&rdquo;
                  </p>
                  <p className="mt-3 text-sm font-semibold text-charcoal/80">{item.customer_name}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
