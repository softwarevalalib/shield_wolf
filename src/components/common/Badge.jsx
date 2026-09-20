import { cn } from '@/utils/cn';

const variants = {
  neutral: 'bg-off-white text-charcoal border-border',
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  danger: 'bg-danger/10 text-danger border-danger/20',
  info: 'bg-info/10 text-info border-info/20',
  accent: 'bg-shield-red/10 text-shield-red border-shield-red/20',
};

export function Badge({ children, variant = 'neutral', className, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
        variants[variant] || variants.neutral,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
