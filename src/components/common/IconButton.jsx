import { cn } from '@/utils/cn';

export function IconButton({
  label,
  children,
  className,
  size = 'md',
  variant = 'ghost',
  disabled = false,
  loading = false,
  type = 'button',
  ...props
}) {
  const sizeClass =
    size === 'sm' ? 'size-8 text-sm' : size === 'lg' ? 'size-11 text-base' : 'size-10 text-sm';

  const variantClass =
    variant === 'primary'
      ? 'bg-charcoal text-white hover:bg-graphite'
      : variant === 'accent'
        ? 'bg-shield-red text-white hover:bg-fire-red'
        : 'bg-transparent text-charcoal hover:bg-off-white';

  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-md transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shield-red',
        'disabled:cursor-not-allowed disabled:opacity-50',
        sizeClass,
        variantClass,
        className
      )}
      {...props}
    >
      {loading ? (
        <span
          className="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
          aria-hidden="true"
        />
      ) : (
        children
      )}
    </button>
  );
}
