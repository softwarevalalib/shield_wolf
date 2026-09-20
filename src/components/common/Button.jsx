import { cn } from '@/utils/cn';

const variants = {
  primary: 'bg-charcoal text-white hover:bg-graphite border-transparent',
  secondary: 'bg-surface text-charcoal border-border hover:bg-off-white',
  accent: 'bg-shield-red text-white hover:bg-fire-red border-transparent',
  ghost: 'bg-transparent text-charcoal border-transparent hover:bg-off-white',
  danger: 'bg-danger text-white hover:bg-danger/90 border-transparent',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  className,
  disabled = false,
  loading = false,
  fullWidth = false,
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md border font-medium transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shield-red',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading ? (
        <span
          className="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
          aria-hidden="true"
        />
      ) : null}
      {children}
    </button>
  );
}
