import { useEffect, useId, useState } from 'react';
import { cn } from '@/utils/cn';
import { IconButton } from '@/components/common/IconButton';

/**
 * Product image gallery with keyboard-accessible zoom dialog.
 */
export function ProductGallery({ images = [], productName = 'Product' }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const titleId = useId();

  const safeImages =
    images.length > 0 ? images : [{ id: 'placeholder', url: null, altText: productName }];

  const active = safeImages[Math.min(activeIndex, safeImages.length - 1)];

  useEffect(() => {
    if (!zoomed) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setZoomed(false);
      if (event.key === 'ArrowRight') {
        setActiveIndex((index) => (index + 1) % safeImages.length);
      }
      if (event.key === 'ArrowLeft') {
        setActiveIndex((index) => (index - 1 + safeImages.length) % safeImages.length);
      }
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [zoomed, safeImages.length]);

  return (
    <div>
      <button
        type="button"
        className="group relative aspect-square w-full overflow-hidden rounded-md bg-off-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shield-red"
        onClick={() => active.url && setZoomed(true)}
        aria-label={active.url ? `Zoom image: ${active.altText || productName}` : productName}
        disabled={!active.url}
      >
        {active.url ? (
          <img
            src={active.url}
            alt={active.altText || productName}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-muted">
            No image available
          </div>
        )}
        {active.url ? (
          <span className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-charcoal/70 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
            Click to zoom
          </span>
        ) : null}
      </button>

      {safeImages.length > 1 ? (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Product images">
          {safeImages.map((image, index) => (
            <li key={image.id || index}>
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`View image ${index + 1}`}
                aria-current={index === activeIndex ? 'true' : undefined}
                className={cn(
                  'size-16 overflow-hidden rounded-md border bg-off-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shield-red',
                  index === activeIndex ? 'border-shield-red' : 'border-border'
                )}
              >
                {image.url ? (
                  <img src={image.url} alt="" className="size-full object-cover" />
                ) : (
                  <span className="flex size-full items-center justify-center text-[10px] text-muted">
                    N/A
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {zoomed && active.url ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-deep-black/90 p-4">
          <button
            type="button"
            className="absolute inset-0 cursor-zoom-out"
            aria-label="Close zoom"
            onClick={() => setZoomed(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 max-h-[90vh] max-w-5xl"
          >
            <p id={titleId} className="sr-only">
              Zoomed product image
            </p>
            <img
              src={active.url}
              alt={active.altText || productName}
              className="max-h-[85vh] w-auto max-w-full object-contain"
            />
            <div className="absolute right-0 top-0 -translate-y-12">
              <IconButton
                label="Close zoom"
                variant="primary"
                onClick={() => setZoomed(false)}
                className="bg-white/10 text-white hover:bg-white/20"
              >
                ✕
              </IconButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
